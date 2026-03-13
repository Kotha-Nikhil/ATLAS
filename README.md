# ATLAS — Automated Triage & Live Alert System

> Every second. Every patient. Every decision.

A real-time Emergency Department Command Center with FHIR R4 interoperability,
HL7 v2 ADT message parsing, SMART on FHIR sandbox integration, and
clinical data visualization — built for the pace of emergency medicine.

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
│  │REST API │ │WebSocket │ │ FHIR R4   │ │   HIPAA Audit      │  │
│  │ /api/*  │ │   Hub    │ │ /api/fhir │ │   Logging          │  │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ └────────┬───────────┘  │
│       │           │             │                 │              │
└───────┼───────────┼─────────────┼─────────────────┼──────────────┘
        │           │             │                 │
        ▼           ▼             ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                                │
│   patients │ labs │ imaging │ consults │ alerts │ audit_log       │
└──────────────────────────────────────────────────────────────────┘
        ▲
        │
┌───────┴──────────────────────────────────────────────────────────┐
│                  HL7 v2 Pipeline (Python)                         │
│                                                                  │
│  .hl7 file ──► hl7_parser.py ──► fhir_converter.py ──► POST     │
│  (ADT msg)     (ParsedPatient)    (FHIR Bundle)      /api/fhir  │
└──────────────────────────────────────────────────────────────────┘
```

## FHIR & Healthcare Standards

- **FHIR R4 REST API** — `GET /api/fhir/Patient/:id` and `POST /api/fhir/Patient`
- **FHIR CapabilityStatement** — `GET /api/fhir/metadata` for SMART client discovery
- **SMART on FHIR** — Live sandbox integration (`r4.smarthealthit.org`) for synthetic patient import
- **HL7 v2 ADT** — Python pipeline parses admit/discharge messages into FHIR bundles
- **HIPAA-conscious audit logging** — All PHI access logged to `audit_log` table

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, Recharts, shadcn/ui |
| Backend | Rust (stable), Axum 0.7, Tokio, SQLx 0.7, serde |
| Database | PostgreSQL 16 with custom enums, UUID PKs, 15+ indexes |
| Healthcare | FHIR R4, SMART on FHIR, HL7 v2 (hl7apy) |
| Auth | JWT (jsonwebtoken), Argon2 password hashing, role-based access |
| Real-time | WebSocket (Axum native) + tokio::broadcast channel |
| HL7 Pipeline | Python 3, hl7apy, requests, watchdog |
| DevOps | Docker, Docker Compose, Fly.io |

## HIPAA Compliance

- All PHI access logged to `audit_log` table with user, IP, timestamp, action
- Initials-only display — full names never stored or transmitted
- 15-minute JWT session expiry with refresh endpoint
- Role-based access control: MD > PA > CHG > RN
- HIPAA security headers on all responses (HSTS, CSP, X-Frame-Options)
- No PHI in logs, no PHI in git, no PHI in error messages
- Rate limiting on auth and AI endpoints

## Quick Start

```bash
# Clone and start database
git clone https://github.com/Kotha-Nikhil/ATLAS
cd ATLAS
docker compose up db -d

# Start backend
cd backend
cp .env.example .env  # edit DATABASE_URL if needed
cargo run --bin atlas-backend

# Seed demo data (new terminal)
cd backend
cargo run --bin seed

# Start frontend (new terminal)
cd frontend
npm install
npm run dev
# Open http://localhost:5175

# Login: dr.chen@atlas.ed / password123
```

## HL7 Pipeline

```bash
cd tools
pip install -r requirements.txt

# Process a single HL7 message
python main.py --file sample_hl7/adt_a01_admit.hl7

# Output:
# ✓ Parsed: J.D. / Bed 4 / Age 61 / Male
# ✓ FHIR Bundle generated (Patient + Encounter)
# ✓ Imported to ATLAS → real-time dashboard update

# Dry run (no import)
python main.py --file sample_hl7/adt_a01_admit.hl7 --dry-run

# Watch mode — auto-process incoming HL7 files
python main.py --watch ./hl7_drop/

# Run tests
pytest tests/ -v  # 35 tests
```

## FHIR R4 API

```bash
# FHIR CapabilityStatement
curl http://localhost:8080/api/fhir/metadata

# Get patient as FHIR R4
curl http://localhost:8080/api/fhir/Patient/{uuid}

# Import FHIR Bundle
curl -X POST http://localhost:8080/api/fhir/Patient \
  -H "Content-Type: application/fhir+json" \
  -d '{"resourceType":"Bundle","entry":[...]}'
```

## Features

**Clinical Dashboard**
- Real-time patient tracking board sorted by risk score
- ESI-based acuity triage (1-5 scale)
- Sepsis watch alerts with visual escalation
- Next milestone tracking with overdue detection
- AI-assisted workflow suggestions per patient

**Patient Detail View**
- Click any patient row for full slide-over panel
- Vitals trend charts (HR, BP, SpO2) with abnormal highlighting
- Lab results with critical value flagging
- Imaging order tracking with unread alerts
- Consult status monitoring

**ED Analytics**
- Patient volume by hour (24h bar chart)
- ESI distribution (pie chart with percentages)
- Door-to-doc trend with 30-minute target line
- Pending work summary (labs, imaging, consults)

**Interoperability**
- FHIR R4 Patient read/create endpoints
- SMART on FHIR sandbox import (synthetic patients)
- HL7 v2 ADT message parsing pipeline
- FHIR CapabilityStatement for client discovery

**Security & Compliance**
- JWT authentication with 15-minute expiry
- Role-based access (MD, PA, RN, CHG)
- HIPAA audit logging on all PHI access
- Input validation on all API endpoints
- Rate limiting on login and AI routes
- Health check endpoint for container orchestration

## Troubleshooting

| Error | Fix |
|-------|-----|
| **Port 8080 already in use** | `lsof -ti:8080 \| xargs kill -9` — kills process using port 8080 |
| **VersionMissing(8)** when running seed | Rebuild: `cd backend && cargo clean -p atlas-backend && cargo run --bin seed` |
| **cd frontend: No such file** | Run `cd frontend` from **project root**, not from `backend/`. Use: `cd "/Users/.../Cursor test project"` then `cd frontend` |
| **Fresh database** | `docker compose down -v && docker compose up db -d` — resets DB (removes data) |

## Testing

```bash
# Backend (Rust)
cd backend && cargo test    # 18 validation tests

# HL7 Pipeline (Python)
cd tools && pytest tests/   # 35 parser + FHIR tests

# Frontend (TypeScript)
cd frontend && npx tsc --noEmit  # Zero errors
```

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
│   │   ├── middleware/        # Auth, audit, HIPAA headers, rate limiting
│   │   ├── models/            # Patient, Lab, Imaging, Consult, Alert, User
│   │   ├── services/          # Simulator, alert engine, risk scoring
│   │   ├── ws/                # WebSocket broadcaster
│   │   └── main.rs
│   ├── migrations/            # PostgreSQL schema (8 migrations)
│   └── Cargo.toml
│
├── tools/                     # Python HL7 → FHIR pipeline
│   ├── hl7_parser.py          # HL7 v2 ADT parser
│   ├── fhir_converter.py      # FHIR R4 Bundle generator
│   ├── atlas_importer.py      # ATLAS API client
│   ├── main.py                # CLI entry point
│   ├── tests/                 # 35 pytest tests
│   └── sample_hl7/            # Sample ADT messages
│
├── docker-compose.yml
└── README.md
```
