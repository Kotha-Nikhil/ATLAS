CREATE TYPE imaging_status AS ENUM ('ordered', 'in-scanner', 'complete', 'read');

CREATE TABLE imaging_orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    imaging_type            TEXT NOT NULL,
    status                  imaging_status NOT NULL DEFAULT 'ordered',
    ordered_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at                 TIMESTAMPTZ,
    alert_if_unread_minutes INTEGER NOT NULL DEFAULT 30
);

CREATE INDEX idx_imaging_patient ON imaging_orders(patient_id);
