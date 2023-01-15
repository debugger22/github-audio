//! This module contains websocket handler for sending Github events
use axum::{
    extract::{
        connect_info::ConnectInfo,
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use std::{net::SocketAddr, ops::ControlFlow, sync::Arc};
use tokio::sync::broadcast::Sender;

// Allows to split the websocket stream into separate TX and RX branches
use futures::{sink::SinkExt, stream::StreamExt};

/**
 * Axum's handler for incomming websocket connections
 */
pub async fn ws_events_dispatch_handler(
    ws: WebSocketUpgrade,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(gh_events_sender): State<Arc<Sender<String>>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket_conn(socket, addr, gh_events_sender))
}

/**
 * Actual websocket statemachine (one will be spawned per connection)
 */
async fn handle_socket_conn(
    socket: WebSocket,
    addr: SocketAddr,
    gh_events_sender: Arc<Sender<String>>,
) {
    let (mut socket_sender, mut socket_receiver) = socket.split();

    // Start an async task to send events to the websocket
    let sender_handler = tokio::spawn(async move {
        let mut rx = gh_events_sender.subscribe();
        while let Ok(data) = rx.recv().await {
            if let Err(e) = socket_sender.send(Message::Text(data)).await {
                eprintln!("Error sending GH event to socket {:?}", e);
            }
        }
    });

    // Keep listening for a close frame from the client for disconnecting
    // the websocket
    while let Some(Ok(msg)) = socket_receiver.next().await {
        if process_message(msg, addr).is_break() {
            break;
        }
    }

    // Abort the async task waiting for events from Github polling service
    sender_handler.abort();
}

fn process_message(msg: Message, _addr: SocketAddr) -> ControlFlow<(), ()> {
    match msg {
        Message::Close(_) => {
            return ControlFlow::Break(());
        }
        _ => {}
    }
    ControlFlow::Continue(())
}
