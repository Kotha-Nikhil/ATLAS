# ATLAS — Automated Triage & Live Alert System

Real-time Emergency Department Command Center with a React frontend and Rust backend.

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Zustand, React Query, Recharts, React Router v6

**Backend:** Rust, Axum 0.7, SQLx 0.7 (PostgreSQL), Tokio, WebSockets, JWT auth, HIPAA audit logging

**Database:** PostgreSQL 16

**Deployment:** Docker Compose (dev), Fly.io (prod)

## Quick Start

### Prerequisites
- Docker Desktop running
- Rust installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Node.js 18+

### 1. Start PostgreSQL

```bash
docker compose up db -d
```

### 2. Run Backend

```bash
cd backend
cp .env.example .env
cargo run
```

Migrations run automatically on startup. Backend listens on `http://localhost:8080`.

### 3. Seed Data

```bash
cd backend
cargo run --bin seed
```

Creates 3 test users and 18 patients matching the frontend mock data.

**Login credentials:**
- MD: `dr.chen@atlas.ed` / `password123`
- RN: `nurse.k@atlas.ed` / `password123`
- CHG: `charge.m@atlas.ed` / `password123`

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| GET | /api/patients | All active patients (risk-ranked) |
| GET | /api/patients/:id | Single patient with labs/imaging/consults |
| POST | /api/patients | Admit patient (CHG/MD) |
| PUT | /api/patients/:id | Update patient |
| DELETE | /api/patients/:id | Discharge (MD only) |
| GET/POST | /api/patients/:id/labs | Labs CRUD |
| PUT | /api/patients/:id/labs/:lab_id | Update lab result |
| GET/POST | /api/patients/:id/imaging | Imaging CRUD |
| PUT | /api/patients/:id/imaging/:img_id | Update imaging status |
| GET/POST | /api/patients/:id/consults | Consults CRUD |
| GET | /api/metrics | Dashboard metrics |
| GET | /api/alerts | Active alerts |
| POST | /api/alerts/:id/dismiss | Dismiss alert |
| POST | /api/ai/suggest | AI workflow suggestion |
| POST | /api/ai/top5 | Top 5 sickest summary |
| POST | /api/ai/handoff | Shift handoff summary |
| GET | /ws | WebSocket (real-time events) |

## WebSocket Events

Connect to `ws://localhost:8080/ws` to receive real-time events:

- `lab_resulted` — Lab value returned
- `imaging_updated` — Imaging status changed
- `new_patient` — Patient arrived
- `high_acuity_arrival` — ESI 1-2 direct to bed
- `alert_fired` — New clinical alert
- `sepsis_escalation` — Sepsis bundle overdue
- `metrics_updated` — Dashboard metrics changed
- `tick` — 10-second heartbeat

## Deployment (Fly.io)

```bash
cd backend
fly launch
fly postgres create --name atlas-db
fly postgres attach atlas-db
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly deploy
```

## Architecture

```
frontend/          React + TypeScript + Vite
backend/           Rust + Axum + SQLx
  src/
    handlers/      HTTP request handlers
    middleware/     Auth, HIPAA headers, audit logging
    models/        Database models + DTOs
    services/      Background tasks (simulator, alerts, AI)
    ws/            WebSocket broadcaster
  migrations/      PostgreSQL schema (7 files)
```
