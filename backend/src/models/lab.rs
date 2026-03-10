use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "lab_status", rename_all = "lowercase")]
pub enum LabStatus {
    Ordered,
    Pending,
    Resulted,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Lab {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub name: String,
    pub status: LabStatus,
    pub ordered_at: DateTime<Utc>,
    pub resulted_at: Option<DateTime<Utc>>,
    pub value: Option<String>,
    pub is_critical: bool,
    pub alert_threshold: Option<String>,
}

pub type LabDto = Lab;

#[derive(Debug, Deserialize)]
pub struct CreateLabRequest {
    pub name: String,
    pub alert_threshold: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLabRequest {
    pub status: Option<String>,
    pub value: Option<String>,
    pub is_critical: Option<bool>,
}
