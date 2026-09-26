# SentinelX

SentinelX is a Bangladesh-focused public safety and consumer-protection platform. It provides role-based portals for citizens, police officers, DNCRP consumer-rights officers, and national administrators.

The application combines public-safety reporting, consumer grievance handling, SOS dispatch, barcode verification, case communication, and the Sentinel Prime civic and legal assistant.

## Main Features

- Citizen registration, NID-oriented verification flow, login, password reset, and session handling
- Five-step crime-report / GD submission with evidence support and case tracking
- Five-step DNCRP consumer-complaint submission with MRP/overcharging validation and reward information
- Emergency SOS beacon with location landmark, police-station routing, status tracking, and stand-down action
- BSTI barcode lookup and consumer-protection guidance
- Police dashboard for reports, assignments, investigation updates, heatmap activity, and emergency dispatch
- DNCRP dashboard for consumer-complaint intake, investigation, enforcement, and reward-status work
- Admin clearance portal for nationwide metrics, AI crime intelligence, audit logs, user provisioning, and CSV export
- Sentinel Prime AI assistant for citizen guidance, case lookups, SOS guidance, and form prefill actions

## Technology

| Layer | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Backend | Python, Flask, SQLAlchemy |
| Database | PostgreSQL; SQLite fallback for local development |
| Authentication | JWT and bcrypt |
| Maps and charts | Leaflet and Recharts |
| UI testing | Selenium notebooks in `selenium_tests/` |

## Prerequisites

Install the following before running the project:

- Node.js 20 or later (or Bun)
- Python 3.10 or later
- Google Chrome for Selenium testing
- PostgreSQL only if you want to use a PostgreSQL database; it is optional for local demonstration mode

## Local Setup

Open a terminal in the project root.

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Create local environment settings

Copy `.env.example` to `.env`, then update values only when needed.

```powershell
Copy-Item .env.example .env
```

Minimum local settings:

```env
FLASK_PORT=5000
FRONTEND_URL=http://localhost:3000
```

For a PostgreSQL connection, set `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/sentinelx_db
```

If PostgreSQL is unavailable, SentinelX falls back to the local `sentinelx.db` SQLite database and seeds demonstration data automatically.

### 3. Install backend dependencies

```bash
python -m pip install -r requirements.txt
```

On Windows, use this if `python` is not available:

```powershell
py -3 -m pip install -r requirements.txt
```

## Run the Application

Start the backend and frontend in two separate terminals.

### Terminal 1: Flask API

```bash
python app.py
```

The API starts at `http://127.0.0.1:5000`.

Health check:

```text
http://127.0.0.1:5000/api/health
```

### Terminal 2: React frontend

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

Vite proxies `/api` requests to the Flask server on port `5000`.

## Demo Accounts

The local database seeds the following accounts. The default password is `demo1234`.

| Role | Login identifier | Password |
|---|---|---|
| Citizen | `citizen.tanvir@example.com` | `demo1234` |
| Police | `police.kamrul@dmp.gov.bd` | `demo1234` |
| Consumer Rights / DNCRP | `shamim.reza@dncrp.gov.bd` | `demo1234` |
| Administrator | `admin@sentinelx.gov.bd` | `demo1234` |

### Administrator access

Administrators cannot use the public **Sign In** form. Open the dedicated clearance portal:

```text
http://localhost:3000/#/admin-clearance
```

Use the clearance key from `.env` (`ADMIN_CLEARANCE_KEY`). The demonstration default is:

```text
HQ-BANGLADESH-SECURITY-2026
```

For any deployed environment, replace all default secrets and demo credentials.

## Environment Variables

`.env.example` lists all supported variables. The common options are:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string; local mode falls back to SQLite when unavailable |
| `FLASK_PORT` or `PORT` | Flask server port; default `5000` |
| `FRONTEND_URL` | Frontend address used by backend-generated links |
| `JWT_SECRET` | JWT signing secret |
| `ADMIN_CLEARANCE_KEY` | Required for the administrator clearance portal |
| `GEMINI_API_KEY` | Optional Gemini key for AI-assistant integration |
| `GEMINI_API_KEY_BACKUP` | Optional backup Gemini key |
| `SMTP_*` | Optional SMTP settings for real email delivery |

Do not commit a real `.env` file containing production credentials.

## Useful Commands

```bash
# Start frontend development server
npm run dev

# Start Flask backend through npm
npm run server

# Type-check the frontend
npm run lint

# Build the production frontend into dist/
npm run build
```

## Production-Style Local Run

Build the frontend first:

```bash
npm run build
python app.py
```

When `dist/index.html` exists, Flask serves the built React application and its API from the same server.

## Selenium Testing

The Selenium notebooks are in `selenium_tests/`:

```text
TC_01_Landing_Page_Load.ipynb
TC_02_Citizen_Login.ipynb
TC_03_Invalid_Login.ipynb
TC_04_Citizen_Registration.ipynb
TC_05_Crime_Report_Submission.ipynb
TC_06_Consumer_Complaint.ipynb
TC_07_Barcode_Verification.ipynb
TC_08_SOS_Emergency_Beacon.ipynb
TC_09_Admin_Export_Crime_Stats.ipynb
TC_10_SentiBot_Widget.ipynb
```

### Run Selenium tests

1. Start the Flask backend and Vite frontend using the commands above.
2. Install the testing tools:

   ```bash
   python -m pip install selenium webdriver-manager notebook
   ```

3. Start Jupyter Notebook:

   ```bash
   jupyter notebook
   ```

4. Open a notebook from `selenium_tests/` and run its cell.

`TC_09_Admin_Export_Crime_Stats.ipynb` downloads generated CSV evidence into `selenium_tests/downloads/`.

Manual test sheets and the bug/feedback report are available in the project root and `docs/testing/`.

## Project Structure

```text
app.py                     Flask application entry point
backend/                   Models, routes, services, data seeding, and configuration
src/                       React application and dashboards
selenium_tests/            Selenium/Jupyter test cases
docs/testing/              Test evidence and bug/feedback report
public/                    Public frontend assets
```

## Main API Groups

| Area | Base path |
|---|---|
| Health | `/api/health` |
| Authentication | `/api/auth` |
| Citizen services | `/api/citizen` |
| Police operations | `/api/police` |
| Consumer-rights operations | `/api/consumer` |
| Administration | `/api/admin` |
| Case messages | `/api/cases` |

## Notes

- This is an academic/demo project. Do not use demo data, default passwords, or development security settings for real emergency reporting.
- An SOS test creates or updates an emergency record. Re-run it only in the local test environment and use the stand-down control after testing.
