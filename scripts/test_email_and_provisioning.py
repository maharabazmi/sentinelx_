import os
import sys
import unittest
import json

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from backend.services.email_service import EmailService
from backend.database import init_db, get_db
from backend.models import User
from backend.middleware.auth import generate_token

class TestEmailAndProvisioning(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = app.test_client()

    def test_01_email_service_dispatch(self):
        """Test EmailService OTP and Temporary Password generation."""
        otp_res = EmailService.send_verification_otp("test.citizen@example.com", "492018", "Rafiqul Islam")
        self.assertTrue(otp_res["success"])
        self.assertIn(otp_res["mode"], ["smtp", "dev_simulated"])

        temp_res = EmailService.send_temporary_password(
            to_email="test.officer@dmp.gov.bd",
            full_name="SI Mahmudul Hasan",
            role="POLICE",
            designation="Sub-Inspector (SI)",
            badge="BP-DMP-9082",
            station_or_thana="Gulshan Police Station, Dhaka",
            temp_password="SentX#test99!"
        )
        self.assertTrue(temp_res["success"])

    def test_02_send_and_verify_email_otp(self):
        """Test sending OTP and validating OTP via API."""
        test_email = "test.newcitizen@sentinelx.bd"

        # 1. Send OTP
        send_resp = self.client.post("/api/auth/send-email-otp", json={
            "email": test_email,
            "fullName": "Test New Citizen"
        })
        self.assertEqual(send_resp.status_code, 200)
        send_data = send_resp.get_json()
        self.assertTrue(send_data["success"])

        # Dev OTP should be available in dev mode
        dev_otp = send_data.get("devOtp")
        self.assertIsNotNone(dev_otp)
        self.assertEqual(len(dev_otp), 6)

        # 2. Test invalid OTP
        bad_verify = self.client.post("/api/auth/verify-email-otp", json={
            "email": test_email,
            "otp": "000000"
        })
        self.assertEqual(bad_verify.status_code, 400)

        # 3. Test correct OTP
        good_verify = self.client.post("/api/auth/verify-email-otp", json={
            "email": test_email,
            "otp": dev_otp
        })
        self.assertEqual(good_verify.status_code, 200)
        good_data = good_verify.get_json()
        self.assertTrue(good_data["success"])

    def test_03_admin_provisioning_and_first_login_password_change(self):
        """Test admin provisioning an officer with auto-generated temp password, then changing password."""
        with get_db() as db:
            admin_user = db.query(User).filter(User.role == "ADMIN").first()
            self.assertIsNotNone(admin_user, "Admin user must exist in seed records")
            admin_token = generate_token(admin_user)

        officer_email = f"officer.test.{os.getpid()}@dmp.gov.bd"
        officer_nid = f"9988776655{os.getpid() % 1000:03d}"
        officer_phone = f"+8801700{os.getpid() % 100000:05d}"

        # 1. Provision Officer via Admin API (omitting password to test auto-generation)
        prov_resp = self.client.post(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fullName": "Inspector Kamal Hossain",
                "nidNumber": officer_nid,
                "email": officer_email,
                "phone": officer_phone,
                "role": "POLICE",
                "designation": "Inspector (Investigation)",
                "department": "Cyber Crime & Digital Forensics Cell",
                "badgeNumber": "BP-DMP-7721",
                "stationOrThana": "Dhanmondi Police Station, Dhaka"
            }
        )
        self.assertEqual(prov_resp.status_code, 201)
        prov_data = prov_resp.get_json()
        self.assertTrue(prov_data["success"])
        temp_password = prov_data.get("temporaryPassword")
        self.assertIsNotNone(temp_password)
        self.assertTrue(temp_password.startswith("SentX#"))
        self.assertTrue(prov_data["user"]["mustChangePassword"])
        self.assertTrue(prov_data["user"]["isEmailVerified"])

        # 2. Officer Logs in with Temporary Password
        login_resp = self.client.post("/api/auth/login", json={
            "identifier": officer_email,
            "password": temp_password
        })
        self.assertEqual(login_resp.status_code, 200)
        login_data = login_resp.get_json()
        self.assertTrue(login_data["user"]["mustChangePassword"])
        officer_token = login_data["token"]

        # 3. Officer Changes Password
        new_secret_pass = "PersonalSecurePassword#2026"
        change_resp = self.client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={
                "currentPassword": temp_password,
                "newPassword": new_secret_pass
            }
        )
        self.assertEqual(change_resp.status_code, 200)
        change_data = change_resp.get_json()
        self.assertTrue(change_data["success"])
        self.assertFalse(change_data["user"]["mustChangePassword"])

        # 4. Verify login with new password works
        new_login = self.client.post("/api/auth/login", json={
            "identifier": officer_email,
            "password": new_secret_pass
        })
        self.assertEqual(new_login.status_code, 200)
        self.assertFalse(new_login.get_json()["user"]["mustChangePassword"])

if __name__ == "__main__":
    unittest.main()
