import re
import time
import logging
from typing import List, Optional
from ..models import User, CrimeReport, utcnow_iso
from .notification_service import NotificationService

logger = logging.getLogger("sentinelx.jurisdiction")

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
