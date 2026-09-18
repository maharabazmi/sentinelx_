"""
High-Precision Bangladesh Geocoding & Coordinate Normalization Service
Provides exact coordinate lookup for Divisions, Districts, Thanas/Upazilas,
and prominent hotspots (e.g. Assim in Fulbaria, Mymensingh).
Prevents false defaults to Dhaka (23.8103, 90.4125).
"""

from typing import Tuple, Optional
import re

# Specific prominent local landmarks and anomaly hotspots
LOCAL_HOTSPOTS = {
    "assim": (24.5828, 90.2655),              # Assim Bazar / Assim Patuli, Fulbaria, Mymensingh
    "assim bazar": (24.5828, 90.2655),
    "fulbaria bus stand": (24.6358, 90.2673),
    "fulbaria": (24.6333, 90.2667),           # Fulbaria Thana HQ, Mymensingh
    "muktagacha": (24.7667, 90.2667),
    "trishal": (24.5833, 90.3958),
    "bhaluka": (24.3750, 90.3778),
    "gafargaon": (24.4333, 90.5500),
    "mymensingh sadar": (24.7471, 90.4203),
    "mymensingh": (24.7471, 90.4203),
    "khalishpur": (22.8589, 89.5398),
    "khalishpur super market": (22.8589, 89.5398),
    "hobiganj": (24.3840, 91.4169),
    "habiganj": (24.3840, 91.4169),
    "gulshan": (23.7925, 90.4078),
    "banani": (23.7937, 90.4043),
    "uttara": (23.8759, 90.3795),
    "mirpur": (23.8069, 90.3687),
    "dhanmondi": (23.7461, 90.3742),
    "motijheel": (23.7330, 90.4172),
    "paltan": (23.7358, 90.4125),
    "agrabad": (22.3275, 91.8122),
    "panchlaish": (22.3590, 91.8215),
    "kotwali ctg": (22.3350, 91.8325),
    "zindabazar": (24.8949, 91.8687),
}

# Thana / Upazila Coordinates
THANA_COORDINATES = {
    # Mymensingh Division
    "fulbaria": (24.6333, 90.2667),
    "trishal": (24.5833, 90.3958),
    "bhaluka": (24.3750, 90.3778),
    "muktagacha": (24.7667, 90.2667),
    "gafargaon": (24.4333, 90.5500),
    "ishwarganj": (24.6833, 90.6000),
    "haluaghat": (25.1250, 90.3500),
    "dhobaura": (25.0833, 90.5333),
    "nandail": (24.5667, 90.6833),
    "phulpur": (24.9500, 90.3500),
    "tarakanda": (24.8667, 90.4333),
    "mymensingh sadar": (24.7471, 90.4203),
    "jamalpur sadar": (24.9197, 89.9481),
    "netrokona sadar": (24.8833, 90.7333),
    "sherpur sadar": (25.0167, 90.0167),

    # Dhaka Division
    "gulshan": (23.7925, 90.4078),
    "banani": (23.7937, 90.4043),
    "mirpur": (23.8069, 90.3687),
    "dhanmondi": (23.7461, 90.3742),
    "motijheel": (23.7330, 90.4172),
    "uttara": (23.8759, 90.3795),
    "mohammadpur": (23.7658, 90.3584),
    "paltan": (23.7358, 90.4125),
    "chawkbazar": (23.7174, 90.3957),
    "badda": (23.7805, 90.4267),
    "ramna": (23.7410, 90.4030),
    "tejgaon": (23.7598, 90.3912),
    "khilgaon": (23.7500, 90.4250),
    "sabujbagh": (23.7380, 90.4350),
    "lalbagh": (23.7180, 90.3880),
    "hazaribagh": (23.7350, 90.3680),
    "demra": (23.7080, 90.4900),
    "jatrabari": (23.7100, 90.4350),
    "kadamtali": (23.6950, 90.4450),
    "cantonment": (23.8200, 90.3900),
    "kafrul": (23.7950, 90.3800),
    "new market": (23.7330, 90.3840),

    # Chattogram Division
    "kotwali": (22.3350, 91.8325),
    "panchlaish": (22.3590, 91.8215),
    "agrabad": (22.3275, 91.8122),
    "halishahar": (22.3167, 91.7833),
    "pahartali": (22.3556, 91.7833),
    "khulshi": (22.3650, 91.8100),
    "bakalia": (22.3450, 91.8450),
    "chandgaon": (22.3800, 91.8480),
    "patenga": (22.2500, 91.8000),
    "cox's bazar sadar": (21.4272, 92.0058),

    # Sylhet Division
    "zindabazar": (24.8949, 91.8687),
    "bandarbazar": (24.8917, 91.8710),
    "amberkhana": (24.9030, 91.8690),
    "sylhet sadar": (24.8949, 91.8687),
    "south surma": (24.8700, 91.8750),
    "habiganj sadar": (24.3840, 91.4169),
    "moulvibazar sadar": (24.4829, 91.7774),
    "sunamganj sadar": (25.0658, 91.4073),

    # Rajshahi Division
    "boalia": (24.3685, 88.6042),
    "motihar": (24.3639, 88.6283),
    "rajpara": (24.3700, 88.5850),
    "shah makhdum": (24.3850, 88.6150),
    "paba": (24.4333, 88.6167),
    "bogra sadar": (24.8500, 89.3667),
    "pabna sadar": (24.0064, 89.2372),

    # Khulna Division
    "khalishpur": (22.8589, 89.5398),
    "khulna sadar": (22.8157, 89.5681),
    "sonadanga": (22.8256, 89.5467),
    "daulatpur": (22.8750, 89.5250),
    "khan jahan ali": (22.9000, 89.5050),
    "jessore sadar": (23.1667, 89.2167),
    "kushtia sadar": (23.9000, 89.1167),

    # Barishal Division
    "barishal sadar": (22.7010, 90.3535),
    "kaunia": (22.7100, 90.3650),
    "airport": (22.7400, 90.3300),
    "patuakhali sadar": (22.3596, 90.3298),
    "bhola sadar": (22.6859, 90.6481),

    # Rangpur Division
    "rangpur sadar": (25.7439, 89.2752),
    "kotwali rangpur": (25.7500, 89.2500),
    "dinajpur sadar": (25.6217, 88.6355),
    "bogura": (24.8500, 89.3667),
}

# District / Division Fallback Centers
DISTRICT_COORDINATES = {
    "mymensingh": (24.7471, 90.4203),
    "dhaka": (23.8103, 90.4125),
    "chattogram": (22.3569, 91.7832),
    "sylhet": (24.8949, 91.8687),
    "rajshahi": (24.3745, 88.6042),
    "khulna": (22.8456, 89.5403),
    "barishal": (22.7010, 90.3535),
    "rangpur": (25.7439, 89.2752),
    "jamalpur": (24.9197, 89.9481),
    "netrokona": (24.8833, 90.7333),
    "sherpur": (25.0167, 90.0167),
    "cox's bazar": (21.4272, 92.0058),
    "gazipur": (24.0023, 90.4264),
    "narayanganj": (23.6238, 90.5000),
    "tangail": (24.2500, 89.9167),
    "bogura": (24.8500, 89.3667),
    "jessore": (23.1667, 89.2167),
    "habiganj": (24.3840, 91.4169),
    "moulvibazar": (24.4829, 91.7774),
    "sunamganj": (25.0658, 91.4073),
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
        Protects against invalid defaults to Dhaka when district/thana is outside Dhaka.
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

        DISTRICT_QUALIFIED_THANAS = {
            "sylhet:kotwali": (24.8949, 91.8687),
            "chattogram:kotwali": (22.3350, 91.8325),
            "dhaka:kotwali": (23.7125, 90.4050),
            "rangpur:kotwali": (25.7500, 89.2500),
            "barishal:kotwali": (22.7010, 90.3535),
            "mymensingh:kotwali": (24.7550, 90.4050),
            "mymensingh:fulbaria": (24.6358, 90.2673),
        }

        if pure_dist and pure_thana:
            qualified_key = f"{pure_dist}:{pure_thana}"
            if qualified_key in DISTRICT_QUALIFIED_THANAS:
                return DISTRICT_QUALIFIED_THANAS[qualified_key]

        # 4. Match by Thana / Upazila name
        if clean_thana:
            for t_name, coords in THANA_COORDINATES.items():
                if pure_thana and (pure_thana == t_name or pure_thana in t_name or t_name in pure_thana):
                    return coords
                if t_name in clean_thana:
                    return coords

        # 4. Check if location_name contains a known thana
        if clean_loc:
            for t_name, coords in THANA_COORDINATES.items():
                if t_name in clean_loc:
                    return coords

        # 5. Fallback to District Center
        if clean_dist:
            pure_dist = re.sub(r"(?i)\s*(district|division|zila)\b", "", clean_dist).strip()
            for d_name, coords in DISTRICT_COORDINATES.items():
                if pure_dist and (pure_dist == d_name or pure_dist in d_name or d_name in pure_dist):
                    return coords

        # 6. Fallback to Dhaka center
        return DHAKA_DEFAULT
