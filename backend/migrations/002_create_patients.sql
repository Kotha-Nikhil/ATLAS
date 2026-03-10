CREATE TYPE esi_level AS ENUM ('1', '2', '3', '4', '5');
CREATE TYPE dispo_status AS ENUM ('active', 'dispo-ready', 'admitted', 'discharged');

CREATE TABLE patients (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed                   TEXT NOT NULL,
    display_name          TEXT NOT NULL,
    age                   INTEGER NOT NULL,
    sex                   CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
    esi                   esi_level NOT NULL,
    chief_complaint       TEXT NOT NULL,
    chief_complaint_icon  TEXT,
    risk_score            INTEGER NOT NULL DEFAULT 0,
    disposition_status    dispo_status NOT NULL DEFAULT 'active',
    sepsis_watch          BOOLEAN NOT NULL DEFAULT FALSE,
    owner_role            user_role NOT NULL DEFAULT 'MD',
    time_in               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    milestone_description TEXT,
    milestone_due_time    TIMESTAMPTZ,
    milestone_is_overdue  BOOLEAN NOT NULL DEFAULT FALSE,
    ai_assist             TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_flags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    label      TEXT NOT NULL,
    severity   TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'watch'))
);

CREATE INDEX idx_risk_flags_patient ON risk_flags(patient_id);
