use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_minutes: i64,
    pub cors_origin: String,
    pub port: u16,
    pub anthropic_api_key: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            jwt_secret: env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            jwt_expiry_minutes: env::var("JWT_EXPIRY_MINUTES")
                .unwrap_or_else(|_| "15".into())
                .parse()
                .expect("JWT_EXPIRY_MINUTES must be a number"),
            cors_origin: env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .expect("PORT must be a number"),
            anthropic_api_key: env::var("ANTHROPIC_API_KEY").ok(),
        }
    }
}
