use chrono::Utc;
use tokio::time::{sleep, Duration};
use uuid::Uuid;

use crate::state::AppState;
use crate::ws::broadcaster::WsEvent;

pub async fn run(state: AppState) {
    loop {
        sleep(Duration::from_secs(20)).await;
        if let Err(e) = scan_alerts(&state).await {
            tracing::warn!("Alert engine error: {:?}", e);
        }
    }
}

async fn scan_alerts(state: &AppState) -> Result<(), sqlx::Error> {
    scan_unread_imaging(state).await?;
    scan_overdue_milestones(state).await?;
    Ok(())
}

async fn scan_unread_imaging(state: &AppState) -> Result<(), sqlx::Error> {
    let unread: Vec<(Uuid, Uuid, String, String, String, i32, chrono::DateTime<Utc>)> = sqlx::query_as(
        r#"SELECT io.id, io.patient_id, io.imaging_type, p.display_name, p.bed, io.alert_if_unread_minutes, io.ordered_at
           FROM imaging_orders io JOIN patients p ON io.patient_id = p.id
           WHERE io.status = 'complete' AND io.read_at IS NULL
           AND p.disposition_status = 'active'"#,
    )
    .fetch_all(&state.db)
    .await?;

    for (_img_id, patient_id, img_type, name, bed, threshold, ordered_at) in unread {
        let minutes = (Utc::now() - ordered_at).num_minutes();
        if minutes < threshold as i64 {
            continue;
        }

        let urgency = if minutes >= 60 {
            "emergency"
        } else if minutes >= 45 {
            "critical"
        } else {
            "warning"
        };

        let msg = format!("{} UNREAD {}m — {} Bed {}", img_type, minutes, name, bed);

        let existing: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM alerts WHERE patient_id = $1 AND alert_type = 'unread-imaging' AND dismissed = FALSE AND message LIKE $2",
        )
        .bind(patient_id)
        .bind(format!("{}%", img_type))
        .fetch_one(&state.db)
        .await?;

        if existing.0 == 0 {
            let alert_id: (Uuid,) = sqlx::query_as(
                r#"INSERT INTO alerts (patient_id, bed, message, urgency, alert_type)
                   VALUES ($1, $2, $3, $4::alert_urgency, 'unread-imaging'::alert_type)
                   RETURNING id"#,
            )
            .bind(patient_id)
            .bind(&bed)
            .bind(&msg)
            .bind(urgency)
            .fetch_one(&state.db)
            .await?;

            let alert = sqlx::query_as::<_, crate::models::alert::Alert>(
                "SELECT * FROM alerts WHERE id = $1",
            )
            .bind(alert_id.0)
            .fetch_one(&state.db)
            .await?;

            state.ws_tx.send(WsEvent::AlertFired { alert }).ok();
        } else {
            sqlx::query(
                "UPDATE alerts SET message = $1, urgency = $2::alert_urgency WHERE patient_id = $3 AND alert_type = 'unread-imaging' AND dismissed = FALSE AND message LIKE $4",
            )
            .bind(&msg)
            .bind(urgency)
            .bind(patient_id)
            .bind(format!("{}%", img_type))
            .execute(&state.db)
            .await?;
        }
    }

    Ok(())
}

async fn scan_overdue_milestones(state: &AppState) -> Result<(), sqlx::Error> {
    let overdue: Vec<(Uuid, String, String, Option<String>, chrono::DateTime<Utc>)> = sqlx::query_as(
        r#"SELECT id, display_name, bed, milestone_description, milestone_due_time
           FROM patients
           WHERE milestone_is_overdue = TRUE AND disposition_status = 'active'
           AND milestone_due_time IS NOT NULL"#,
    )
    .fetch_all(&state.db)
    .await?;

    for (patient_id, _name, bed, desc, due_time) in overdue {
        let minutes = (Utc::now() - due_time).num_minutes();
        if minutes <= 30 {
            continue;
        }

        let urgency = if minutes >= 60 { "emergency" } else { "critical" };
        let desc_str = desc.as_deref().unwrap_or("milestone");
        let msg = format!("Milestone OVERDUE {}m — {}", minutes, desc_str);

        let existing: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM alerts WHERE patient_id = $1 AND alert_type = 'overdue-milestone' AND dismissed = FALSE",
        )
        .bind(patient_id)
        .fetch_one(&state.db)
        .await?;

        if existing.0 == 0 {
            let alert_id: (Uuid,) = sqlx::query_as(
                r#"INSERT INTO alerts (patient_id, bed, message, urgency, alert_type)
                   VALUES ($1, $2, $3, $4::alert_urgency, 'overdue-milestone'::alert_type)
                   RETURNING id"#,
            )
            .bind(patient_id)
            .bind(&bed)
            .bind(&msg)
            .bind(urgency)
            .fetch_one(&state.db)
            .await?;

            let alert = sqlx::query_as::<_, crate::models::alert::Alert>(
                "SELECT * FROM alerts WHERE id = $1",
            )
            .bind(alert_id.0)
            .fetch_one(&state.db)
            .await?;

            state.ws_tx.send(WsEvent::AlertFired { alert }).ok();
        } else {
            sqlx::query(
                "UPDATE alerts SET message = $1, urgency = $2::alert_urgency WHERE patient_id = $3 AND alert_type = 'overdue-milestone' AND dismissed = FALSE",
            )
            .bind(&msg)
            .bind(urgency)
            .bind(patient_id)
            .execute(&state.db)
            .await?;
        }
    }

    Ok(())
}
