import re
import time
import math
import uuid
import random
import logging
from typing import List, Optional, Tuple
from ..models import User, CrimeReport, utcnow_iso
from ..data.bangladesh_geo_data import ALL_64_DISTRICTS, ALL_THANAS
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

DUTY_OFFICER_NAMES = [
    "SI Tanvir Ahmed",
    "SI Mahbubur Rahman",
    "SI Masud Rana",
    "SI Faruq Hossain",
    "SI Shahadat Hossain",
    "SI Zahirul Islam"
]

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

def _thana_names(station_or_thana: str) -> set[str]:
    """Return normalized Thana names represented by a station posting."""
    if not station_or_thana:
        return set()
    return {
        extract_thana_keyword(part).strip().casefold()
        for part in re.split(r"[/|]", station_or_thana.split(",")[0])
        if extract_thana_keyword(part).strip()
    }

def is_same_thana(officer_station: str, report_thana: str) -> bool:
    return bool(_thana_names(officer_station).intersection(_thana_names(report_thana)))

def is_officer_in_jurisdiction(officer_station: str, report_thana: str, report_district: str = None) -> bool:
    if not officer_station or not report_thana:
        return False
    
    st_clean = officer_station.lower()
    th_clean = report_thana.strip().lower()
    thana_kw = extract_thana_keyword(officer_station).lower()

    if is_same_thana(officer_station, report_thana):
        return True

    if th_clean in st_clean or st_clean in th_clean:
        return True

    if report_district:
        dist_clean = report_district.strip().lower()
        if dist_clean in st_clean and ("sadar" in st_clean or "kotwali" in st_clean or "hq" in st_clean or "reserve" in st_clean):
            return True

    return False

def format_officer_credentials(officer: User, report_district: str = "Dhaka") -> Tuple[str, str]:
    """
    Ensures the officer has a realistic, formal police title and valid jurisdiction badge.
    """
    raw_name = (officer.fullName or "Officer").strip()
    designation = (officer.designation or "Sub-Inspector").strip()
    
    # Prepend designation if not already in name
    known_titles = ["si ", "inspector", "asi ", "oc ", "constable", "asp ", "officer-in-charge"]
    if not any(raw_name.lower().startswith(t) for t in known_titles):
        formal_title = f"{designation} {raw_name}"
    else:
        formal_title = raw_name

    # Normalize badge number with proper district prefix
    dist_code = re.sub(r"[^A-Za-z]", "", report_district or "DMP")[:3].upper()
    badge = (officer.badgeNumber or "").strip()
    if not badge or badge in ("DMP-", "CMP-", "BP-", "MYM-"):
        short_num = re.sub(r"[^0-9]", "", officer.id)[-4:] if re.sub(r"[^0-9]", "", officer.id) else str(random.randint(1000, 9999))
        badge = f"BP-{dist_code}-{short_num}"

    return formal_title, badge

def calculate_officer_suitability(officer: User, report: CrimeReport, active_cases: int) -> Tuple[float, List[str]]:
    """
    Computes a rational suitability score and explainable audit rationale.
    Factors:
    1. Statutory Rank vs Crime Severity Alignment
    2. Crime Category vs Department Specialization
    3. Workload Capacity Balancing
    4. Geographic Proximity
    """
    score = 100.0
    rationale: List[str] = []

    designation = (officer.designation or "").lower()
    department = (officer.department or "").lower()
    full_name = (officer.fullName or "").lower()
    severity = (report.severity or "MEDIUM").upper()
    crime_type = (report.crimeType or "OTHER").upper()

    # 1. Statutory Rank vs Crime Severity Alignment
    is_senior = any(r in designation or r in full_name for r in ["inspector", "oc", "officer-in-charge", "superintendent", "asp", "commissioner"])
    is_si = any(r in designation or r in full_name for r in ["sub-inspector", "si", "investigating officer"]) and not is_senior
    is_asi = any(r in designation or r in full_name for r in ["assistant sub-inspector", "asi", "constable"])

    if severity in ("CRITICAL", "HIGH"):
        if is_senior:
            score += 45
            rationale.append(f"Senior Command Rank ({officer.designation or 'Inspector'}) assigned for High/Critical severity incident")
        elif is_si:
            score += 25
            rationale.append("Sub-Inspector authorized as primary Investigating Officer for serious crime")
        else:
            score -= 15
    elif severity == "MEDIUM":
        if is_si:
            score += 40
            rationale.append("Sub-Inspector matched as primary Investigating Officer for Medium severity offense")
        elif is_senior:
            score += 25
            rationale.append(f"Senior Inspector ({officer.designation or 'Inspector'}) assigned for case supervision")
        elif is_asi:
            score += 15
            rationale.append("Assistant Sub-Inspector assigned to assist inquiry")
    else:  # LOW / ROUTINE
        if is_asi or is_si:
            score += 40
            rationale.append("Field Officer (ASI/SI) matched for Routine/Low severity inquiry")
        elif is_senior:
            score += 10
            rationale.append("Supervisory officer assignment")

    # 2. Crime Domain vs Department Specialization
    cyber_crimes = ["CYBER", "ONLINE", "FRAUD", "SCAM", "FINANCIAL", "HACK", "HARASSMENT_ONLINE"]
    women_child_crimes = ["DOMESTIC", "WOMEN", "CHILD", "EVE_TEASING", "STALKING", "RAPE", "ABUSE"]
    violent_crimes = ["ROBBERY", "ARMED", "MURDER", "HOMICIDE", "ASSAULT", "KIDNAPPING", "EXTORTION", "NARCOTICS", "DRUG"]
    general_crimes = ["THEFT", "BURGLARY", "VANDALISM", "NUISANCE", "LOST", "DISPUTE"]

    if any(k in crime_type for k in cyber_crimes):
        if any(d in department for d in ["cyber", "digital", "cid", "it", "fraud", "forensics"]):
            score += 40
            rationale.append("Specialized in Cyber Crime & Digital Forensics Cell")
    elif any(k in crime_type for k in women_child_crimes):
        if any(d in department for d in ["women", "child", "welfare", "victim", "help desk"]):
            score += 40
            rationale.append("Specialized in Women & Children Support Desk")
    elif any(k in crime_type for k in violent_crimes):
        if any(d in department for d in ["detective", "db", "crime", "violent", "operations"]):
            score += 40
            rationale.append("Specialized in Detective Branch / Violent Crimes Division")
    elif any(k in crime_type for k in general_crimes):
        if any(d in department for d in ["general", "investigation", "inquiry", "patrol", "crime"]):
            score += 30
            rationale.append("Specialized in General Thana Inquiries & Property Crimes")

    # 3. Workload Capacity Balancing (-10 per active case)
    caseload_penalty = active_cases * 10.0
    score -= caseload_penalty
    if active_cases == 0:
        rationale.append("Optimal caseload capacity (0 active cases)")
    else:
        rationale.append(f"Workload capacity factor ({active_cases} active case(s) currently open)")

    # 4. Proximity Match
    thana_clean = (report.thana or "").strip().lower()
    officer_station = (officer.stationOrThana or "").lower()
    if thana_clean and thana_clean in officer_station:
        score += 25
        rationale.append("Direct Thana jurisdiction posting")
    else:
        score += 10
        rationale.append("District Police Reserve deployment")

    return score, rationale

class JurisdictionService:
    @staticmethod
    def find_officers_for_jurisdiction(db, thana: str, district: str = None) -> List[User]:
        police_officers = db.query(User).filter(User.role == "POLICE").all()
        # Direct thana match
        matched = [
            o for o in police_officers
            if is_officer_in_jurisdiction(o.stationOrThana, thana, district)
        ]
        if matched:
            return matched

        # District-level fallback if thana has no direct officer
        if district:
            dist_matched = [
                o for o in police_officers
                if district.strip().lower() in (o.stationOrThana or "").lower()
            ]
            if dist_matched:
                return dist_matched

        return []

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
        report_thana_names = _thana_names(station_or_thana)
        if not report_thana_names:
            return []
        officers = db.query(User).filter(User.role == "POLICE").all()
        return [
            officer
            for officer in officers
            if report_thana_names.intersection(_thana_names(officer.stationOrThana))
        ]

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
        loc_name = (getattr(sos, "locationName", "") or "").lower()

        # Strict Location Thana Matching:
        # If the emergency beacon location explicitly mentions a known thana (e.g., 'dhanmondi'),
        # ONLY officers of that specific thana are in jurisdiction.
        for thana_key in KNOWN_STATION_COORDINATES:
            if thana_key in loc_name:
                officer_has_thana = any(thana_key in op for op in off_parts) or (thana_key in off_clean)
                return officer_has_thana

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


BANGLADESH_DISTRICTS = [
    "dhaka", "chattogram", "chittagong", "sylhet", "rajshahi", "khulna",
    "barishal", "barisal", "rangpur", "mymensingh", "cumilla", "comilla",
    "gazipur", "narayanganj", "bogura", "bogra", "cox's bazar", "jashore",
    "jessore", "feni", "brahmanbaria", "tangail", "dinajpur", "kushtia"
]

def normalize_consumer_district(value: str) -> str:
    """Canonicalize common Bangladesh district spellings and labels for queue routing."""
    normalized = re.sub(r"[^a-z0-9]+", " ", (value or "").casefold()).strip()
    normalized = re.sub(r"\b(district|dist|zilla|zila|division|of)\b", " ", normalized)
    normalized = " ".join(normalized.split())
    aliases = {
        "chittagong": "chattogram", "comilla": "cumilla", "barisal": "barishal",
        "bogra": "bogura", "jessore": "jashore", "coxs bazar": "cox s bazar",
    }
    return aliases.get(normalized, normalized)


def get_consumer_officer_district(officer: User) -> str:
    """Use the officer's explicit district, with a district parsed from their office as a legacy fallback."""
    assigned = normalize_consumer_district(officer.assignedDistrict or "")
    if assigned:
        return assigned
    station = re.sub(r"[^a-z0-9]+", " ", (officer.stationOrThana or "").casefold()).strip()
    district_names = sorted(ALL_64_DISTRICTS, key=len, reverse=True)
    for district in district_names:
        key = re.sub(r"[^a-z0-9]+", " ", district.casefold()).strip()
        if re.search(rf"\b{re.escape(key)}\b", station):
            return normalize_consumer_district(district)

    # Older DNCRP accounts sometimes stored only a Thana/office name. Resolve that
    # location to its nearest district centre as a one-time-compatible fallback.
    thana_names = sorted(ALL_THANAS, key=len, reverse=True)
    for thana in thana_names:
        key = re.sub(r"[^a-z0-9]+", " ", thana.casefold()).strip()
        if re.search(rf"\b{re.escape(key)}\b", station):
            thana_lat, thana_lng = ALL_THANAS[thana]
            nearest_district = min(
                ALL_64_DISTRICTS.items(),
                key=lambda entry: (entry[1][0] - thana_lat) ** 2 + (entry[1][1] - thana_lng) ** 2,
            )[0]
            return normalize_consumer_district(nearest_district)
    return ""


def is_consumer_district_match(district_a: str, district_b: str) -> bool:
    a = normalize_consumer_district(district_a)
    b = normalize_consumer_district(district_b)
    return bool(a and b and a == b)


def parse_consumer_jurisdiction(station_or_thana: str) -> Tuple[str, str]:
    """
    Parses a DNCRP officer's stationOrThana into (thana_keyword, district_keyword).
    e.g.
    'Gulshan, Dhaka' -> ('gulshan', 'dhaka')
    'Uttara, Dhaka' -> ('uttara', 'dhaka')
    'Kotwali, Chattogram' -> ('kotwali', 'chattogram')
    'Dhaka Central Directorate' -> ('', 'dhaka')
    'Central Command HQ, Dhaka' -> ('', 'dhaka')
    """
    if not station_or_thana:
        return ("", "")

    raw = station_or_thana.strip()
    low = raw.lower()

    # Central HQ / Directorate / National / Intake postings have nationwide jurisdiction
    if any(h in low for h in ["central", "directorate", "hq", "headquarters", "command", "national", "intake", "commission"]):
        return ("", "")

    thana_kw = ""
    district_kw = ""

    if "," in raw:
        parts = [p.strip() for p in raw.split(",")]
        thana_candidate = parts[0]
        district_candidate = parts[1] if len(parts) > 1 else ""

        if any(h in thana_candidate.lower() for h in ["central", "command", "directorate", "hq", "headquarters", "national", "intake"]):
            thana_kw = ""
        else:
            thana_kw = extract_thana_keyword(thana_candidate).strip().lower()

        district_kw = district_candidate.strip().lower()
        district_kw = re.sub(r"(?i)\s*(district|division)\b", "", district_kw).strip()
    else:
        for d in BANGLADESH_DISTRICTS:
            if d in low:
                district_kw = d
                break

        if any(h in low for h in ["central", "directorate", "hq", "command", "headquarters", "national", "intake"]):
            thana_kw = ""
        else:
            thana_kw = extract_thana_keyword(raw).strip().lower()

    return (thana_kw, district_kw)


def is_consumer_in_jurisdiction(officer_station: str, shop_thana: str, shop_district: str = None) -> bool:
    """
    Determines whether a consumer complaint or shop is within a DNCRP officer's jurisdiction.
    """
    if not officer_station:
        return False

    st_clean = officer_station.strip().lower()
    if any(h in st_clean for h in ["central", "hq", "commission", "directorate", "national", "intake", "command"]):
        return True

    thana_kw, district_kw = parse_consumer_jurisdiction(officer_station)
    s_thana = (shop_thana or "").strip().lower()
    s_dist = (shop_district or "").strip().lower()

    # Normalize district names for Chittagong / Chattogram
    def _dist_match(d1: str, d2: str) -> bool:
        if not d1 or not d2:
            return True
        if d1 in d2 or d2 in d1:
            return True
        if {d1, d2} <= {"chittagong", "chattogram"}:
            return True
        return False

    # If officer has a specific Thana posting (e.g. 'gulshan', 'uttara', 'kotwali')
    if thana_kw:
        thana_match = (
            thana_kw in s_thana or
            s_thana in thana_kw or
            is_same_thana(thana_kw, s_thana)
        )
        if not thana_match:
            return False

        if district_kw and s_dist:
            return _dist_match(district_kw, s_dist)
        return True

    # If officer has district-level jurisdiction (e.g. Dhaka Central Directorate)
    if district_kw:
        return _dist_match(district_kw, s_dist)

    return True

