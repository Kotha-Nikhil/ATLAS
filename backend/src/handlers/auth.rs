use axum::{extract::State, Extension, Json};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};

use crate::error::AppError;
use crate::models::user::*;
use crate::state::AppState;
use crate::validation;

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    validation::validate_login_request(&body.email, &body.password)?;

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1 AND is_active = TRUE")
        .bind(&body.email)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::Unauthorized)?;
    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)?;

    let now = Utc::now();
    let exp = (now + chrono::Duration::minutes(state.config.jwt_expiry_minutes)).timestamp() as usize;

    let role_str = format!("{:?}", user.role).to_uppercase();
    let claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        role: role_str,
        exp,
        iat: now.timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!("JWT encode error: {}", e)))?;

    sqlx::query("UPDATE users SET last_login = NOW() WHERE id = $1")
        .bind(user.id)
        .execute(&state.db)
        .await?;

    Ok(Json(LoginResponse {
        token,
        user: UserDto::from(user),
    }))
}

pub async fn logout() -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({ "message": "Logged out" })))
}

pub async fn me(
    Extension(auth_user): Extension<AuthUser>,
    State(state): State<AppState>,
) -> Result<Json<UserDto>, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(auth_user.id)
        .fetch_one(&state.db)
        .await?;

    Ok(Json(UserDto::from(user)))
}

pub async fn refresh(
    Extension(auth_user): Extension<AuthUser>,
    State(state): State<AppState>,
) -> Result<Json<LoginResponse>, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1 AND is_active = TRUE")
        .bind(auth_user.id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    let now = Utc::now();
    let exp = (now + chrono::Duration::minutes(state.config.jwt_expiry_minutes)).timestamp() as usize;

    let role_str = format!("{:?}", user.role).to_uppercase();
    let claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        role: role_str,
        exp,
        iat: now.timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!("JWT encode error: {}", e)))?;

    Ok(Json(LoginResponse {
        token,
        user: UserDto::from(user),
    }))
}
