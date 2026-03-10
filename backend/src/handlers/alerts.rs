use axum::{
    extract::{Path, State},
    Extension, Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::alert::Alert;
use crate::models::user::AuthUser;
use crate::state::AppState;

pub async fn list_alerts(
    State(state): State<AppState>,
) -> Result<Json<Vec<Alert>>, AppError> {
    let alerts = sqlx::query_as::<_, Alert>(
        "SELECT * FROM alerts WHERE dismissed = FALSE ORDER BY created_at DESC LIMIT 50",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(alerts))
}

pub async fn dismiss_alert(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(alert_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query(
        "UPDATE alerts SET dismissed = TRUE, dismissed_at = $1, dismissed_by = $2 WHERE id = $3",
    )
    .bind(Utc::now())
    .bind(auth_user.id)
    .bind(alert_id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "message": "Alert dismissed" })))
}
