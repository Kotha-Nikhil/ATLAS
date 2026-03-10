CREATE TYPE alert_urgency AS ENUM ('warning', 'critical', 'emergency');
CREATE TYPE alert_type AS ENUM (
    'critical-lab',
    'unread-imaging',
    'overdue-milestone',
    'new-patient',
    'sepsis-escalation',
    'high-acuity-arrival'
);

CREATE TABLE alerts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   UUID REFERENCES patients(id) ON DELETE SET NULL,
    bed          TEXT,
    message      TEXT NOT NULL,
    urgency      alert_urgency NOT NULL,
    alert_type   alert_type NOT NULL,
    dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dismissed_at TIMESTAMPTZ,
    dismissed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_active ON alerts(dismissed) WHERE NOT dismissed;
