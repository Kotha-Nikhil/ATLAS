use chrono::Utc;
use rand::Rng;
use tokio::time::{sleep, Duration};
use uuid::Uuid;

use crate::state::AppState;
use crate::ws::broadcaster::WsEvent;

const WR_NAMES: &[&str] = &["N.B.", "R.G.", "Q.W.", "F.K.", "V.L.", "Z.P.", "O.S."];
const WR_COMPLAINTS: &[(&str, &str)] = &[
    ("URI symptoms", "🤧"),
    ("Low back pain", "🦴"),
    ("Ankle pain", "🦶"),
    ("Rash", "🔴"),
    ("Earache", "👂"),
    ("Chest tightness", "🫀"),
    ("Shortness of breath", "🫁"),
];

const HIGH_ACUITY: &[(&str, &str, &str)] = &[
    ("Chest pain / diaphoresis", "🫀", "ACS/PE"),
    ("Seizure / postictal", "🧠", "SEIZURE"),
    ("Respiratory distress", "🫁", "RESP FAILURE"),
    ("Hypotension / shock", "💉", "SHOCK"),
];

pub async fn run(state: AppState) {
    tokio::join!(
        run_lab_timer(state.clone()),
        run_imaging_timer(state.clone()),
        run_arrival_timer(state.clone()),
        run_milestone_ticker(state.clone()),
        run_sepsis_escalation(state.clone()),
    );
}

async fn run_lab_timer(state: AppState) {
    loop {
        let delay = rand::thread_rng().gen_range(45..=90);
        sleep(Duration::from_secs(delay)).await;
        if let Err(e) = result_pending_lab(&state).await {
            tracing::warn!("Lab timer error: {:?}", e);
        }
    }
}

async fn run_imaging_timer(state: AppState) {
    loop {
        let delay = rand::thread_rng().gen_range(30..=60);
        sleep(Duration::from_secs(delay)).await;
        if let Err(e) = advance_imaging(&state).await {
            tracing::warn!("Imaging timer error: {:?}", e);
        }
    }
}

async fn run_arrival_timer(state: AppState) {
    let mut counter: u32 = 100;
    loop {
        let delay = rand::thread_rng().gen_range(60..=120);
        sleep(Duration::from_secs(delay)).await;
        counter += 1;
        let is_high_acuity = rand::thread_rng().gen_bool(0.2);
        if is_high_acuity {
            if let Err(e) = add_high_acuity_patient(&state, counter).await {
                tracing::warn!("High acuity arrival error: {:?}", e);
            }
        } else {
            if let Err(e) = add_waiting_room_patient(&state, counter).await {
                tracing::warn!("WR arrival error: {:?}", e);
            }
        }
    }
}

async fn run_milestone_ticker(state: AppState) {
    loop {
        sleep(Duration::from_secs(10)).await;

        let _ = sqlx::query(
            "UPDATE patients SET milestone_is_overdue = TRUE WHERE milestone_due_time < NOW() AND milestone_is_overdue = FALSE AND disposition_status = 'active'"
        )
        .execute(&state.db)
        .await;

        state.ws_tx.send(WsEvent::Tick {
            timestamp: Utc::now().to_rfc3339(),
        }).ok();
    }
}

async fn run_sepsis_escalation(state: AppState) {
    loop {
        sleep(Duration::from_secs(60)).await;

        let patients: Vec<(Uuid, String, String, chrono::DateTime<Utc>)> = sqlx::query_as(
            "SELECT id, display_name, bed, time_in FROM patients WHERE sepsis_watch = TRUE AND disposition_status = 'active'"
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        for (pid, _name, bed, time_in) in patients {
            let minutes = (Utc::now() - time_in).num_minutes();
            let urgency = if minutes >= 60 { "emergency" } else { "warning" };
            let message = if urgency == "emergency" {
                format!("EMERGENCY — Sepsis bundle {}m overdue", minutes)
            } else {
                format!("Sepsis bundle overdue — {} min", minutes)
            };

            let _ = sqlx::query(
                r#"INSERT INTO alerts (patient_id, bed, message, urgency, alert_type)
                   VALUES ($1, $2, $3, $4::alert_urgency, 'sepsis-escalation'::alert_type)"#,
            )
            .bind(pid)
            .bind(&bed)
            .bind(&message)
            .bind(urgency)
            .execute(&state.db)
            .await;

            state.ws_tx.send(WsEvent::SepsisEscalation {
                patient_id: pid,
                message: message.clone(),
                urgency: urgency.to_string(),
            }).ok();
        }
    }
}

async fn result_pending_lab(state: &AppState) -> Result<(), sqlx::Error> {
    let lab: Option<(Uuid, Uuid, String, String, Option<String>)> = sqlx::query_as(
        r#"SELECT l.id, l.patient_id, l.name, p.display_name, p.bed
           FROM labs l JOIN patients p ON l.patient_id = p.id
           WHERE l.resulted_at IS NULL AND p.disposition_status = 'active'
           ORDER BY l.ordered_at LIMIT 1"#,
    )
    .fetch_optional(&state.db)
    .await?;

    let (lab_id, patient_id, lab_name, patient_name, bed) = match lab {
        Some(l) => l,
        None => return Ok(()),
    };

    let roll: f64 = rand::thread_rng().gen();
    let (value, is_critical) = determine_lab_result(&lab_name, roll);

    let resulted = sqlx::query_as::<_, crate::models::lab::Lab>(
        "UPDATE labs SET value = $1, is_critical = $2, resulted_at = NOW(), status = 'resulted' WHERE id = $3 RETURNING *",
    )
    .bind(&value)
    .bind(is_critical)
    .bind(lab_id)
    .fetch_one(&state.db)
    .await?;

    state.ws_tx.send(WsEvent::LabResulted {
        patient_id,
        lab: resulted,
        is_critical,
    }).ok();

    if is_critical {
        let protocol = get_critical_protocol(&lab_name);
        let msg = format!("CRITICAL: {} = {}{} — {} Bed {}",
            lab_name, value, protocol, patient_name, bed.as_deref().unwrap_or("?"));

        let _ = sqlx::query(
            r#"INSERT INTO alerts (patient_id, bed, message, urgency, alert_type)
               VALUES ($1, $2, $3, 'critical'::alert_urgency, 'critical-lab'::alert_type)"#,
        )
        .bind(patient_id)
        .bind(bed.as_deref().unwrap_or("?"))
        .bind(&msg)
        .execute(&state.db)
        .await;
    }

    Ok(())
}

fn determine_lab_result(lab_name: &str, roll: f64) -> (String, bool) {
    let lower = lab_name.to_lowercase();
    let category = if roll < 0.7 { "normal" } else if roll < 0.9 { "abnormal" } else { "critical" };

    if lower.contains("troponin") {
        match category {
            "critical" => ("0.12".into(), true),
            "abnormal" => ("0.03".into(), false),
            _ => ("0.01".into(), false),
        }
    } else if lower.contains("lactate") {
        match category {
            "critical" => ("5.1".into(), true),
            "abnormal" => ("1.8".into(), false),
            _ => ("1.2".into(), false),
        }
    } else if lower.contains("d-dimer") {
        match category {
            "critical" => ("1250".into(), true),
            "abnormal" => ("480".into(), false),
            _ => ("320".into(), false),
        }
    } else if lower.contains("inr") {
        match category {
            "critical" => ("4.1".into(), true),
            "abnormal" => ("2.5".into(), false),
            _ => ("1.1".into(), false),
        }
    } else if lower.contains("hemoglobin") || lower.contains("hgb") {
        match category {
            "critical" => ("6.2".into(), true),
            "abnormal" => ("9.5".into(), false),
            _ => ("13.4".into(), false),
        }
    } else {
        match category {
            "abnormal" => ("ABN".into(), false),
            _ => ("WNL".into(), false),
        }
    }
}

fn get_critical_protocol(lab_name: &str) -> &'static str {
    let lower = lab_name.to_lowercase();
    if lower.contains("troponin") { " — ACS protocol" }
    else if lower.contains("lactate") { " — sepsis bundle" }
    else if lower.contains("d-dimer") { " — CT PE protocol" }
    else if lower.contains("inr") { " — anticoag reversal" }
    else if lower.contains("hemoglobin") || lower.contains("hgb") { " — transfusion threshold" }
    else { "" }
}

async fn advance_imaging(state: &AppState) -> Result<(), sqlx::Error> {
    let order: Option<(Uuid, Uuid, String)> = sqlx::query_as(
        r#"SELECT io.id, io.patient_id, io.status::TEXT
           FROM imaging_orders io JOIN patients p ON io.patient_id = p.id
           WHERE io.status IN ('ordered', 'in-scanner', 'complete')
           AND p.disposition_status = 'active'
           ORDER BY io.ordered_at LIMIT 1"#,
    )
    .fetch_optional(&state.db)
    .await?;

    let (img_id, patient_id, current_status) = match order {
        Some(o) => o,
        None => return Ok(()),
    };

    let next_status = match current_status.as_str() {
        "ordered" => "in-scanner",
        "in-scanner" => "complete",
        "complete" => "read",
        _ => return Ok(()),
    };

    let read_at = if next_status == "read" { Some(Utc::now()) } else { None };

    let updated = sqlx::query_as::<_, crate::models::imaging::ImagingOrder>(
        "UPDATE imaging_orders SET status = $1::imaging_status, read_at = COALESCE($2, read_at) WHERE id = $3 RETURNING *",
    )
    .bind(next_status)
    .bind(read_at)
    .bind(img_id)
    .fetch_one(&state.db)
    .await?;

    state.ws_tx.send(WsEvent::ImagingUpdated {
        patient_id,
        imaging: updated,
    }).ok();

    Ok(())
}

async fn add_waiting_room_patient(state: &AppState, counter: u32) -> Result<(), sqlx::Error> {
    let idx = counter as usize;
    let name = WR_NAMES[idx % WR_NAMES.len()];
    let (complaint, icon) = WR_COMPLAINTS[idx % WR_COMPLAINTS.len()];
    let (age, sex, esi) = {
        let mut rng = rand::thread_rng();
        let age = rng.gen_range(20..70);
        let sex = if rng.gen_bool(0.5) { "M" } else { "F" };
        let esi = if rng.gen_bool(0.7) { "4" } else { "5" };
        (age, sex, esi)
    };

    let milestone_due = Utc::now() + chrono::Duration::minutes(30);

    let _patient = sqlx::query(
        r#"INSERT INTO patients (bed, display_name, age, sex, esi, chief_complaint, chief_complaint_icon,
           milestone_description, milestone_due_time, owner_role, ai_assist, risk_score)
           VALUES ('WR', $1, $2, $3, $4::esi_level, $5, $6, 'Awaiting bed assignment', $7, 'RN', 'Predict fastest dispos', 5)"#,
    )
    .bind(name)
    .bind(age)
    .bind(sex)
    .bind(esi)
    .bind(complaint)
    .bind(icon)
    .bind(milestone_due)
    .execute(&state.db)
    .await?;

    state.ws_tx.send(WsEvent::Tick {
        timestamp: Utc::now().to_rfc3339(),
    }).ok();

    Ok(())
}

async fn add_high_acuity_patient(state: &AppState, counter: u32) -> Result<(), sqlx::Error> {
    let idx = counter as usize;
    let (complaint, icon, flag_label) = HIGH_ACUITY[idx % HIGH_ACUITY.len()];
    let name = WR_NAMES[idx % WR_NAMES.len()];
    let bed = format!("{}", 20 + (counter % 20));
    let (age, sex, esi) = {
        let mut rng = rand::thread_rng();
        let age = rng.gen_range(40..80);
        let sex = if rng.gen_bool(0.5) { "M" } else { "F" };
        let esi = if rng.gen_bool(0.5) { "1" } else { "2" };
        (age, sex, esi)
    };
    let milestone_due = Utc::now() + chrono::Duration::minutes(15);

    let patient_id: (Uuid,) = sqlx::query_as(
        r#"INSERT INTO patients (bed, display_name, age, sex, esi, chief_complaint, chief_complaint_icon,
           milestone_description, milestone_due_time, owner_role, ai_assist, risk_score)
           VALUES ($1, $2, $3, $4, $5::esi_level, $6, $7, 'Initial workup + stabilization', $8, 'MD', 'Escalation pathway review', 80)
           RETURNING id"#,
    )
    .bind(&bed)
    .bind(name)
    .bind(age)
    .bind(sex)
    .bind(esi)
    .bind(complaint)
    .bind(icon)
    .bind(milestone_due)
    .fetch_one(&state.db)
    .await?;

    sqlx::query("INSERT INTO risk_flags (patient_id, label, severity) VALUES ($1, $2, 'critical')")
        .bind(patient_id.0)
        .bind(flag_label)
        .execute(&state.db)
        .await?;

    for lab_name in &["CBC", "BMP", "Troponin"] {
        sqlx::query("INSERT INTO labs (patient_id, name) VALUES ($1, $2)")
            .bind(patient_id.0)
            .bind(lab_name)
            .execute(&state.db)
            .await?;
    }

    let msg = format!("HIGH ACUITY ARRIVAL — {} — Bed {}", complaint, bed);
    let _ = sqlx::query(
        r#"INSERT INTO alerts (patient_id, bed, message, urgency, alert_type)
           VALUES ($1, $2, $3, 'emergency'::alert_urgency, 'high-acuity-arrival'::alert_type)"#,
    )
    .bind(patient_id.0)
    .bind(&bed)
    .bind(&msg)
    .execute(&state.db)
    .await;

    Ok(())
}
