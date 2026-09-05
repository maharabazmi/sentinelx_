import re
import time
import math
import logging
from typing import List, Optional
from ..models import User, CrimeReport, utcnow_iso
from .notification_service import NotificationService

logger = logging.getLogger("sentinelx.jurisdiction")

KNOWN_STATION_COORDINATES = {
    "uttara": (23.8759, 90.3800),
    "gulshan": (23.7925, 90.4150),
    "banani": (23.7937, 90.4043),
    "dhanmondi": (23.7465, 90.3760),
    "mirpur": (23.8071, 90.3686),
    "mohammadpur": (23.7538, 90.3620),
    "tejgaon": (23.7685, 90.3950),
    "motijheel": (23.7314, 90.4180),
    "ramna": (23.7390, 90.4020),
    "badda": (23.7808, 90.4267),
    "khilgaon": (23.7500, 90.4250),
    "paltan": (23.7330, 90.4130),
    "kotwali": (22.3350, 91.8320),
    "agrabad": (22.3275, 91.8100),
    "panchlaish": (22.3590, 91.8215),
    "sadar": (24.8949, 91.8687),
}

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def extract_thana_keyword(station_or_thana: str) -> str:
    if not station_or_thana:
        return ""
    first_part = station_or_thana.split(",")[0].strip()
    cleaned = re.sub(
        r"(?i)\s*(police\s*station|model\s*thana|thana|upazila|ps|outpost|phari|investigation\s*centre|division|district)\b",
        "",
        first_part
    ).strip()
    return cleaned or first_part

def is_officer_in_jurisdiction(officer_station: str, report_thana: str, report_district: str = None) -> bool:
    if not officer_station or not report_thana:
        return False
    
    st_clean = officer_station.lower()
    th_clean = report_thana.strip().lower()
    thana_kw = extract_thana_keyword(officer_station).lower()

    if thana_kw and (thana_kw == th_clean or thana_kw in th_clean or th_clean in thana_kw):
        return True

    if th_clean in st_clean or st_clean in th_clean:
        return True

    return False

class JurisdictionService:
    @staticmethod
    def find_officers_for_jurisdiction(db, thana: str, district: str = None) -> List[User]:
        police_officers = db.query(User).filter(User.role == "POLICE").all()
        return [
            o for o in police_officers
            if is_officer_in_jurisdiction(o.stationOrThana, thana, district)
        ]

    @classmethod
    def assign_report_to_jurisdiction_officer(cls, db, report: CrimeReport, notify: bool = True) -> Optional[User]:
        officers = cls.find_officers_for_jurisdiction(db, report.thana, report.district)
        if not officers:
            logger.info(f"[Jurisdiction] No officer stationed yet for thana '{report.thana}' ({report.district}).")
            return None

        # Pick officer with fewest active assigned cases (load balancing)
        best_officer = min(
            officers,
            key=lambda o: db.query(CrimeReport).filter(
                CrimeReport.assignedOfficerId == o.id,
                CrimeReport.status.notin_(["CASE_CLOSED", "REJECTED"])
            ).count()
        )

        now_iso = utcnow_iso()
        report.assignedOfficerId = best_officer.id
        report.assignedOfficerName = best_officer.fullName
        report.assignedOfficerBadge = best_officer.badgeNumber or "DMP-"
        report.assignedOfficerStation = best_officer.stationOrThana

        if report.status in ("SUBMITTED", None):
            report.status = "OFFICER_ASSIGNED"

        updates = list(report.investigationUpdates or [])
        updates.append({
            "id": f"inv-{int(time.time() * 1000)}",
            "timestamp": now_iso,
            "officerName": f"Station Command ({best_officer.fullName})",
            "status": "OFFICER_ASSIGNED",
            "note": f"Report automatically routed & assigned to Investigating Officer {best_officer.fullName} ({best_officer.badgeNumber or 'Officer'}) at {best_officer.stationOrThana} for jurisdiction review."
        })
        report.investigationUpdates = updates

        logger.info(
            f"[Jurisdiction] Assigned case {report.caseId} ({report.thana}) to officer {best_officer.fullName} ({best_officer.id})."
        )

        if notify:
            try:
                NotificationService.create_case_notification(
                    user_id=best_officer.id,
                    title=f"New Case Assigned: {report.caseId}",
                    message=f"Case '{report.title}' in {report.thana}, {report.district} has been assigned to you for investigation.",
                    related_id=report.id
                )
            except Exception as e:
                logger.warning(f"[Jurisdiction] Failed to send notification to officer {best_officer.id}: {e}")

        return best_officer

    @classmethod
    def auto_assign_pending_reports_for_officer(cls, db, officer: User) -> int:
        if officer.role != "POLICE" or not officer.stationOrThana:
            return 0

        unassigned_reports = db.query(CrimeReport).filter(
            (CrimeReport.assignedOfficerId == None) |
            (CrimeReport.assignedOfficerId == "") |
            (CrimeReport.assignedOfficerName == None) |
            (CrimeReport.assignedOfficerName == "")
        ).all()

        matching_reports = [
            r for r in unassigned_reports
            if is_officer_in_jurisdiction(officer.stationOrThana, r.thana, r.district)
            and r.status not in ("CASE_CLOSED", "REJECTED")
        ]

        count = 0
        for report in matching_reports:
            cls.assign_report_to_jurisdiction_officer(db, report, notify=True)
            count += 1

        if count > 0:
            db.commit()
            logger.info(f"[Jurisdiction] Auto-assigned {count} pending report(s) to officer {officer.fullName}.")

        return count

    @classmethod
    def auto_sync_all_unassigned_reports(cls, db) -> int:
        unassigned_reports = db.query(CrimeReport).filter(
            (CrimeReport.assignedOfficerId == None) |
            (CrimeReport.assignedOfficerId == "") |
            (CrimeReport.assignedOfficerName == None) |
            (CrimeReport.assignedOfficerName == "")
        ).all()

        count = 0
        for report in unassigned_reports:
            if report.status in ("CASE_CLOSED", "REJECTED"):
                continue
            officer = cls.assign_report_to_jurisdiction_officer(db, report, notify=False)
            if officer:
                count += 1

        if count > 0:
            db.commit()
            logger.info(f"[Jurisdiction] Global sync assigned {count} orphan report(s) to their respective thana officers.")

        return count

    @classmethod
    def get_station_center_coordinates(cls, station_or_thana: str) -> Optional[tuple]:
        if not station_or_thana:
            return None
        kw = extract_thana_keyword(station_or_thana).lower()
        parts = [p.strip() for p in re.split(r"[/,]", kw) if p.strip()]
        for p in parts:
            for k, coords in KNOWN_STATION_COORDINATES.items():
                if k in p or p in k:
                    return coords
        return None

    @classmethod
    def find_officers_for_station(cls, db, station_or_thana: str) -> List[User]:
        if not station_or_thana:
            return []
        st_kw = extract_thana_keyword(station_or_thana).lower()
        officers = db.query(User).filter(User.role == "POLICE").all()
        matching = []
        for o in officers:
            if not o.stationOrThana:
                continue
            o_kw = extract_thana_keyword(o.stationOrThana).lower()
            if st_kw in o_kw or o_kw in st_kw or o.stationOrThana.strip().lower() == station_or_thana.strip().lower():
                matching.append(o)
        return matching

    @classmethod
    def determine_sos_station(cls, db, location_name: str, latitude: float, longitude: float, citizen_station: str = None) -> str:
        """
        Determines the single responsible police station covering an SOS broadcast.
        1. Explicit text match of station/thana in location_name.
        2. Known Thana geographic center proximity to location_name.
        3. Nearest registered police station by GPS coordinates.
        4. Citizen's registered home Thana/Station.
        """
        police_officers = db.query(User).filter(User.role == "POLICE").all()
        registered_stations = list(dict.fromkeys(
            o.stationOrThana.strip() for o in police_officers if o.stationOrThana and o.stationOrThana.strip()
        ))

        if not registered_stations:
            return citizen_station or "Central Command HQ, Dhaka"

        loc_clean = (location_name or "").lower()

        # 1. Match against registered stations in DB via text keyword
        for st in registered_stations:
            kw = extract_thana_keyword(st).lower()
            parts = [p.strip() for p in re.split(r"[/,]", kw) if p.strip()]
            for part in parts:
                if part and len(part) >= 3 and part in loc_clean:
                    return st

        # 2. Check if location_name mentions any known Bangladesh thana (e.g., 'dhanmondi', 'mirpur', 'uttara')
        for thana_key, thana_coords in KNOWN_STATION_COORDINATES.items():
            if thana_key in loc_clean:
                # Check if any registered station matches this thana
                for st in registered_stations:
                    if thana_key in st.lower():
                        return st
                # If no officer currently registered for this thana, assign to that thana's station
                return f"{thana_key.capitalize()} Police Station, Dhaka"

        # 3. GPS Proximity matching to registered police stations
        if latitude and longitude and (abs(latitude) > 0.01 or abs(longitude) > 0.01):
            station_distances = []
            for st in registered_stations:
                coords = cls.get_station_center_coordinates(st)
                if coords:
                    dist = haversine_distance_km(latitude, longitude, coords[0], coords[1])
                    station_distances.append((dist, st))
            if station_distances:
                station_distances.sort(key=lambda x: x[0])
                return station_distances[0][1]

        # 4. Fallback to citizen's home station if registered
        if citizen_station:
            cit_kw = extract_thana_keyword(citizen_station).lower()
            for st in registered_stations:
                st_kw = extract_thana_keyword(st).lower()
                if cit_kw in st_kw or st_kw in cit_kw:
                    return st

        return registered_stations[0]

    @classmethod
    def is_sos_in_police_jurisdiction(cls, officer_station: str, sos, db=None) -> bool:
        """
        Determines whether a given SOS request falls under a police officer's station coverage area.
        Only the single station covering the SOS will return True.
        """
        if not officer_station:
            return False

        off_clean = officer_station.lower()
        # Central Command HQ / Admin oversight sees all
        if "central command" in off_clean or "headquarters" in off_clean or "hq" in off_clean:
            return True

        off_kw = extract_thana_keyword(officer_station).lower()
        off_parts = [p.strip() for p in re.split(r"[/,]", off_kw) if p.strip()]

        # If assignedStation was explicitly recorded on the SOS record
        assigned_st = getattr(sos, "assignedStation", None)
        if assigned_st:
            assigned_kw = extract_thana_keyword(assigned_st).lower()
            assigned_parts = [p.strip() for p in re.split(r"[/,]", assigned_kw) if p.strip()]
            for op in off_parts:
                for ap in assigned_parts:
                    if op and ap and (op in ap or ap in op):
                        return True
            if assigned_st.strip().lower() == officer_station.strip().lower():
                return True
            return False

        # If assignedStation is not explicitly set, determine it dynamically
        if db:
            covering_station = cls.determine_sos_station(
                db,
                location_name=getattr(sos, "locationName", ""),
                latitude=getattr(sos, "latitude", 0),
                longitude=getattr(sos, "longitude", 0)
            )
            cov_kw = extract_thana_keyword(covering_station).lower()
            cov_parts = [p.strip() for p in re.split(r"[/,]", cov_kw) if p.strip()]
            for op in off_parts:
                for cp in cov_parts:
                    if op and cp and (op in cp or cp in op):
                        return True
            return False

        # Direct text match on location name
        loc_name = (getattr(sos, "locationName", "") or "").lower()
        for op in off_parts:
            if op and len(op) >= 3 and op in loc_name:
                return True

        return False
