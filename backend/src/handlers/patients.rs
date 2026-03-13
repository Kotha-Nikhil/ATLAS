use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::require_role;
use crate::models::patient::*;
use crate::models::user::{AuthUser, UserRole};
use crate::services::risk_scoring;
use crate::state::AppState;
use crate::validation;

pub async fn list_patients(
    State(state): State<AppState>,
) -> Result<Json<Vec<Patient>>, AppError> {
    let patients = sqlx::query_as::<_, Patient>(
        "SELECT * FROM patients WHERE disposition_status != 'discharged' ORDER BY risk_score DESC",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(patients))
}

pub async fn list_patients_full(
    State(state): State<AppState>,
) -> Result<Json<Vec<PatientDto>>, AppError> {
    let patients = sqlx::query_as::<_, Patient>(
        "SELECT * FROM patients WHERE disposition_status != 'discharged' ORDER BY risk_score DESC",
    )
    .fetch_all(&state.db)
    .await?;

    let patient_ids: Vec<Uuid> = patients.iter().map(|p| p.id).collect();

    let all_labs = sqlx::query_as::<_, crate::models::lab::Lab>(
        "SELECT * FROM labs WHERE patient_id = ANY($1) ORDER BY ordered_at",
    )
    .bind(&patient_ids)
    .fetch_all(&state.db)
    .await?;

    let all_imaging = sqlx::query_as::<_, crate::models::imaging::ImagingOrder>(
        "SELECT * FROM imaging_orders WHERE patient_id = ANY($1) ORDER BY ordered_at",
    )
    .bind(&patient_ids)
    .fetch_all(&state.db)
    .await?;

    let all_risk_flags = sqlx::query_as::<_, RiskFlag>(
        "SELECT * FROM risk_flags WHERE patient_id = ANY($1)",
    )
    .bind(&patient_ids)
    .fetch_all(&state.db)
    .await?;

    let all_consults = sqlx::query_as::<_, crate::models::consult::Consult>(
        "SELECT * FROM consults WHERE patient_id = ANY($1) ORDER BY called_at",
    )
    .bind(&patient_ids)
    .fetch_all(&state.db)
    .await?;

    let dtos: Vec<PatientDto> = patients
        .into_iter()
        .map(|p| {
            let pid = p.id;
            PatientDto {
                labs: all_labs.iter().filter(|l| l.patient_id == pid).cloned().collect(),
                imaging: all_imaging.iter().filter(|i| i.patient_id == pid).cloned().collect(),
                risk_flags: all_risk_flags.iter().filter(|f| f.patient_id == pid).cloned().collect(),
                consults: all_consults.iter().filter(|c| c.patient_id == pid).cloned().collect(),
                patient: p,
            }
        })
        .collect();

    Ok(Json(dtos))
}

pub async fn get_patient(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<PatientDto>, AppError> {
    let patient = sqlx::query_as::<_, Patient>("SELECT * FROM patients WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Patient {} not found", id)))?;

    let risk_flags = sqlx::query_as::<_, RiskFlag>("SELECT * FROM risk_flags WHERE patient_id = $1")
        .bind(id)
        .fetch_all(&state.db)
        .await?;

    let labs = sqlx::query_as::<_, crate::models::lab::Lab>("SELECT * FROM labs WHERE patient_id = $1 ORDER BY ordered_at")
        .bind(id)
        .fetch_all(&state.db)
        .await?;

    let imaging = sqlx::query_as::<_, crate::models::imaging::ImagingOrder>(
        "SELECT * FROM imaging_orders WHERE patient_id = $1 ORDER BY ordered_at",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let consults = sqlx::query_as::<_, crate::models::consult::Consult>(
        "SELECT * FROM consults WHERE patient_id = $1 ORDER BY called_at",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(PatientDto {
        patient,
        risk_flags,
        labs,
        imaging,
        consults,
    }))
}

pub async fn create_patient(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<CreatePatientRequest>,
) -> Result<Json<Patient>, AppError> {
    require_role(&auth_user, &UserRole::CHG)?;
    validation::validate_create_patient(&body)?;

    let esi: EsiLevel = match body.esi.as_str() {
        "1" => EsiLevel::One,
        "2" => EsiLevel::Two,
        "3" => EsiLevel::Three,
        "4" => EsiLevel::Four,
        "5" => EsiLevel::Five,
        _ => return Err(AppError::Validation("Invalid ESI level".into())),
    };

    let owner: UserRole = match body.owner_role.as_deref().unwrap_or("MD") {
        "MD" => UserRole::MD,
        "PA" => UserRole::PA,
        "RN" => UserRole::RN,
        "CHG" => UserRole::CHG,
        _ => UserRole::MD,
    };

    let patient = sqlx::query_as::<_, Patient>(
        r#"INSERT INTO patients (bed, display_name, age, sex, esi, chief_complaint, chief_complaint_icon,
            sepsis_watch, owner_role, milestone_description, milestone_due_time, ai_assist)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *"#,
    )
    .bind(&body.bed)
    .bind(&body.display_name)
    .bind(body.age)
    .bind(&body.sex)
    .bind(&esi)
    .bind(&body.chief_complaint)
    .bind(&body.chief_complaint_icon)
    .bind(body.sepsis_watch.unwrap_or(false))
    .bind(&owner)
    .bind(&body.milestone_description)
    .bind(&body.milestone_due_time)
    .bind(&body.ai_assist)
    .fetch_one(&state.db)
    .await?;

    if let Some(flags) = &body.risk_flags {
        for flag in flags {
            sqlx::query(
                "INSERT INTO risk_flags (patient_id, label, severity) VALUES ($1, $2, $3)",
            )
            .bind(patient.id)
            .bind(&flag.label)
            .bind(&flag.severity)
            .execute(&state.db)
            .await?;
        }
    }

    let score = risk_scoring::compute_risk_score(&patient, &state.db).await;
    sqlx::query("UPDATE patients SET risk_score = $1 WHERE id = $2")
        .bind(score)
        .bind(patient.id)
        .execute(&state.db)
        .await?;

    Ok(Json(patient))
}

pub async fn update_patient(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdatePatientRequest>,
) -> Result<Json<Patient>, AppError> {
    require_role(&auth_user, &UserRole::RN)?;

    let existing = sqlx::query_as::<_, Patient>("SELECT * FROM patients WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Patient {} not found", id)))?;

    let bed = body.bed.as_deref().unwrap_or(&existing.bed);
    let sepsis = body.sepsis_watch.unwrap_or(existing.sepsis_watch);
    let milestone_desc = body.milestone_description.as_deref().or(existing.milestone_description.as_deref());
    let milestone_due = body.milestone_due_time.or(existing.milestone_due_time);
    let milestone_overdue = body.milestone_is_overdue.unwrap_or(existing.milestone_is_overdue);
    let ai = body.ai_assist.as_deref().or(existing.ai_assist.as_deref());
    let score = body.risk_score.unwrap_or(existing.risk_score);

    let patient = sqlx::query_as::<_, Patient>(
        r#"UPDATE patients SET bed = $1, sepsis_watch = $2, milestone_description = $3,
           milestone_due_time = $4, milestone_is_overdue = $5, ai_assist = $6,
           risk_score = $7, updated_at = NOW()
           WHERE id = $8 RETURNING *"#,
    )
    .bind(bed)
    .bind(sepsis)
    .bind(milestone_desc)
    .bind(milestone_due)
    .bind(milestone_overdue)
    .bind(ai)
    .bind(score)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(patient))
}

pub async fn discharge_patient(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, &UserRole::MD)?;

    sqlx::query("UPDATE patients SET disposition_status = 'discharged', updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "message": "Patient discharged" })))
}
