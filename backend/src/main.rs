mod config;
mod db;
mod error;
mod handlers;
mod middleware;
mod models;
mod services;
mod state;
mod validation;
mod ws;

use axum::{
    middleware as axum_mw,
    routing::{delete, get, post, put},
    Router,
};
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
use std::net::SocketAddr;

use crate::config::AppConfig;
use crate::state::AppState;
use crate::ws::broadcaster::WsEvent;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "atlas_backend=info,tower_http=info".into()),
        )
        .init();

    let config = AppConfig::from_env();
    tracing::info!("Starting ATLAS backend on port {}", config.port);

    let pool = db::init_pool(&config.database_url).await;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Migrations applied successfully");

    let (ws_tx, _rx) = broadcast::channel::<WsEvent>(100);

    let state = AppState {
        db: pool,
        ws_tx,
        config: config.clone(),
    };

    // Spawn background services
    tokio::spawn(services::simulator::run(state.clone()));
    tokio::spawn(services::alert_engine::run(state.clone()));
    tracing::info!("Background services started");

    let allowed_origins: Vec<axum::http::HeaderValue> = config
        .cors_origin
        .split(',')
        .filter_map(|s| s.trim().parse().ok())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ])
        .allow_credentials(true);

    // Public routes (no auth required)
    let auth_routes = Router::new()
        .route("/login", post(handlers::auth::login))
        .route("/logout", post(handlers::auth::logout));

    // Protected patient routes
    let patient_routes = Router::new()
        .route("/", get(handlers::patients::list_patients).post(handlers::patients::create_patient))
        .route("/{id}", get(handlers::patients::get_patient)
            .put(handlers::patients::update_patient)
            .delete(handlers::patients::discharge_patient))
        .route("/{id}/labs", get(handlers::labs::list_labs).post(handlers::labs::create_lab))
        .route("/{id}/labs/{lab_id}", put(handlers::labs::update_lab))
        .route("/{id}/imaging", get(handlers::imaging::list_imaging).post(handlers::imaging::create_imaging))
        .route("/{id}/imaging/{img_id}", put(handlers::imaging::update_imaging))
        .route("/{id}/consults", get(handlers::consults::list_consults).post(handlers::consults::create_consult))
        .route("/{id}/consults/{consult_id}", put(handlers::consults::update_consult));

    let alert_routes = Router::new()
        .route("/", get(handlers::alerts::list_alerts))
        .route("/{id}/dismiss", post(handlers::alerts::dismiss_alert));

    let ai_routes = Router::new()
        .route("/suggest", post(handlers::ai::suggest))
        .route("/top5", post(handlers::ai::top5))
        .route("/handoff", post(handlers::ai::handoff));

    // Protected routes with auth + audit middleware
    let protected = Router::new()
        .nest("/patients", patient_routes)
        .nest("/alerts", alert_routes)
        .route("/metrics", get(handlers::metrics::get_metrics))
        .route("/auth/me", get(handlers::auth::me))
        .route("/auth/refresh", post(handlers::auth::refresh))
        .nest("/ai", ai_routes)
        .layer(axum_mw::from_fn_with_state(state.clone(), middleware::audit::audit_log))
        .layer(axum_mw::from_fn_with_state(state.clone(), middleware::auth::require_auth));

    let app = Router::new()
        .route("/health", get(handlers::health::health))
        .nest("/api/auth", auth_routes)
        .nest("/api", protected)
        .route("/ws", get(handlers::ws::ws_upgrade))
        .layer(axum_mw::from_fn(middleware::hipaa::hipaa_headers))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
