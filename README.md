# SentinelX

SentinelX is a web application for public-safety reports and consumer complaints in Bangladesh. Citizens can submit reports and request help; police and consumer-rights staff can review and manage cases through role-based dashboards.

## What it includes

- **Citizen services:** crime reports, emergency SOS requests, consumer complaints, barcode lookups, notifications, and an AI assistant.
- **Police dashboard:** report review and assignment, status updates, emergency alerts, SOS response, and a crime heatmap.
- **Consumer-rights dashboard:** complaint review, investigation workflow, shop and barcode records, and reward tracking.
- **Admin dashboard:** system overview, user administration, audit logs, and crime-risk predictions.
- **Account access:** NID verification, registration, email verification, login, and password recovery.

Some services use external providers. Local development can use the project's mock NID service; live integrations need their own credentials and configuration.

## Technology

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet, Recharts, and Lucide icons
- **Backend:** Python, Flask, SQLAlchemy, and PyJWT
- **Database:** PostgreSQL when available; SQLite is used as a local fallback

## Run locally

### Requirements

- Python 3.10 or newer
- Bun, or Node.js with npm
- PostgreSQL is optional for local development

### Install

Run these commands from the repository root.

Create and activate a Python virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

On macOS or Linux, activate it with `source .venv/bin/activate` instead.

Install the backend and frontend dependencies:

```powershell
python -m pip install -r requirements.txt
bun install
```

If you use Node.js instead of Bun, run `npm install`.

Copy `.env.example` to `.env` and adjust the settings you need. On PowerShell:

```powershell
Copy-Item .env.example .env
```

If PostgreSQL is unavailable, the backend falls back to the local `sentinelx.db` SQLite database. The first run initializes the schema and adds demonstration records.

### Start the app

Open two terminals in the repository root. Start the backend in the first:

```powershell
python app.py
```

Start the frontend in the second:

```powershell
bun run dev
```

Open <http://localhost:3000>. The Vite development server forwards `/api` requests to the Flask backend at `http://127.0.0.1:5000`.

The backend health check is available at <http://127.0.0.1:5000/api/health>.

## Configuration

The application reads settings from `.env`. Common settings include:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `FLASK_PORT` | Backend port; defaults to `5000` |
| `FLASK_HOST` | Backend bind address |
| `JWT_SECRET` | Signing key for authentication tokens |
| `ADMIN_CLEARANCE_KEY` | Key used by the admin clearance flow |
| `GEMINI_API_KEY` | Optional key for Gemini-powered assistant features |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | Optional email delivery settings |
| `PORICHOY_API_KEY` | Optional credential for live NID verification |

`.env.example` lists the available email, server, and AI settings. Keep real credentials in your local `.env`; do not commit them. Replace the example JWT and clearance values before using a shared or deployed environment.

## API overview

All API routes use the `/api` prefix. The full request and response behavior is implemented in `backend/routes/`.

| Area | Example routes |
| --- | --- |
| Health | `GET /api/health` |
| Accounts | `POST /api/auth/verify-nid`, `POST /api/auth/register`, `POST /api/auth/login` |
| Citizen | `POST /api/citizen/reports`, `POST /api/citizen/sos`, `POST /api/citizen/complaints` |
| Police | `GET /api/police/reports`, `GET /api/police/heatmap`, `POST /api/police/emergency-alerts` |
| Consumer rights | `GET /api/consumer/complaints`, `GET /api/consumer/dashboard-summary` |
| Administration | `GET /api/admin/system-overview`, `GET /api/admin/audit-logs` |
| Case messages | `/api/cases/<case_id>/messages` |

## Build and type check

Build the frontend and run its TypeScript check with:

```powershell
bun run build
bun run lint
```

## Project layout

```text
backend/                 Flask app, API routes, database models, and services
src/                     React application, role dashboards, and shared UI
public/                  Static assets
2_database/schema.sql    Database schema reference
app.py                   Flask application entry point
```

## Demo data and security

Development seed accounts use the demonstration password `demo1234`; the seeded account records are listed in `backend/seed_data.py`. These credentials and the local fallback database are for demonstrations only. Do not use them for a deployed service or store real personal data in the development database.
