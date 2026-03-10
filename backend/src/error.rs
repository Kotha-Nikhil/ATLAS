use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Authentication failed")]
    Unauthorized,

    #[error("Forbidden — insufficient role")]
    Forbidden,

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("External service error: {0}")]
    External(String),

    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            }
            AppError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, self.to_string())
            }
            AppError::Forbidden => {
                (StatusCode::FORBIDDEN, self.to_string())
            }
            AppError::NotFound(msg) => {
                (StatusCode::NOT_FOUND, msg.clone())
            }
            AppError::Validation(msg) => {
                (StatusCode::BAD_REQUEST, msg.clone())
            }
            AppError::External(msg) => {
                tracing::error!("External service error: {}", msg);
                (StatusCode::BAD_GATEWAY, msg.clone())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".to_string())
            }
        };

        let body = json!({ "error": message });
        (status, Json(body)).into_response()
    }
}
