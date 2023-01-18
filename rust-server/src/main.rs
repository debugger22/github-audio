use crate::handlers::ws_events_dispatch_handler;
use crate::repository::start_polling_github;
use axum::{routing::get, Router};
use dotenv::dotenv;
use std::{env, net::SocketAddr, sync::Arc};
use tokio::sync::broadcast;
use tower_http::trace::{DefaultMakeSpan, TraceLayer};
mod handlers;
mod helpers;
mod repository;
mod types;

#[tokio::main]
async fn main() {
    dotenv().ok();
    let host = env::var("HOST").expect("HOST not set in env vars");
    let port = env::var("PORT").expect("PORT not set in env vars");

    // Create channels for sending events from Github polling function to connected websockets
    let (events_sender_channel, _rx) = broadcast::channel::<String>(1);

    // Create a clone of events_sender_channel for the Github polling service
    let sender_for_gh_polling = events_sender_channel.clone();

    // Start background service to poll Github events API
    start_polling_github(sender_for_gh_polling).await;

    // Create a reference counted copy of sender channel to pass as axum state
    let shared_events_sender_channel = Arc::new(events_sender_channel);

    // Axum server related code
    let app = Router::new()
        .route("/health/", get(|| async { "Ok" }))
        .route("/events/", get(ws_events_dispatch_handler))
        .with_state(shared_events_sender_channel)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::default().include_headers(true)),
        );

    let socket_addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .expect("Server address parse error");

    axum::Server::bind(&socket_addr)
        .serve(app.into_make_service_with_connect_info::<SocketAddr>())
        .await
        .unwrap();
}
