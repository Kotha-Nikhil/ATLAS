use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::models::user::AuthUser;
use crate::state::AppState;

fn route_to_action(method: &str, path: &str) -> (&'static str, &'static str) {
    match (method, path) {
        ("GET", p) if p.starts_with("/api/patients") && p.contains("/labs") => ("VIEW_LABS", "labs"),
        ("POST", p) if p.contains("/labs") => ("CREATE_LAB", "labs"),
        ("PUT", p) if p.contains("/labs") => ("UPDATE_LAB", "labs"),
        ("GET", p) if p.starts_with("/api/patients") && p.contains("/imaging") => ("VIEW_IMAGING", "imaging"),
        ("POST", p) if p.contains("/imaging") => ("CREATE_IMAGING", "imaging"),
        ("PUT", p) if p.contains("/imaging") => ("UPDATE_IMAGING", "imaging"),
        ("GET", p) if p.starts_with("/api/patients") && p.contains("/consults") => ("VIEW_CONSULTS", "consults"),
        ("POST", p) if p.contains("/consults") => ("CREATE_CONSULT", "consults"),
        ("PUT", p) if p.contains("/consults") => ("UPDATE_CONSULT", "consults"),
        ("GET", "/api/patients") => ("VIEW_PATIENT_LIST", "patients"),
        ("GET", p) if p.starts_with("/api/patients/") => ("VIEW_PATIENT", "patients"),
        ("POST", "/api/patients") => ("CREATE_PATIENT", "patients"),
        ("PUT", p) if p.starts_with("/api/patients/") => ("UPDATE_PATIENT", "patients"),
        ("DELETE", p) if p.starts_with("/api/patients/") => ("DISCHARGE_PATIENT", "patients"),
        ("GET", "/api/alerts") => ("VIEW_ALERTS", "alerts"),
        ("POST", p) if p.contains("/dismiss") => ("DISMISS_ALERT", "alerts"),
        ("GET", "/api/metrics") => ("VIEW_METRICS", "metrics"),
        ("POST", p) if p.starts_with("/api/ai") => ("AI_REQUEST", "ai"),
        _ => ("OTHER", "unknown"),
    }
}

pub async fn audit_log(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Response {
    let method = req.method().to_string();
    let path = req.uri().path().to_string();
    let ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    let ua = req
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let auth_user = req.extensions().get::<AuthUser>().cloned();

    let response = next.run(req).await;
    let success = response.status().is_success();

    let (action, resource) = route_to_action(&method, &path);

    if let Some(user) = auth_user {
        let _ = sqlx::query(
            r#"INSERT INTO audit_log (user_id, user_email, action, resource, ip_address, user_agent, success)
               VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
        )
        .bind(user.id)
        .bind(&user.email)
        .bind(action)
        .bind(resource)
        .bind(&ip)
        .bind(&ua)
        .bind(success)
        .execute(&state.db)
        .await;
    } else {
        let nil = Uuid::nil();
        let _ = sqlx::query(
            r#"INSERT INTO audit_log (user_id, user_email, action, resource, ip_address, user_agent, success)
               VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
        )
        .bind(nil)
        .bind("anonymous")
        .bind(action)
        .bind(resource)
        .bind(&ip)
        .bind(&ua)
        .bind(success)
        .execute(&state.db)
        .await;
    }

    response
}
