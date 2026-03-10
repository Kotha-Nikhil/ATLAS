use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "imaging_status", rename_all = "kebab-case")]
pub enum ImagingStatus {
    Ordered,
    #[sqlx(rename = "in-scanner")]
    InScanner,
    Complete,
    Read,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ImagingOrder {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub imaging_type: String,
    pub status: ImagingStatus,
    pub ordered_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
    pub alert_if_unread_minutes: i32,
}

pub type ImagingDto = ImagingOrder;

#[derive(Debug, Deserialize)]
pub struct CreateImagingRequest {
    pub imaging_type: String,
    pub alert_if_unread_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateImagingRequest {
    pub status: Option<String>,
}
