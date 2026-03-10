use axum::{extract::State, Json};

use crate::error::AppError;
use crate::state::AppState;
use crate::ws::broadcaster::MetricsDto;

pub async fn get_metrics(
    State(state): State<AppState>,
) -> Result<Json<MetricsDto>, AppError> {
    let patients_in: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM patients WHERE bed != 'WR' AND disposition_status != 'discharged'",
    )
    .fetch_one(&state.db)
    .await?;

    let esi12: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM patients WHERE esi IN ('1','2') AND disposition_status != 'discharged'",
    )
    .fetch_one(&state.db)
    .await?;

    let waiting: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM patients WHERE bed = 'WR' AND disposition_status != 'discharged'",
    )
    .fetch_one(&state.db)
    .await?;

    let pending_dispo: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM patients WHERE disposition_status = 'dispo-ready'",
    )
    .fetch_one(&state.db)
    .await?;

    let avg_minutes: (Option<f64>,) = sqlx::query_as(
        "SELECT AVG(EXTRACT(EPOCH FROM (NOW() - time_in)) / 60) FROM patients WHERE bed != 'WR' AND disposition_status != 'discharged'",
    )
    .fetch_one(&state.db)
    .await?;

    let door_to_doc = avg_minutes.0.unwrap_or(0.0) as i64;

    let lwbs_risk = if waiting.0 > 5 || door_to_doc > 60 {
        "HIGH"
    } else if waiting.0 > 3 || door_to_doc > 30 {
        "MED"
    } else {
        "LOW"
    };

    Ok(Json(MetricsDto {
        patients_in: patients_in.0,
        esi12_count: esi12.0,
        waiting_count: waiting.0,
        pending_dispo_count: pending_dispo.0,
        door_to_doc_minutes: door_to_doc,
        lwbs_risk: lwbs_risk.to_string(),
    }))
}
