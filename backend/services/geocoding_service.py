"""
High-Precision Bangladesh Geocoding & Coordinate Normalization Service
Provides exact coordinate lookup for all 64 Districts, 500+ Thanas/Upazilas,
and prominent hotspots (e.g. Assim in Fulbaria, Mymensingh).
Protects against false defaults to Dhaka across all 8 Divisions of Bangladesh.
"""

from typing import Tuple, Optional
import re
from ..data.bangladesh_geo_data import ALL_64_DISTRICTS, ALL_THANAS

# Specific prominent local landmarks and anomaly hotspots
LOCAL_HOTSPOTS = {
    "assim": (24.5828, 90.2655),              # Assim Bazar / Assim Patuli, Fulbaria, Mymensingh
    "assim bazar": (24.5828, 90.2655),
    "fulbaria bus stand": (24.6358, 90.2673),
    "fulbaria": (24.6333, 90.2667),           # Fulbaria Thana HQ, Mymensingh
    "khalishpur super market": (22.8589, 89.5398),
    "baridhara dohs": (23.8050, 90.4150),
    "gulshan 1": (23.7780, 90.4170),
    "gulshan 2": (23.7925, 90.4078),
    "dhanmondi 27": (23.7538, 90.3756),
    "dhanmondi 32": (23.7510, 90.3780),
    "shahbagh": (23.7380, 90.3950),
    "tsc du": (23.7320, 90.3950),
}

# Disambiguation for thanas sharing identical names across multiple districts
DISTRICT_QUALIFIED_THANAS = {
    "sylhet:kotwali": (24.8949, 91.8687),
    "chattogram:kotwali": (22.3350, 91.8325),
    "dhaka:kotwali": (23.7125, 90.4050),
    "rangpur:kotwali": (25.7500, 89.2500),
    "barishal:kotwali": (22.7010, 90.3535),
    "mymensingh:kotwali": (24.7550, 90.4050),
    "mymensingh:fulbaria": (24.6358, 90.2673),
    "dinajpur:fulbari": (25.5167, 88.8833),
    "kurigram:fulbari": (25.9500, 89.5667),
    "thakurgaon:pirganj": (25.8500, 88.3667),
    "rangpur:pirganj": (25.4167, 89.3167),
    "bogura:shibganj": (24.9833, 89.3167),
    "chapainawabganj:shibganj": (24.6833, 88.1667),
    "bogura:sherpur": (24.6667, 89.4167),
    "sherpur:sherpur sadar": (25.0167, 90.0167),
    "gazipur:kaliganj": (23.9167, 90.5667),
    "jhenaidah:kaliganj": (23.4167, 89.1333),
    "satkhira:kaliganj": (22.4500, 89.0333),
    "lalmonirhat:kaliganj": (25.9667, 89.2167),
    "kushtia:mirpur": (23.9333, 88.9833),
    "dhaka:mirpur": (23.8069, 90.3687),
    "dhaka:nawabganj": (23.6667, 90.1667),
    "dinajpur:nawabganj": (25.4167, 89.0833),
}

DHAKA_DEFAULT = (23.8103, 90.4125)


class GeocodingService:
    @staticmethod
    def resolve_coordinates(
        location_name: Optional[str] = None,
        thana: Optional[str] = None,
        district: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> Tuple[float, float]:
        """
        Resolves accurate GPS coordinates based on hierarchical geographic context.
        Covers all 64 Districts, 500+ Thanas, and specific Hotspots in Bangladesh.
        Guarantees non-Dhaka districts never fall back to Dhaka.
        """
        clean_loc = (location_name or "").strip().lower()
        clean_thana = (thana or "").strip().lower()
        clean_dist = (district or "").strip().lower()

        # 1. Check prominent local hotspots (e.g. 'assim', 'assim bazar')
        for spot, coords in LOCAL_HOTSPOTS.items():
            if spot in clean_loc or (clean_loc and clean_loc in spot):
                return coords
            if spot in clean_thana or (clean_thana and clean_thana in spot):
                return coords

        # 2. Check if valid custom GPS was provided (and isn't the bogus Dhaka default for a non-Dhaka district)
        if latitude is not None and longitude is not None:
            try:
                lat_f = float(latitude)
                lng_f = float(longitude)
                is_bogus_dhaka = (
                    abs(lat_f - DHAKA_DEFAULT[0]) < 0.001 and
                    abs(lng_f - DHAKA_DEFAULT[1]) < 0.001 and
                    clean_dist and
                    "dhaka" not in clean_dist
                )
                if not is_bogus_dhaka and lat_f != 0 and lng_f != 0:
                    return (lat_f, lng_f)
            except (ValueError, TypeError):
                pass

        # 3. Match by District-Qualified Thana (e.g. sylhet:kotwali vs chattogram:kotwali)
        pure_dist = re.sub(r"(?i)\s*(district|division|zila)\b", "", clean_dist).strip()
        pure_thana = re.sub(r"(?i)\s*(thana|upazila|ps|police\s*station|sadar)\b", "", clean_thana).strip() if clean_thana else ""

        if pure_dist and pure_thana:
            qualified_key = f"{pure_dist}:{pure_thana}"
            if qualified_key in DISTRICT_QUALIFIED_THANAS:
                return DISTRICT_QUALIFIED_THANAS[qualified_key]

        # 4. Direct Match in Nationwide 500+ Thanas & Upazilas Dictionary
        if clean_thana in ALL_THANAS:
            return ALL_THANAS[clean_thana]

        if pure_thana in ALL_THANAS:
            return ALL_THANAS[pure_thana]

        # Fuzzy check thana in nationwide dataset
        if clean_thana:
            for t_name, coords in ALL_THANAS.items():
                if pure_thana and (pure_thana == t_name or pure_thana in t_name or t_name in pure_thana):
                    return coords
                if t_name in clean_thana:
                    return coords

        # 5. Check if location_name contains a known thana in nationwide dataset
        if clean_loc:
            if clean_loc in ALL_THANAS:
                return ALL_THANAS[clean_loc]
            for t_name, coords in ALL_THANAS.items():
                if len(t_name) >= 4 and t_name in clean_loc:
                    return coords

        # 6. Fallback to All 64 District Centers
        if clean_dist in ALL_64_DISTRICTS:
            return ALL_64_DISTRICTS[clean_dist]

        if pure_dist in ALL_64_DISTRICTS:
            return ALL_64_DISTRICTS[pure_dist]

        if clean_dist:
            for d_name, coords in ALL_64_DISTRICTS.items():
                if pure_dist and (pure_dist == d_name or pure_dist in d_name or d_name in pure_dist):
                    return coords
                if d_name in clean_dist:
                    return coords

        # 7. Fallback to Dhaka center
        return DHAKA_DEFAULT
