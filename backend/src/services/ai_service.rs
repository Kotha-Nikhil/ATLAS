use uuid::Uuid;

use crate::error::AppError;
use crate::models::patient::Patient;
use crate::state::AppState;

pub async fn get_suggestion(state: &AppState, patient_id: Uuid) -> Result<String, AppError> {
    let patient = sqlx::query_as::<_, Patient>("SELECT * FROM patients WHERE id = $1")
        .bind(patient_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Patient not found".into()))?;

    if let Some(ref api_key) = state.config.anthropic_api_key {
        if !api_key.is_empty() && api_key != "your-key-here" {
            return call_claude(api_key, &format!(
                "You are an ED physician assistant AI. Given this patient: {} ({}{}, ESI {}, CC: {}), provide a brief workflow suggestion in 1-2 sentences.",
                patient.display_name,
                patient.age,
                patient.sex,
                format!("{:?}", patient.esi),
                patient.chief_complaint,
            )).await;
        }
    }

    Ok(generate_deterministic_suggestion(&patient))
}

pub async fn get_top5_summary(state: &AppState) -> Result<String, AppError> {
    let patients = sqlx::query_as::<_, Patient>(
        "SELECT * FROM patients WHERE disposition_status = 'active' ORDER BY risk_score DESC LIMIT 5",
    )
    .fetch_all(&state.db)
    .await?;

    let mut summary = String::from("Top 5 Sickest Patients:\n\n");
    for (i, p) in patients.iter().enumerate() {
        summary.push_str(&format!(
            "{}. {} (Bed {}) — {} | ESI {:?} | Score: {}\n   {}\n\n",
            i + 1,
            p.display_name,
            p.bed,
            p.chief_complaint,
            p.esi,
            p.risk_score,
            generate_deterministic_suggestion(p),
        ));
    }

    Ok(summary)
}

pub async fn get_handoff_summary(state: &AppState) -> Result<String, AppError> {
    let patients = sqlx::query_as::<_, Patient>(
        "SELECT * FROM patients WHERE disposition_status = 'active' AND bed != 'WR' ORDER BY risk_score DESC",
    )
    .fetch_all(&state.db)
    .await?;

    let mut summary = String::from("SHIFT HANDOFF SUMMARY\n\n");
    for p in &patients {
        let status = if p.sepsis_watch { " ⚠ SEPSIS WATCH" } else { "" };
        summary.push_str(&format!(
            "Bed {} — {} ({}{}) ESI {:?}{}\n  CC: {}\n  Next: {}\n\n",
            p.bed,
            p.display_name,
            p.age,
            p.sex,
            p.esi,
            status,
            p.chief_complaint,
            p.milestone_description.as_deref().unwrap_or("—"),
        ));
    }

    Ok(summary)
}

fn generate_deterministic_suggestion(patient: &Patient) -> String {
    let complaint = patient.chief_complaint.to_lowercase();

    if patient.sepsis_watch {
        return "Check sepsis bundle compliance — lactate trend, antibiotics timing, fluid resuscitation status".into();
    }

    if complaint.contains("chest pain") || complaint.contains("sob") {
        return "Auto-check delta trops — consider serial troponin protocol and EKG comparison".into();
    }
    if complaint.contains("syncope") {
        return "Auto-check delta trops — rule out cardiac syncope, ensure orthostatics documented".into();
    }
    if complaint.contains("neuro") || complaint.contains("ams") {
        return "\"What's pending?\" escalation — CT head read, lactate trend, neuro consult status".into();
    }
    if complaint.contains("gi bleed") {
        return "Draft order bundle + timer — type & screen priority, GI consult, hemoglobin trend".into();
    }
    if complaint.contains("fall") || complaint.contains("hip") {
        return "\"What's pending?\" escalation — imaging read status, ortho consult timeline".into();
    }
    if complaint.contains("copd") {
        return "Draft admission order set — respiratory therapy, steroid protocol".into();
    }
    if complaint.contains("laceration") {
        return "Procedure note + AVS draft — wound care instructions, tetanus status".into();
    }

    "Predict fastest dispos — assess discharge readiness".into()
}

async fn call_claude(api_key: &str, prompt: &str) -> Result<String, AppError> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 150,
            "messages": [{ "role": "user", "content": prompt }]
        }))
        .send()
        .await
        .map_err(|e| AppError::External(format!("Claude API error: {}", e)))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::External(format!("Claude response parse error: {}", e)))?;

    let text = body["content"][0]["text"]
        .as_str()
        .unwrap_or("No suggestion available")
        .to_string();

    Ok(text)
}
