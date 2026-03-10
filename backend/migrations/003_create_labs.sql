CREATE TYPE lab_status AS ENUM ('ordered', 'pending', 'resulted');

CREATE TABLE labs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    status          lab_status NOT NULL DEFAULT 'ordered',
    ordered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resulted_at     TIMESTAMPTZ,
    value           TEXT,
    is_critical     BOOLEAN NOT NULL DEFAULT FALSE,
    alert_threshold TEXT
);

CREATE INDEX idx_labs_patient ON labs(patient_id);
