import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as conditions
from selenium.webdriver.support.ui import WebDriverWait


TESTING_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = TESTING_DIR.parent
sys.path.insert(0, str(REPO_ROOT))
BASE_URL = os.getenv("SENTINELX_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
HEADLESS = os.getenv("SENTINELX_HEADLESS", "true").lower() not in {"0", "false", "no"}
BROWSER = os.getenv("SENTINELX_BROWSER", "chrome").lower()

TEST_CASES = [
    {
        "id": "UI-001",
        "method": "test_landing_page_loads",
        "module": "Public landing",
        "title": "Landing page renders its public safety content",
        "preconditions": "Frontend development server is running.",
        "steps": "Open the base URL and wait for the landing page heading.",
        "expected": "The public defense heading and official sign-in action are visible.",
    },
    {
        "id": "UI-002",
        "method": "test_emergency_hotlines_dropdown",
        "module": "Emergency hotline",
        "title": "Hotline menu shows Bangladesh emergency contacts",
        "preconditions": "Landing page is loaded.",
        "steps": "Open the National Emergency Hotlines menu.",
        "expected": "The menu shows 999, 16121, 109, and 333.",
    },
    {
        "id": "UI-003",
        "method": "test_login_modal_and_password_visibility",
        "module": "Authentication UI",
        "title": "Login modal opens and password visibility toggles",
        "preconditions": "Landing page is loaded; no account credentials are needed.",
        "steps": "Open Official Sign In, reveal the password, then hide it again.",
        "expected": "The login dialog opens and the password input toggles text/password types.",
    },
    {
        "id": "UI-004",
        "method": "test_registration_modal_opens",
        "module": "Registration UI",
        "title": "NID registration wizard opens from the landing page",
        "preconditions": "Landing page is loaded; no registration is submitted.",
        "steps": "Select Verify NID & Enter.",
        "expected": "The registration wizard's identity-verification step is visible.",
    },
    {
        "id": "UI-005",
        "method": "test_theme_toggle",
        "module": "Display settings",
        "title": "Theme control switches between light and dark",
        "preconditions": "Landing page is loaded.",
        "steps": "Read the theme control label, click it, and read the updated label.",
        "expected": "The control changes from Switch to light theme to Switch to dark theme or vice versa.",
    },
    {
        "id": "API-001",
        "method": "test_verify_nid_requires_fields",
        "module": "NID API",
        "title": "NID verification rejects a missing payload",
        "preconditions": "API tests run against a disposable, seeded SQLite database.",
        "steps": "POST an empty JSON object to /api/auth/verify-nid.",
        "expected": "HTTP 400 with a validation error; no records are created.",
    },
    {
        "id": "API-002",
        "method": "test_verify_nid_rejects_invalid_format",
        "module": "NID API",
        "title": "NID verification rejects an invalid NID format",
        "preconditions": "API tests run against a disposable, seeded SQLite database.",
        "steps": "Submit a short NID with a date of birth.",
        "expected": "HTTP 400 with an NID format validation error.",
    },
    {
        "id": "API-003",
        "method": "test_verify_nid_accepts_valid_unregistered_nid",
        "module": "NID API",
        "title": "NID verification accepts a valid unregistered mock NID",
        "preconditions": "Mock NID verification is used; only the temporary database is queried.",
        "steps": "Submit a valid 10-digit NID and date of birth.",
        "expected": "HTTP 200, verified identity data, and alreadyRegistered=false.",
    },
    {
        "id": "API-004",
        "method": "test_verify_nid_marks_seeded_nid_as_registered",
        "module": "NID API",
        "title": "NID verification detects an existing seeded account",
        "preconditions": "Temporary test database contains the documented demo seed records.",
        "steps": "Verify the seeded citizen NID 5508192841.",
        "expected": "HTTP 200 and alreadyRegistered=true.",
    },
    {
        "id": "API-005",
        "method": "test_login_accepts_seeded_citizen_credentials",
        "module": "Authentication API",
        "title": "Login accepts valid seeded citizen credentials",
        "preconditions": "Temporary database is seeded; demo password is demo1234.",
        "steps": "POST the seeded citizen NID and demo password to /api/auth/login.",
        "expected": "HTTP 200, success=true, a token, and a citizen user profile.",
    },
    {
        "id": "API-006",
        "method": "test_login_rejects_invalid_password",
        "module": "Authentication API",
        "title": "Login rejects an incorrect password",
        "preconditions": "Temporary database is seeded; no shared account is used.",
        "steps": "POST a seeded citizen NID with an incorrect password.",
        "expected": "HTTP 401 with a credential error and no authentication token.",
    },
    {
        "id": "API-007",
        "method": "test_public_login_blocks_admin_account",
        "module": "Authentication API",
        "title": "Public login blocks an administrator account",
        "preconditions": "Temporary database is seeded; no shared account is used.",
        "steps": "POST the seeded admin NID and demo password to the public login route.",
        "expected": "HTTP 403 with an access-denied response.",
    },
]


def create_driver():
    if BROWSER == "edge":
        options = webdriver.EdgeOptions()
        if HEADLESS:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1000")
        return webdriver.Edge(options=options)

    if BROWSER != "chrome":
        raise ValueError("SENTINELX_BROWSER must be 'chrome' or 'edge'.")

    options = webdriver.ChromeOptions()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=options)


class SentinelXSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.driver = create_driver()
        cls.wait = WebDriverWait(cls.driver, 15)

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "driver"):
            cls.driver.quit()

    def setUp(self):
        self.driver.get(BASE_URL)
        self.wait.until(conditions.presence_of_element_located((By.TAG_NAME, "body")))

    def test_landing_page_loads(self):
        self.wait.until(conditions.visibility_of_element_located((By.XPATH, "//h1[contains(., 'PUBLIC DEFENSE')]")))
        self.assertTrue(self.driver.find_element(By.XPATH, "//button[.//span[contains(., 'OFFICIAL SIGN IN')]]").is_displayed())

    def test_emergency_hotlines_dropdown(self):
        self.driver.find_element(By.CSS_SELECTOR, "button[title='National Emergency Hotlines']").click()
        menu = self.wait.until(conditions.visibility_of_element_located((
            By.XPATH,
            "//h4[contains(., 'Bangladesh National Hotlines')]/ancestor::div[contains(@class, 'w-72')][1]",
        )))
        menu_text = menu.text
        for hotline in ("999", "16121", "109", "333"):
            self.assertIn(hotline, menu_text)

    def test_login_modal_and_password_visibility(self):
        self.driver.find_element(By.XPATH, "//button[.//span[contains(., 'OFFICIAL SIGN IN')]]").click()
        self.wait.until(conditions.visibility_of_element_located((
            By.XPATH,
            "//*[contains(., 'Sign In to SentinelX')]",
        )))
        password = self.driver.find_element(By.CSS_SELECTOR, "form input[type='password']")
        self.driver.find_element(By.CSS_SELECTOR, "button[aria-label='Show password']").click()
        self.wait.until(lambda driver: password.get_attribute("type") == "text")
        self.driver.find_element(By.CSS_SELECTOR, "button[aria-label='Hide password']").click()
        self.wait.until(lambda driver: password.get_attribute("type") == "password")
        self.assertEqual(password.get_attribute("type"), "password")

    def test_registration_modal_opens(self):
        self.driver.find_element(By.XPATH, "//button[.//span[contains(., 'VERIFY NID & ENTER')]]").click()
        self.wait.until(conditions.visibility_of_element_located((
            By.XPATH,
            "//*[contains(., 'Citizen Identity Verification')]",
        )))

    def test_theme_toggle(self):
        theme_button = self.driver.find_element(By.CSS_SELECTOR, "button[aria-label^='Switch to']")
        initial_label = theme_button.get_attribute("aria-label")
        theme_button.click()
        self.wait.until(lambda driver: driver.find_element(
            By.CSS_SELECTOR,
            "button[aria-label^='Switch to']",
        ).get_attribute("aria-label") != initial_label)
        updated_label = self.driver.find_element(By.CSS_SELECTOR, "button[aria-label^='Switch to']").get_attribute("aria-label")
        self.assertNotEqual(initial_label, updated_label)


class AuthApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from flask import Flask
        import sqlalchemy
        from sqlalchemy.orm import sessionmaker

        cls.database_directory = tempfile.TemporaryDirectory(prefix="sentinelx-test-")
        database_path = Path(cls.database_directory.name) / "sentinelx-test.db"
        cls.engine = sqlalchemy.create_engine(
            f"sqlite:///{database_path.as_posix()}",
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

        original_engine_factory = sqlalchemy.create_engine
        sqlalchemy.create_engine = lambda *_args, **_kwargs: cls.engine
        try:
            import backend.database as database
            from backend.routes.auth_routes import auth_bp
        finally:
            sqlalchemy.create_engine = original_engine_factory

        cls.database = database
        database.engine = cls.engine
        database.DB_ENGINE_TYPE = "SQLITE_FALLBACK"
        database.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
            bind=cls.engine,
        )
        database.init_db()

        app = Flask("sentinelx_auth_api_tests")
        app.register_blueprint(auth_bp)
        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "engine"):
            cls.engine.dispose()
            cls.database_directory.cleanup()

    def test_verify_nid_requires_fields(self):
        response = self.client.post("/api/auth/verify-nid", json={})

        self.assertEqual(response.status_code, 400)
        self.assertIn("mandatory", response.get_json()["error"])

    def test_verify_nid_rejects_invalid_format(self):
        response = self.client.post("/api/auth/verify-nid", json={
            "nidNumber": "12",
            "dob": "1990-01-01",
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid Bangladesh National ID format", response.get_json()["error"])

    def test_verify_nid_accepts_valid_unregistered_nid(self):
        response = self.client.post("/api/auth/verify-nid", json={
            "nidNumber": "1234567890",
            "dob": "1990-01-01",
        })
        body = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(body["success"])
        self.assertFalse(body["alreadyRegistered"])
        self.assertTrue(body["verification"]["verified"])

    def test_verify_nid_marks_seeded_nid_as_registered(self):
        response = self.client.post("/api/auth/verify-nid", json={
            "nidNumber": "5508192841",
            "dob": "1996-11-20",
        })

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["alreadyRegistered"])

    def test_login_accepts_seeded_citizen_credentials(self):
        response = self.client.post("/api/auth/login", json={
            "identifier": "19922692015000123",
            "password": "demo1234",
        })
        body = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(body["success"])
        self.assertTrue(body["token"])
        self.assertEqual(body["user"]["role"], "CITIZEN")

    def test_login_rejects_invalid_password(self):
        response = self.client.post("/api/auth/login", json={
            "identifier": "19922692015000123",
            "password": "not-the-demo-password",
        })

        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid password", response.get_json()["error"])
        self.assertNotIn("token", response.get_json())

    def test_public_login_blocks_admin_account(self):
        response = self.client.post("/api/auth/login", json={
            "identifier": "19800029381928371",
            "password": "demo1234",
        })

        self.assertEqual(response.status_code, 403)
        self.assertIn("Access Denied", response.get_json()["error"])


class ResultCollector(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.outcomes = {}

    def addSuccess(self, test):
        super().addSuccess(test)
        self.outcomes[test._testMethodName] = ("PASS", "")

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.outcomes[getattr(test, "_testMethodName", str(test))] = ("FAIL", self._format_error(err))

    def addError(self, test, err):
        super().addError(test, err)
        self.outcomes[getattr(test, "_testMethodName", str(test))] = ("ERROR", self._format_error(err))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.outcomes[getattr(test, "_testMethodName", str(test))] = ("SKIP", reason)

    @staticmethod
    def _format_error(err):
        error_type, error, _ = err
        return f"{error_type.__name__}: {error}"


def write_artifacts(outcomes, started_at, total, failures, errors):
    rows = []
    for case in TEST_CASES:
        status, details = outcomes.get(case["method"], ("NOT RUN", ""))
        rows.append({**case, "status": status, "actual": details or status, "defect": details if status in {"FAIL", "ERROR"} else ""})

    passed = sum(row["status"] == "PASS" for row in rows)
    skipped = sum(row["status"] == "SKIP" for row in rows)

    def markdown_cell(value):
        return escape(str(value)).replace("|", "&#124;").replace("\r\n", "<br>").replace("\n", "<br>")

    markdown_rows = [
        "# SentinelX Automated Test Results",
        "",
        f"- Run started: {started_at.isoformat(timespec='seconds')} UTC",
        f"- UI target: `{markdown_cell(BASE_URL)}`",
        f"- Browser: `{markdown_cell(BROWSER)}`",
        "- API database: temporary SQLite, deleted after the run",
        f"- Summary: **{total} executed, {passed} passed, {failures} failed, {errors} errors, {skipped} skipped**",
        "- Scope: public UI smoke checks and authentication/NID API contracts; no shared or production database is used.",
        "",
        "| ID | Module | Test case | Expected result | Actual result | Status | Defect / feedback |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        markdown_rows.append("| " + " | ".join(markdown_cell(row[key]) for key in (
            "id", "module", "title", "expected", "actual", "status", "defect"
        )) + " |")
    (TESTING_DIR / "test_results.md").write_text("\n".join(markdown_rows) + "\n", encoding="utf-8")

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Test Cases"
    headers = ["Test Case ID", "Module", "Test Title", "Preconditions", "Test Steps", "Expected Result", "Actual Result", "Status", "Defect / Feedback"]
    sheet.append(headers)
    for row in rows:
        sheet.append([row[key] for key in ("id", "module", "title", "preconditions", "steps", "expected", "actual", "status", "defect")])
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="17365D")
    for column, width in enumerate((15, 22, 42, 42, 48, 48, 48, 14, 48), start=1):
        sheet.column_dimensions[chr(64 + column)].width = width
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    workbook.save(TESTING_DIR / "test_cases.xlsx")

    report_path = TESTING_DIR / "test_report.pdf"
    document = SimpleDocTemplate(str(report_path), pagesize=landscape(A4), rightMargin=24, leftMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    passed = sum(row["status"] == "PASS" for row in rows)
    skipped = sum(row["status"] == "SKIP" for row in rows)
    story = [
        Paragraph("SentinelX Automated Test Report", styles["Title"]),
        Paragraph(f"Run started: {started_at.isoformat(timespec='seconds')} UTC", styles["BodyText"]),
        Paragraph(f"UI target: {escape(BASE_URL)} | Browser: {escape(BROWSER)} | API database: disposable SQLite", styles["BodyText"]),
        Paragraph(f"Summary: {total} executed | {passed} passed | {failures} failed | {errors} errors | {skipped} skipped", styles["BodyText"]),
        Paragraph("Scope: public UI smoke checks and authentication/NID API contracts. No shared or production database is used.", styles["BodyText"]),
        Spacer(1, 12),
    ]
    table_data = [["ID", "Test", "Expected", "Status", "Actual / Defect"]]
    for row in rows:
        table_data.append([
            row["id"],
            Paragraph(escape(row["title"]), styles["BodyText"]),
            Paragraph(escape(row["expected"]), styles["BodyText"]),
            row["status"],
            Paragraph(escape(row["actual"]).replace("\n", "<br/>"), styles["BodyText"]),
        ])
    table = Table(table_data, colWidths=(42, 145, 185, 55, 315), repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17365D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#9EADBC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    for row_index, row in enumerate(rows, start=1):
        status_color = {
            "PASS": colors.HexColor("#166534"),
            "FAIL": colors.HexColor("#B91C1C"),
            "ERROR": colors.HexColor("#B45309"),
            "SKIP": colors.HexColor("#475569"),
        }.get(row["status"], colors.HexColor("#475569"))
        table.setStyle(TableStyle([("TEXTCOLOR", (3, row_index), (3, row_index), status_color)]))
    story.append(table)
    document.build(story)


def main():
    started_at = datetime.now(timezone.utc).replace(tzinfo=None)
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(SentinelXSmokeTests)
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(AuthApiContractTests))
    runner = unittest.TextTestRunner(resultclass=ResultCollector, verbosity=2)
    result = runner.run(suite)
    write_artifacts(result.outcomes, started_at, result.testsRun, len(result.failures), len(result.errors))
    print(f"Artifacts written to {TESTING_DIR}")
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())