# ATLAS — Automated Triage & Live Alert System

> Every second. Every patient. Every decision.

**ATLAS** is a real-time Emergency Department Command Center built for clinicians who need to prioritize, track, and act on patient data at speed. It combines FHIR R4 interoperability, HL7 v2 ADT message parsing, SMART on FHIR sandbox integration, and clinical data visualization into a single, HIPAA-conscious dashboard.

---

## Table of Contents

- [What You'll See](#what-youll-see)
- [Run Locally](#run-locally)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [API Reference](#api-reference)
- [HL7 Pipeline](#hl7-pipeline)
- [FHIR R4 API](#fhir-r4-api)
- [HIPAA & Security](#hipaa--security)
- [Troubleshooting](#troubleshooting)
- [What Else You Can Do](#what-else-you-can-do)
- [Project Structure](#project-structure)

---

## What You'll See

When you run ATLAS and log in, the **ED Command Center** dashboard appears as follows:

![ATLAS ED Command Center Dashboard](docs/dashboard.png)

### Top Banner
- **WORKFLOW ONLY · NO AUTO-ORDERS** — Clarifies that the system supports workflow only; no automatic orders are placed.
- **HIPAA COMPLIANT** — Indicates compliance with health information privacy.
- **Critical Alerts** — Red banners for urgent items (e.g., unread CT results, sepsis bundles overdue).

### Key Metrics Bar
- **Patients IN** — Total active patients in the ED.
- **ESI 1–2** — High-acuity count (Emergency Severity Index 1 or 2).
- **Waiting** — Patients without beds.
- **Pending Dispo** — Patients awaiting disposition.
- **Door-to-Doc** — Average time from arrival to physician contact (minutes).
- **LWBS Risk** — Left Without Being Seen risk (LOW / MED / HIGH).

### Top Risk Cards
Three cards show the highest-risk patients with:
- Risk score (0–100)
- Patient initials, bed, chief complaint
- Risk flags (e.g., STROKE!, SEPSIS, ACS/PE)
- Time in ED

### Patient Table
Main board with columns:
- **Bed** — Bed number or WR (Waiting Room).
- **Patient** — Initials, age, sex.
- **ESI** — Emergency Severity Index (1–5).
- **Chief Complaint** — Primary complaint and icon.
- **Risk Flags** — Badges for STROKE!, SEPSIS, ANTICOAG, etc., plus **SEPSIS WATCH** when relevant.
- **Time In** — Duration in ED.
- **Next Milestone** — Due tasks or results, with **OVERDUE** when past due.
- **Owner** — MD, PA, RN, or CHG.
- **AI Assist** — Suggested next actions or workflow hints.

### Pending Results Sidebar (Right)
- **Imaging** — CT, X-ray, US orders with status; unread results highlighted.
- **Labs** — Pending and resulted labs; critical values in red.
- **Consults** — Active specialist consultations (Neurology, GI, Orthopedics) with status.

![Pending Results & Consults](docs/pending-results.png)

### Bottom Action Bar
- **Top 5 Sick**, **Fast Dispos**, **Overdue**, **Handoff**, **AI Assist**
- **Metrics**, **Analytics**, **FHIR Import**
- **Last update** — Recency of data.

**Click any patient row** to open a slide-over panel with full details, vitals trends, labs, imaging, and consults.

### Patient Detail Panel

The slide-over shows clinical summary, risk flags, next milestone, AI suggestions, and vital sign trends:

![Patient Detail — Clinical Summary & Vitals](docs/patient-summary.png)

Vitals charts (HR, SpO2, BP) and lab results with critical flagging:

![Patient Detail — Vitals Charts & Labs](docs/patient-detail.png)

---

## Run Locally

### Prerequisites

| Tool | Version | How to Install |
|------|---------|----------------|
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Rust** | Stable (2021+) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) or `nvm install 18` |
| **Python** | 3.10+ | Pre-installed on macOS/Linux, or [python.org](https://www.python.org/) |

### Step 1: Clone the Repository

```bash
git clone https://github.com/Kotha-Nikhil/ATLAS.git
cd ATLAS
```

### Step 2: Start PostgreSQL

```bash
docker compose up db -d
```

Wait a few seconds for PostgreSQL to be ready. Check with:

```bash
docker compose ps
```

### Step 3: Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` if needed. For local development, defaults are usually fine:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://atlas:atlas@localhost:5432/atlas_ed` | PostgreSQL connection string |
| `JWT_SECRET` | (see .env.example) | Used to sign JWTs |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin(s), comma-separated for multiple ports |
| `PORT` | `8080` | Backend listen port |

**Tip:** If your frontend runs on a different port (e.g. 5176), set `CORS_ORIGIN=http://localhost:5176` or include multiple origins.

### Step 4: Start the Backend

```bash
cd backend
cargo run
```

Wait until you see: `Listening on 0.0.0.0:8080`. Leave this terminal running.

### Step 5: Seed Demo Data (New Terminal)

```bash
cd ATLAS/backend
cargo run --bin seed
```

You should see: `Seed complete! 18 patients created.`

### Step 6: Start the Frontend (New Terminal)

```bash
cd ATLAS/frontend
npm install
npm run dev
```

Vite will print a local URL, e.g. `http://localhost:5173` or `http://localhost:5176` if 5173–5175 are in use.

### Step 7: Log In

1. Open the URL from Step 6 in your browser.
2. Use the demo credentials shown on the login screen:

![ATLAS Login](docs/login.png)

- **Email:** `dr.chen@atlas.ed`
- **Password:** `password123`

### One-Command Option

From the project root:

```bash
chmod +x scripts/run.sh
./scripts/run.sh
```

This script starts the database, seeds data, runs the backend, and then the frontend. Use it once your environment is set up.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        ATLAS Dashboard                           │
│        React 18 + TypeScript + Vite + Tailwind + Recharts        │
│                                                                  │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │ Patient │ │  Vitals  │ │    ED     │ │   SMART on FHIR    │  │
│  │  Table  │ │  Charts  │ │ Analytics │ │   Sandbox Import   │  │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ └────────┬───────────┘  │
│       │           │             │                 │              │
└───────┼───────────┼─────────────┼─────────────────┼──────────────┘
        │           │             │                 │
        ▼           ▼             ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Rust + Axum Backend                           │
│                                                                  │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │REST API │ │WebSocket │ │ FHIR R4   │ │   HIPAA Audit       │  │
│  │ /api/*  │ │   Hub    │ │ /api/fhir │ │   Logging          │  │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ └────────┬───────────┘  │
│       │           │             │                 │              │
└───────┼───────────┼─────────────┼─────────────────┼──────────────┘
        │           │             │                 │
        ▼           ▼             ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                               │
│   patients │ labs │ imaging │ consults │ alerts │ audit_log       │
└──────────────────────────────────────────────────────────────────┘
        ▲
        │
┌───────┴──────────────────────────────────────────────────────────┐
│                  HL7 v2 Pipeline (Python)                         │
│                                                                  │
│  .hl7 file ──► hl7_parser.py ──► fhir_converter.py ──► POST      │
│  (ADT msg)     (ParsedPatient)    (FHIR Bundle)      /api/fhir   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Recharts, shadcn/ui, Zustand, React Router v6 |
| **Backend** | Rust (stable), Axum 0.7, Tokio, SQLx 0.7, serde |
| **Database** | PostgreSQL 16 with enums, UUIDs, 15+ indexes |
| **Healthcare** | FHIR R4, SMART on FHIR, HL7 v2 (hl7apy) |
| **Auth** | JWT (jsonwebtoken), Argon2 hashing, role-based access |
| **Real-time** | WebSocket (Axum) + tokio::broadcast channel |
| **HL7 Pipeline** | Python 3, hl7apy, requests, watchdog |
| **DevOps** | Docker, Docker Compose, Fly.io |

---

## Features

### Clinical Dashboard
- Real-time patient board sorted by risk score
- ESI 1–5 acuity triage
- Sepsis watch alerts with escalation
- Next milestone tracking and overdue indication
- AI-driven workflow suggestions per patient

### Patient Detail Panel
- Slide-over on row click
- Vitals trends (HR, BP, SpO2) with abnormal highlights
- Labs with critical value flagging
- Imaging order tracking and unread alerts
- Consult status

### ED Analytics & Metrics
- Patient volume by hour (bar chart)
- ESI distribution (pie chart)
- Door-to-doc trend with 30-minute target
- Pending work summary (labs, imaging, consults)

### Interoperability
- FHIR R4 Patient read/create
- SMART on FHIR sandbox import — search and import synthetic patients from the SMART Health IT sandbox
- HL7 v2 ADT → FHIR pipeline
- FHIR CapabilityStatement for client discovery

![SMART on FHIR Import](docs/fhir-import.png)

### Security & Compliance
- JWT auth with 15-minute expiry
- Roles: MD, PA, RN, CHG
- HIPAA audit logging for PHI access
- Input validation and rate limiting
- Health check for orchestration

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/patients` | All active patients (risk-ranked) |
| GET | `/api/patients/full` | Patients with labs, imaging, consults (batch) |
| GET | `/api/patients/:id` | Single patient |
| POST | `/api/patients` | Create patient (CHG/MD) |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Discharge (MD) |
| GET/POST | `/api/patients/:id/labs` | Labs CRUD |
| PUT | `/api/patients/:id/labs/:lab_id` | Update lab result |
| GET/POST | `/api/patients/:id/imaging` | Imaging CRUD |
| PUT | `/api/patients/:id/imaging/:img_id` | Update imaging status |
| GET/POST | `/api/patients/:id/consults` | Consults CRUD |
| GET | `/api/metrics` | Dashboard metrics |
| GET | `/api/alerts` | Active alerts |
| POST | `/api/alerts/:id/dismiss` | Dismiss alert |
| POST | `/api/ai/suggest` | AI workflow suggestion |
| POST | `/api/ai/top5` | Top 5 sickest summary |
| POST | `/api/ai/handoff` | Shift handoff summary |
| GET | `/api/fhir/metadata` | FHIR CapabilityStatement |
| GET | `/api/fhir/Patient/:id` | Patient as FHIR R4 JSON |
| POST | `/api/fhir/Patient` | Import FHIR Bundle |
| GET | `/health` | Health check |
| GET | `/ws` | WebSocket (real-time events) |

---

## HL7 Pipeline

ATLAS includes a Python pipeline to parse HL7 v2 ADT messages and import them as FHIR R4 resources.

```bash
cd tools
pip install -r requirements.txt

# Process a single HL7 file
python main.py --file sample_hl7/adt_a01_admit.hl7

# Dry run (parse only, no import)
python main.py --file sample_hl7/adt_a01_admit.hl7 --dry-run

# Watch a folder for new HL7 files
python main.py --watch ./hl7_drop/

# Run tests
pytest tests/ -v
```

For import, set `ATLAS_API_URL` and `ATLAS_JWT_TOKEN` in `tools/.env`. Obtain a JWT by logging in via the frontend and inspecting network requests or using the login API.

---

## FHIR R4 API

```bash
# CapabilityStatement (what ATLAS supports)
curl http://localhost:8080/api/fhir/metadata

# Get patient as FHIR R4
curl http://localhost:8080/api/fhir/Patient/{uuid}

# Import FHIR Bundle (e.g. from HL7 pipeline)
curl -X POST http://localhost:8080/api/fhir/Patient \
  -H "Content-Type: application/fhir+json" \
  -d '{"resourceType":"Bundle","type":"transaction","entry":[...]}'
```

---

## HIPAA & Security

- **Audit logging** — PHI access logged to `audit_log` with user, IP, timestamp, action
- **Initials only** — Full names never stored or displayed
- **Session expiry** — 15-minute JWT expiry with refresh endpoint
- **RBAC** — Roles MD > PA > CHG > RN
- **Security headers** — HSTS, CSP, X-Frame-Options
- **No PHI in logs** — Logs avoid patient identifiers
- **Rate limiting** — Login and AI endpoints protected

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| **Port 8080 already in use** | `lsof -ti:8080 \| xargs kill -9` |
| **VersionMissing(8)** when seeding | `cd backend && cargo clean -p atlas-backend && cargo run --bin seed` |
| **cd frontend: No such file** | Run `cd frontend` from the project root, not from `backend/` |
| **CORS errors** | Set `CORS_ORIGIN` in `backend/.env` to your frontend URL (e.g. `http://localhost:5176`) |
| **Fresh database** | `docker compose down -v && docker compose up db -d` |

---

## What Else You Can Do

Here are directions to extend or improve ATLAS:

### Clinical & Workflow
- **Real LLM integration** — Replace hardcoded AI suggestions with Anthropic/OpenAI for contextual recommendations.
- **Order entry** — Add order creation from the dashboard (labs, imaging, consults).
- **Notes / documentation** — Attach notes or structured documentation to patients.
- **Disposition workflow** — Structured admit/discharge/transfer flow with checklists.

### Interoperability
- **Full FHIR support** — Observations, Conditions, Procedures for vitals and diagnoses.
- **HL7 v2 orders/results** — Extend the pipeline to ORM (orders), OUL (lab results), ORU (observations).
- **SMART launch** — SMART OAuth 2.0 launch from an EHR or patient portal.
- **Document storage** — Store PDFs/images and expose via FHIR DocumentReference.

### Data & Analytics
- **Historical dashboards** — Trends over days/weeks (volume, acuity, throughput).
- **Predictive models** — LWBS, boarding, or length-of-stay predictions.
- **Reporting** — PDF/Excel reports for operational metrics.
- **Alerts configuration** — Admin UI to configure thresholds and escalation rules.

### DevOps & Scale
- **CI/CD** — GitHub Actions for tests, lint, and deploy.
- **E2E tests** — Playwright/Cypress for critical user flows.
- **Kubernetes** — Manifests for production deployment.
- **Monitoring** — Prometheus metrics, Grafana dashboards, error tracking (e.g. Sentry).

### UX & Polish
- **Keyboard shortcuts** — Fast navigation (e.g. j/k) and actions.
- **Dark/light theme** — Toggle for user preference.
- **Mobile layout** — Responsive or dedicated mobile view.
- **Offline mode** — Service worker and cached data for limited connectivity.

---

## Project Structure

```
ATLAS/
├── frontend/                  # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # Login, session timeout
│   │   │   ├── command/       # TopRiskCards, AI panels, FHIR import, analytics
│   │   │   ├── layout/        # TopBar, Sidebar, ActionBar, HeartbeatIndicator
│   │   │   ├── overlays/      # Top5Sick, Handoff modals
│   │   │   └── patients/      # PatientTable, PatientRow, DetailPanel, VitalsChart
│   │   ├── hooks/             # useRealtimeEvents, useRiskScoring
│   │   ├── lib/               # API client, mappers
│   │   ├── store/             # Zustand stores (patient, alert, auth)
│   │   └── types/             # TypeScript interfaces
│   └── package.json
│
├── backend/                   # Rust + Axum + SQLx
│   ├── src/
│   │   ├── handlers/          # REST + FHIR + WebSocket handlers
│   │   ├── middleware/        # Auth, HIPAA headers, audit, rate limiting
│   │   ├── models/            # Patient, Lab, Imaging, Consult, Alert, User
│   │   ├── services/          # Simulator, alert engine, risk scoring
│   │   ├── ws/                # WebSocket broadcaster
│   │   └── main.rs
│   ├── migrations/            # PostgreSQL schema (8 migrations)
│   └── Cargo.toml
│
├── tools/                     # Python HL7 → FHIR pipeline
│   ├── hl7_parser.py
│   ├── fhir_converter.py
│   ├── atlas_importer.py
│   ├── main.py
│   ├── tests/                 # 35 pytest tests
│   └── sample_hl7/
│
├── scripts/
│   └── run.sh                 # One-command local startup
├── docker-compose.yml
└── README.md
```

---

## Testing

```bash
# Backend (Rust)
cd backend && cargo test

# HL7 Pipeline (Python)
cd tools && pytest tests/ -v

# Frontend (TypeScript)
cd frontend && npx tsc --noEmit
```

---

## License

See [LICENSE](LICENSE) if present. Otherwise, use under your chosen terms.
