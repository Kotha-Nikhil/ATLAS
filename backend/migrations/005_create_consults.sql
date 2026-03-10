CREATE TYPE consult_status AS ENUM ('called', 'callback-received', 'seen');

CREATE TABLE consults (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    specialty   TEXT NOT NULL,
    called_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    callback_at TIMESTAMPTZ,
    status      consult_status NOT NULL DEFAULT 'called'
);

CREATE INDEX idx_consults_patient ON consults(patient_id);
