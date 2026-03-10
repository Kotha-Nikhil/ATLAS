use serde::Serialize;
use uuid::Uuid;

use crate::models::alert::AlertDto;
use crate::models::imaging::ImagingDto;
use crate::models::lab::LabDto;
use crate::models::patient::PatientDto;

#[derive(Debug, Clone, Serialize)]
pub struct MetricsDto {
    pub patients_in: i64,
    pub esi12_count: i64,
    pub waiting_count: i64,
    pub pending_dispo_count: i64,
    pub door_to_doc_minutes: i64,
    pub lwbs_risk: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsEvent {
    LabResulted {
        patient_id: Uuid,
        lab: LabDto,
        is_critical: bool,
    },
    ImagingUpdated {
        patient_id: Uuid,
        imaging: ImagingDto,
    },
    NewPatient {
        patient: PatientDto,
    },
    HighAcuityArrival {
        patient: PatientDto,
        bed: String,
    },
    AlertFired {
        alert: AlertDto,
    },
    SepsisEscalation {
        patient_id: Uuid,
        message: String,
        urgency: String,
    },
    MetricsUpdated {
        metrics: MetricsDto,
    },
    Tick {
        timestamp: String,
    },
}
