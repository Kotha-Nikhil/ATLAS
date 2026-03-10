use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "alert_urgency", rename_all = "lowercase")]
pub enum AlertUrgency {
    Warning,
    Critical,
    Emergency,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "alert_type", rename_all = "kebab-case")]
pub enum AlertType {
    #[sqlx(rename = "critical-lab")]
    CriticalLab,
    #[sqlx(rename = "unread-imaging")]
    UnreadImaging,
    #[sqlx(rename = "overdue-milestone")]
    OverdueMilestone,
    #[sqlx(rename = "new-patient")]
    NewPatient,
    #[sqlx(rename = "sepsis-escalation")]
    SepsisEscalation,
    #[sqlx(rename = "high-acuity-arrival")]
    HighAcuityArrival,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Alert {
    pub id: Uuid,
    pub patient_id: Option<Uuid>,
    pub bed: Option<String>,
    pub message: String,
    pub urgency: AlertUrgency,
    pub alert_type: AlertType,
    pub dismissed: bool,
    pub created_at: DateTime<Utc>,
    pub dismissed_at: Option<DateTime<Utc>>,
    pub dismissed_by: Option<Uuid>,
}

pub type AlertDto = Alert;

#[derive(Debug, Deserialize)]
pub struct DismissAlertRequest {
    pub user_id: Option<Uuid>,
}
