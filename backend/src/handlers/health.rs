use axum::{extract::State, Json};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub database: &'static str,
}

pub async fn health(
    State(state): State<AppState>,
) -> Json<HealthResponse> {
    let db_ok = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();

    Json(HealthResponse {
        status: if db_ok { "healthy" } else { "degraded" },
        database: if db_ok { "connected" } else { "disconnected" },
    })
}
