use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};

use crate::error::AppError;
use crate::models::user::{AuthUser, Claims, UserRole};
use crate::state::AppState;

pub async fn require_auth(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized)?;

    let role = match token_data.claims.role.as_str() {
        "ADMIN" => UserRole::ADMIN,
        "MD" => UserRole::MD,
        "PA" => UserRole::PA,
        "CHG" => UserRole::CHG,
        "RN" => UserRole::RN,
        _ => return Err(AppError::Unauthorized),
    };

    let auth_user = AuthUser {
        id: token_data.claims.sub,
        email: token_data.claims.email,
        role,
    };

    req.extensions_mut().insert(auth_user);
    Ok(next.run(req).await)
}

pub fn require_role(user: &AuthUser, minimum: &UserRole) -> Result<(), AppError> {
    if user.role >= *minimum {
        Ok(())
    } else {
        Err(AppError::Forbidden)
    }
}
