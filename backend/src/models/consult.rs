use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "consult_status", rename_all = "kebab-case")]
pub enum ConsultStatus {
    Called,
    #[sqlx(rename = "callback-received")]
    CallbackReceived,
    Seen,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Consult {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub specialty: String,
    pub called_at: DateTime<Utc>,
    pub callback_at: Option<DateTime<Utc>>,
    pub status: ConsultStatus,
}

pub type ConsultDto = Consult;

#[derive(Debug, Deserialize)]
pub struct CreateConsultRequest {
    pub specialty: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateConsultRequest {
    pub status: Option<String>,
    pub callback_at: Option<DateTime<Utc>>,
}
