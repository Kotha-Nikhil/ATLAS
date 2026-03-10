use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::consult::ConsultDto;
use super::imaging::ImagingDto;
use super::lab::LabDto;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "esi_level")]
pub enum EsiLevel {
    #[sqlx(rename = "1")]
    #[serde(rename = "1")]
    One,
    #[sqlx(rename = "2")]
    #[serde(rename = "2")]
    Two,
    #[sqlx(rename = "3")]
    #[serde(rename = "3")]
    Three,
    #[sqlx(rename = "4")]
    #[serde(rename = "4")]
    Four,
    #[sqlx(rename = "5")]
    #[serde(rename = "5")]
    Five,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "dispo_status", rename_all = "kebab-case")]
pub enum DispoStatus {
    Active,
    #[sqlx(rename = "dispo-ready")]
    DispoReady,
    Admitted,
    Discharged,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Patient {
    pub id: Uuid,
    pub bed: String,
    pub display_name: String,
    pub age: i32,
    pub sex: String,
    pub esi: EsiLevel,
    pub chief_complaint: String,
    pub chief_complaint_icon: Option<String>,
    pub risk_score: i32,
    pub disposition_status: DispoStatus,
    pub sepsis_watch: bool,
    pub owner_role: super::user::UserRole,
    pub time_in: DateTime<Utc>,
    pub milestone_description: Option<String>,
    pub milestone_due_time: Option<DateTime<Utc>>,
    pub milestone_is_overdue: bool,
    pub ai_assist: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct RiskFlag {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub label: String,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PatientDto {
    #[serde(flatten)]
    pub patient: Patient,
    pub risk_flags: Vec<RiskFlag>,
    pub labs: Vec<LabDto>,
    pub imaging: Vec<ImagingDto>,
    pub consults: Vec<ConsultDto>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePatientRequest {
    pub bed: String,
    pub display_name: String,
    pub age: i32,
    pub sex: String,
    pub esi: String,
    pub chief_complaint: String,
    pub chief_complaint_icon: Option<String>,
    pub sepsis_watch: Option<bool>,
    pub owner_role: Option<String>,
    pub milestone_description: Option<String>,
    pub milestone_due_time: Option<DateTime<Utc>>,
    pub ai_assist: Option<String>,
    pub risk_flags: Option<Vec<CreateRiskFlagRequest>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRiskFlagRequest {
    pub label: String,
    pub severity: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePatientRequest {
    pub bed: Option<String>,
    pub esi: Option<String>,
    pub disposition_status: Option<String>,
    pub sepsis_watch: Option<bool>,
    pub owner_role: Option<String>,
    pub milestone_description: Option<String>,
    pub milestone_due_time: Option<DateTime<Utc>>,
    pub milestone_is_overdue: Option<bool>,
    pub ai_assist: Option<String>,
    pub risk_score: Option<i32>,
}
