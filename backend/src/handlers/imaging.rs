use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::error::AppError;
use crate::validation;
use crate::models::imaging::*;
use crate::state::AppState;
use crate::ws::broadcaster::WsEvent;

pub async fn list_imaging(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<Vec<ImagingOrder>>, AppError> {
    let orders = sqlx::query_as::<_, ImagingOrder>(
        "SELECT * FROM imaging_orders WHERE patient_id = $1 ORDER BY ordered_at",
    )
    .bind(patient_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(orders))
}

pub async fn create_imaging(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
    Json(body): Json<CreateImagingRequest>,
) -> Result<Json<ImagingOrder>, AppError> {
    validation::validate_create_imaging(&body)?;

    let order = sqlx::query_as::<_, ImagingOrder>(
        r#"INSERT INTO imaging_orders (patient_id, imaging_type, alert_if_unread_minutes)
           VALUES ($1, $2, $3) RETURNING *"#,
    )
    .bind(patient_id)
    .bind(&body.imaging_type)
    .bind(body.alert_if_unread_minutes.unwrap_or(30))
    .fetch_one(&state.db)
    .await?;

    Ok(Json(order))
}

pub async fn update_imaging(
    State(state): State<AppState>,
    Path((patient_id, img_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateImagingRequest>,
) -> Result<Json<ImagingOrder>, AppError> {
    let status_str = body.status.as_deref().unwrap_or("complete");
    let read_at = if status_str == "read" { Some(Utc::now()) } else { None };

    let order = sqlx::query_as::<_, ImagingOrder>(
        r#"UPDATE imaging_orders SET status = $1::imaging_status, read_at = COALESCE($2, read_at)
           WHERE id = $3 AND patient_id = $4 RETURNING *"#,
    )
    .bind(status_str)
    .bind(read_at)
    .bind(img_id)
    .bind(patient_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Imaging order not found".into()))?;

    state.ws_tx.send(WsEvent::ImagingUpdated {
        patient_id,
        imaging: order.clone(),
    }).ok();

    Ok(Json(order))
}
