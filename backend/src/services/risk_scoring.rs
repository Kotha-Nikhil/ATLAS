use sqlx::PgPool;

use crate::models::patient::Patient;

pub async fn compute_risk_score(patient: &Patient, db: &PgPool) -> i32 {
    let mut score: i32 = 0;

    // ESI contribution
    score += match &patient.esi {
        crate::models::patient::EsiLevel::One => 40,
        crate::models::patient::EsiLevel::Two => 30,
        crate::models::patient::EsiLevel::Three => 15,
        crate::models::patient::EsiLevel::Four => 5,
        crate::models::patient::EsiLevel::Five => 0,
    };

    if patient.sepsis_watch {
        score += 25;
    }

    if patient.milestone_is_overdue {
        score += 10;
    }

    let flags: Vec<(String,)> =
        sqlx::query_as("SELECT severity FROM risk_flags WHERE patient_id = $1")
            .bind(patient.id)
            .fetch_all(db)
            .await
            .unwrap_or_default();

    for (severity,) in &flags {
        score += match severity.as_str() {
            "critical" => 15,
            "high" => 8,
            "watch" => 3,
            _ => 0,
        };
    }

    let critical_labs: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM labs WHERE patient_id = $1 AND is_critical = TRUE",
    )
    .bind(patient.id)
    .fetch_one(db)
    .await
    .unwrap_or((0,));

    score += (critical_labs.0 * 10) as i32;

    score.min(100)
}
