# ATLAS HL7 → FHIR Pipeline

> Parse HL7 v2 ADT messages, convert to FHIR R4 bundles, and import patients into the ATLAS ED Command Center in real time.

## What is HL7 v2?

HL7 v2 (Health Level Seven version 2) is the most widely deployed healthcare messaging standard in the world. Nearly every hospital system — Epic, Cerner, Meditech — sends ADT (Admit/Discharge/Transfer) messages when patients move through the ED:

- **ADT^A01** — Patient admitted to the ED
- **ADT^A03** — Patient discharged
- **ADT^A02** — Patient transferred between beds

These pipe-delimited messages carry demographics (PID segment), visit info (PV1 segment), and event metadata (MSH/EVN segments). This pipeline parses them into structured data.

## What is FHIR R4?

FHIR (Fast Healthcare Interoperability Resources) R4 is the modern standard for healthcare APIs. Unlike HL7 v2's pipe-delimited format, FHIR uses JSON/XML REST APIs. ATLAS exposes FHIR R4 endpoints so any SMART on FHIR client can read and write patient data.

This pipeline bridges the gap: **HL7 v2 in → FHIR R4 out → ATLAS dashboard updated**.

## Pipeline Flow

```
.hl7 file          hl7_parser.py       fhir_converter.py     atlas_importer.py
 (ADT msg)  ──────►  ParsedPatient  ──────►  FHIR Bundle  ──────►  POST /api/fhir/Patient
                      (initials only)        (Patient +             (JWT auth, retries)
                                              Encounter)
                                                                          │
                                                                          ▼
                                                                   ATLAS Dashboard
                                                                   (real-time via WS)
```

## Quick Start

```bash
cd tools
pip install -r requirements.txt

# Process a single file
python main.py --file sample_hl7/adt_a01_admit.hl7

# Dry run (parse + convert, no import)
python main.py --file sample_hl7/adt_a01_admit.hl7 --dry-run

# Watch a directory for incoming HL7 files
python main.py --watch ./hl7_drop/
```

### Output

```
✓ Parsed: J.D. / Bed 4 / Age 61 / Male
  MRN: PT123456 / Event: admit / Attending: S.C.
✓ FHIR Bundle generated (Patient + Encounter)
✓ Imported to ATLAS → Patient ID: abc-123
✓ Dashboard updated in real time
```

## Configuration

Copy `.env.example` to `.env` and set:

```env
ATLAS_API_URL=http://localhost:8080
ATLAS_JWT_TOKEN=your_jwt_token_here
```

## Running Tests

```bash
pytest tests/ -v
```

## Hospital Interface Engine Integration

In a production environment, this pipeline would connect to a hospital's **interface engine** (e.g., Rhapsody, Mirth Connect, InterSystems HealthShare):

1. The interface engine receives ADT messages from the EHR (Epic, Cerner)
2. Messages are routed to an HL7 drop directory or TCP/MLLP listener
3. This pipeline's `--watch` mode picks up new files automatically
4. Parsed data flows through FHIR conversion into ATLAS

For TCP/MLLP listeners (standard in healthcare), the pipeline would be extended with `hl7apy`'s MLLP server or a dedicated listener service.

## HIPAA Considerations

This pipeline is designed with PHI minimization:

- **Initials only** — Full patient names are never stored. `DOE^JOHN^A` becomes `J.D.`
- **No PHI in logs** — Console output only shows initials and bed numbers
- **No PHI in git** — Sample files use synthetic data
- **Audit trail** — All FHIR imports are logged to the ATLAS `audit_log` table
- **Encrypted transport** — Production deployments use HTTPS/TLS
- **Token auth** — JWT Bearer tokens required for all API calls

## File Structure

```
tools/
├── hl7_parser.py          # HL7 v2 ADT message parser
├── fhir_converter.py      # FHIR R4 Bundle generator
├── atlas_importer.py      # ATLAS API client with retries
├── main.py                # CLI entry point
├── requirements.txt       # Python dependencies
├── .env.example           # Environment template
├── README.md              # This file
├── tests/
│   ├── test_hl7_parser.py     # Parser tests
│   └── test_fhir_converter.py # FHIR conversion tests
└── sample_hl7/
    ├── adt_a01_admit.hl7      # Sample admit message
    └── adt_a03_discharge.hl7  # Sample discharge message
```
