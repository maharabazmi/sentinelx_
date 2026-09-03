# SentinelX - AI-Assisted Public Safety & Consumer Protection Platform

National civil safety and consumer grievance management system for the People's Republic of Bangladesh.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 4, Lucide React, Leaflet, Recharts
- **Backend**: Python 3 (Flask), SQLAlchemy, Psycopg2, PyJWT, Bcrypt
- **Database**: PostgreSQL (with SQLite resilient development fallback)

---

## Quick Start

### 1. Prerequisites
- **Python 3.10+**
- **Bun** or **Node.js**

### 2. Install Dependencies

#### Python Backend
```bash
pip install -r requirements.txt
```

#### Frontend
```bash
bun install
# or: npm install
```

### 3. Environment Configuration
Edit `.env` to configure your PostgreSQL connection and API keys:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sentinelx_db?schema=public"
FLASK_PORT=5000
FLASK_HOST="0.0.0.0"
JWT_SECRET="sentinelx-bangladesh-national-security-token-secret-2026"
PORICHOY_API_KEY=""
```

> **Note**: If your local PostgreSQL server is not currently running, the backend automatically falls back to local SQLite (`sqlite:///sentinelx.db`) with full demonstration records, so the app runs out of the box without manual setup.

### 4. Run the Application

In terminal 1 (Backend):
```bash
python app.py
```
*(Runs Flask REST API on http://127.0.0.1:5000)*

In terminal 2 (Frontend):
```bash
bun run dev
# or: npm run dev
```
*(Runs Vite React SPA on http://localhost:3000 with automatic proxy to the Flask backend)*

---

## Architecture & API Endpoints

- **Health Check**: `GET /api/health`
- **Auth & NID**: `POST /api/auth/verify-nid`, `POST /api/auth/register`, `POST /api/auth/login`
- **Citizen Services**: Crime report lodging, DNCRP dispute filing, SOS emergency distress dispatch, BSTI barcode verification
- **Police Command**: Operational dashboard, crime report review/investigation updates, verified-only crime heatmap, emergency alerts
- **Consumer Rights (DNCRP)**: Complaint resolution, mobile court enforcement penalties, shop inspection surveillance index
- **Admin Governance**: National security overview, AI crime risk prediction & scenario simulations, audit logging
