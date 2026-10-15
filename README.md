# Raja Nursing Home — Billing Software

Desktop hospital billing system for **Raja Nursing Home**, Pavoorchatram.

This repository is being built in phases.

- **Phase 1:** project skeleton (API health + login placeholder)
- **Phase 2:** MySQL schema, migrations, and seed data
- **Phase 3:** Login, JWT session cookie, Admin vs Billing Staff

## Requirements

- Node.js 20+ (this machine has been verified with Node 24)
- MySQL 8 (service `MySQL80` is used for schema and seed in Phase 2)
- npm

## Phase 1 — what exists

- `backend/` Express + TypeScript API with `/api/health` and `/api/health/db`
- `frontend/` React + TypeScript hospital shell with a login **placeholder**
- Environment examples (no secrets in frontend code)

## Setup

### Backend

```powershell
cd S:\RajaNursingHome\backend
copy .env.example .env
```

Edit `backend\.env` and set your MySQL user/password. The database name can stay `raja_nursing_home`. `npm run db:setup` creates the database and tables if they do not exist.

```powershell
cd S:\RajaNursingHome\backend
npm install
npm run dev
```

API runs at `http://localhost:4000`.

### Frontend

```powershell
cd S:\RajaNursingHome\frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173` and proxies `/api` to the backend.

## Tests for Phase 1

1. Open `http://localhost:4000/api/health` — JSON `status: ok`
2. Open `http://localhost:4000/api/health/db` — `ok` if MySQL is configured; `503` if not (still a valid Phase 1 result)
3. Open `http://localhost:5173` — Raja Nursing Home login shell
4. Click **Sign in** — placeholder message, no real authentication

## Phase 2 — database

```powershell
cd S:\RajaNursingHome\backend
npm run db:setup
npm run db:status
```

Expected: tables created; doctors Dr. Nisha and Dr. Ravi; 11 billing types; hospital address filled; GSTIN and Drug Licence empty.

Default seed users (passwords hashed with bcrypt; login API comes in Phase 3):

- `admin` / `ChangeMe@123`
- `billing` / `ChangeMe@123`

Do not start Phase 3 until it is requested.
