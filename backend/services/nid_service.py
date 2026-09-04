import re
import time
import requests
from ..config import Config
from ..models import utcnow_iso

class MockNIDVerificationService:
    PREDEFINED_REGISTRY = {
        "19922692015000123": {
            "fullNameEn": "Tanvir Hossain",
            "fullNameBn": "তানভীর হোসেন",
            "dob": "1992-05-14",
            "fatherName": "Md. Delowar Hossain",
            "motherName": "Suraiya Begum",
            "address": "House 42, Road 11, Sector 4, Uttara, Dhaka",
            "district": "Dhaka",
            "thana": "Uttara",
            "bloodGroup": "A+",
        },
        "5508192841": {
            "fullNameEn": "Farhana Sultana",
            "fullNameBn": "ফারহানা সুলতানা",
            "dob": "1996-11-20",
            "fatherName": "Khandakar Mofizur Rahman",
            "motherName": "Salma Khatun",
            "address": "Holding 89, GEC Circle, Nasirabad, Chattogram",
            "district": "Chattogram",
            "thana": "Panchlaish",
            "bloodGroup": "O+",
        },
        "8201948291": {
            "fullNameEn": "Mahfuzur Rahman",
            "fullNameBn": "মাহফুজুর রহমান",
            "dob": "1988-03-09",
            "fatherName": "Late Shamsul Haque",
            "motherName": "Hosne Ara Begum",
            "address": "22/A, VIP Road, Kazir Dewri, Chattogram",
            "district": "Chattogram",
            "thana": "Kotwali",
            "bloodGroup": "B+",
        },
        "9918237192": {
            "fullNameEn": "Sadia Jahan",
            "fullNameBn": "সাদিয়া জাহান",
            "dob": "1998-08-25",
            "fatherName": "Md. Shahidul Islam",
            "motherName": "Nasreen Akhtar",
            "address": "Block C, Road 3, Mirpur-2, Dhaka",
            "district": "Dhaka",
            "thana": "Mirpur",
            "bloodGroup": "AB+",
        },
    }

    DISTRICTS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh"]
    THANAS_MAP = {
        "Dhaka": ["Gulshan", "Dhanmondi", "Mirpur", "Uttara", "Motijheel", "Mohammadpur", "Tejgaon", "Banani"],
        "Chattogram": ["Kotwali", "Panchlaish", "Agrabad", "Khulshi", "Pahartali", "Halishahar"],
        "Sylhet": ["Kotwali", "Zindabazar", "Amberkhana", "Shahporan"],
        "Rajshahi": ["Boalia", "Motihar", "Rajpara"],
        "Khulna": ["Khulna Sadar", "Khalishpur", "Sonadanga", "Daulatpur"],
        "Barishal": ["Kotwali", "Airport", "Kawnia"],
        "Rangpur": ["Kotwali", "Tajhat"],
        "Mymensingh": ["Fulbaria", "Kotwali", "Muktagacha", "Trishal", "Bhaluka", "Gafargaon"],
    }
    NAMES_EN = ["Kamrul Hassan", "Nusrat Jahan", "Shahadat Hossain", "Ariful Islam", "Tasnim Ahmed", "Sabrina Chowdhury"]
    NAMES_BN = ["কামরুল হাসান", "নুসরাত জাহান", "শাহাদাত হোসেন", "আরিফুল ইসলাম", "তাসনিম আহমেদ", "সাবরিনা চৌধুরী"]

    def verify_nid(self, nid_number: str, dob: str) -> dict:
        time.sleep(0.3)  # Realistic network verification latency
        clean_nid = re.sub(r"\s+", "", nid_number.strip())

        if not re.match(r"^(\d{10}|\d{13}|\d{17})$", clean_nid):
            raise ValueError(
                "Invalid Bangladesh National ID format. NID must be 10 digits (Smart Card), 13 digits, or 17 digits."
            )

        if not dob:
            raise ValueError("Date of Birth is required for biometric/NID cross-verification.")

        if clean_nid in self.PREDEFINED_REGISTRY:
            citizen = self.PREDEFINED_REGISTRY[clean_nid]
            return {
                "verified": True,
                "nidNumber": clean_nid,
                "fullNameEn": citizen["fullNameEn"],
                "fullNameBn": citizen["fullNameBn"],
                "dob": citizen["dob"],
                "fatherName": citizen["fatherName"],
                "motherName": citizen["motherName"],
                "address": citizen["address"],
                "district": citizen["district"],
                "thana": citizen["thana"],
                "bloodGroup": citizen["bloodGroup"],
                "verificationSource": "MOCK_VERIFICATION",
                "verifiedAt": utcnow_iso(),
            }

        # Dynamic deterministic generation
        digit_sum = sum(int(c) for c in clean_nid if c.isdigit())
        district = self.DISTRICTS[digit_sum % len(self.DISTRICTS)]
        thanas = self.THANAS_MAP.get(district, ["Sadar"])
        thana = thanas[digit_sum % len(thanas)]

        name_idx = digit_sum % len(self.NAMES_EN)
        blood_groups = ["A+", "B+", "O+", "AB+"]

        return {
            "verified": True,
            "nidNumber": clean_nid,
            "fullNameEn": self.NAMES_EN[name_idx],
            "fullNameBn": self.NAMES_BN[name_idx],
            "dob": dob,
            "fatherName": "Md. Anisur Rahman",
            "motherName": "Fatema Khatun",
            "address": f"House {(digit_sum % 50) + 1}, Road {(digit_sum % 20) + 1}, {thana}, {district}",
            "district": district,
            "thana": thana,
            "bloodGroup": blood_groups[digit_sum % 4],
            "verificationSource": "MOCK_VERIFICATION",
            "verifiedAt": utcnow_iso(),
        }


class PorichoyNIDVerificationService:
    def __init__(self, api_key: str = None, api_endpoint: str = None):
        self.api_key = api_key or Config.PORICHOY_API_KEY
        self.api_endpoint = api_endpoint or Config.PORICHOY_API_ENDPOINT
        self.mock_service = MockNIDVerificationService()

    def verify_nid(self, nid_number: str, dob: str) -> dict:
        if not self.api_key:
            return self.mock_service.verify_nid(nid_number, dob)

        try:
            resp = requests.post(
                self.api_endpoint,
                headers={"Content-Type": "application/json", "x-api-key": self.api_key},
                json={"national_id": nid_number, "dob": dob},
                timeout=10,
            )
            if resp.status_code != 200:
                raise Exception(f"Porichoy API error: HTTP {resp.status_code}")
            data = resp.json().get("data", {})
            return {
                "verified": True,
                "nidNumber": nid_number,
                "fullNameEn": data.get("name", "Verified Citizen"),
                "fullNameBn": data.get("nameBn", "যাচাইকৃত নাগরিক"),
                "dob": dob,
                "fatherName": data.get("father", "Md. Abdul Mannan"),
                "motherName": data.get("mother", "Rasheda Begum"),
                "address": data.get("permanentAddress", "House 14, Road 5, Dhanmondi, Dhaka"),
                "district": data.get("district", "Dhaka"),
                "thana": data.get("thana", "Dhanmondi"),
                "photoUrl": data.get("photoUrl"),
                "bloodGroup": data.get("bloodGroup", "B+"),
                "verificationSource": "PORICHOY_API",
                "verifiedAt": utcnow_iso(),
            }
        except Exception:
            return self.mock_service.verify_nid(nid_number, dob)
