-- Performance indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_patients_disposition ON patients(disposition_status);
CREATE INDEX IF NOT EXISTS idx_patients_risk_score ON patients(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_patients_esi ON patients(esi);
CREATE INDEX IF NOT EXISTS idx_patients_sepsis ON patients(sepsis_watch) WHERE sepsis_watch = TRUE;
CREATE INDEX IF NOT EXISTS idx_patients_time_in ON patients(time_in);

CREATE INDEX IF NOT EXISTS idx_labs_status ON labs(status);
CREATE INDEX IF NOT EXISTS idx_imaging_status ON imaging_orders(status);
CREATE INDEX IF NOT EXISTS idx_consults_status ON consults(status);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
