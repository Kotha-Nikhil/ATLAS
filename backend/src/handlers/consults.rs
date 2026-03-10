use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::consult::*;
use crate::validation;
use crate::state::AppState;

pub async fn list_consults(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<Vec<Consult>>, AppError> {
    let consults = sqlx::query_as::<_, Consult>(
        "SELECT * FROM consults WHERE patient_id = $1 ORDER BY called_at",
    )
    .bind(patient_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(consults))
}

pub async fn create_consult(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
    Json(body): Json<CreateConsultRequest>,
) -> Result<Json<Consult>, AppError> {
    let consult = sqlx::query_as::<_, Consult>(
        "INSERT INTO consults (patient_id, specialty) VALUES ($1, $2) RETURNING *",
    )
    .bind(patient_id)
    .bind(&body.specialty)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(consult))
}

pub async fn update_consult(
    State(state): State<AppState>,
    Path((patient_id, consult_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateConsultRequest>,
) -> Result<Json<Consult>, AppError> {
    let status_str = body.status.as_deref().unwrap_or("called");

    let consult = sqlx::query_as::<_, Consult>(
        r#"UPDATE consults SET status = $1::consult_status, callback_at = COALESCE($2, callback_at)
           WHERE id = $3 AND patient_id = $4 RETURNING *"#,
    )
    .bind(status_str)
    .bind(body.callback_at)
    .bind(consult_id)
    .bind(patient_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Consult not found".into()))?;

    Ok(Json(consult))
}
