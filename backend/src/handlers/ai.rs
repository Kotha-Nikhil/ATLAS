use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::services::ai_service;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct AiSuggestRequest {
    pub patient_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct AiResponse {
    pub suggestion: String,
}

pub async fn suggest(
    State(state): State<AppState>,
    Json(body): Json<AiSuggestRequest>,
) -> Result<Json<AiResponse>, AppError> {
    let suggestion = ai_service::get_suggestion(&state, body.patient_id).await?;
    Ok(Json(AiResponse { suggestion }))
}

pub async fn top5(
    State(state): State<AppState>,
) -> Result<Json<AiResponse>, AppError> {
    let suggestion = ai_service::get_top5_summary(&state).await?;
    Ok(Json(AiResponse { suggestion }))
}

pub async fn handoff(
    State(state): State<AppState>,
) -> Result<Json<AiResponse>, AppError> {
    let suggestion = ai_service::get_handoff_summary(&state).await?;
    Ok(Json(AiResponse { suggestion }))
}
