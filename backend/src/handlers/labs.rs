use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::lab::*;
use crate::state::AppState;
use crate::validation;
use crate::ws::broadcaster::WsEvent;

pub async fn list_labs(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<Vec<Lab>>, AppError> {
    let labs = sqlx::query_as::<_, Lab>(
        "SELECT * FROM labs WHERE patient_id = $1 ORDER BY ordered_at",
    )
    .bind(patient_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(labs))
}

pub async fn create_lab(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
    Json(body): Json<CreateLabRequest>,
) -> Result<Json<Lab>, AppError> {
    validation::validate_create_lab(&body)?;

    let lab = sqlx::query_as::<_, Lab>(
        r#"INSERT INTO labs (patient_id, name, alert_threshold)
           VALUES ($1, $2, $3) RETURNING *"#,
    )
    .bind(patient_id)
    .bind(&body.name)
    .bind(&body.alert_threshold)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(lab))
}

pub async fn update_lab(
    State(state): State<AppState>,
    Path((patient_id, lab_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateLabRequest>,
) -> Result<Json<Lab>, AppError> {
    let existing = sqlx::query_as::<_, Lab>("SELECT * FROM labs WHERE id = $1 AND patient_id = $2")
        .bind(lab_id)
        .bind(patient_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Lab not found".into()))?;

    let is_critical = body.is_critical.unwrap_or(existing.is_critical);
    let value = body.value.as_deref().or(existing.value.as_deref());
    let resulted_at = if body.value.is_some() { Some(Utc::now()) } else { existing.resulted_at };
    let status_str = body.status.as_deref().unwrap_or("resulted");

    let lab = sqlx::query_as::<_, Lab>(
        r#"UPDATE labs SET value = $1, is_critical = $2, resulted_at = $3, status = $4::lab_status
           WHERE id = $5 RETURNING *"#,
    )
    .bind(value)
    .bind(is_critical)
    .bind(resulted_at)
    .bind(status_str)
    .bind(lab_id)
    .fetch_one(&state.db)
    .await?;

    state.ws_tx.send(WsEvent::LabResulted {
        patient_id,
        lab: lab.clone(),
        is_critical,
    }).ok();

    Ok(Json(lab))
}
