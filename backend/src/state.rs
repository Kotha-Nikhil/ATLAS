use sqlx::PgPool;
use tokio::sync::broadcast;

use crate::config::AppConfig;
use crate::ws::broadcaster::WsEvent;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub ws_tx: broadcast::Sender<WsEvent>,
    pub config: AppConfig,
}
