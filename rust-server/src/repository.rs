use crate::helpers::clean_gh_payload;
use crate::types::Event;
use reqwest::{self, Client};
use std::env;
use tokio::{
    sync::broadcast::Sender,
    time::{self, Duration},
};

// The interval at which the Github API is called
const POLL_INTERVAL: u64 = 2000; // 2s

// The number of events that we ask from the Github API
const EVENTS_COUNT: u8 = 5;

/**
 * This function starts a forever running async task which polls the Github API
 * at [`POLL_INTERVAL`]. It also receives a [`Sender`] channel which is used
 * to send events received from Github.
 */
pub async fn start_polling_github(sender: Sender<String>) {
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_millis(POLL_INTERVAL));
        let http_client = reqwest::Client::new();
        loop {
            interval.tick().await;
            let sender_channel_owned = sender.clone();
            poll_github(&http_client, sender_channel_owned).await;
        }
    });
}

/**
 * This function gets called at each tick of the interval set in [`start_polling_github`].
 * It calls the Github events API, processes the payload and sends it to the [`Sender`].
 */
pub async fn poll_github(http_client: &Client, sender: Sender<String>) {
    let gh_token =
        env::var("GITHUB_OAUTH_KEY").expect("GITHUB_OAUTH_KEY is not set in the env vars");

    let response = http_client
        .get(format!("https://api.github.com/events?per_page={}", EVENTS_COUNT))
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", format!("Token {}", gh_token))
        .send()
        .await;

    if let Ok(response) = response {
        match response.status() {
            reqwest::StatusCode::OK => {
                match response.json::<Vec<Event>>().await {
                    Ok(parsed) => {
                        if let Err(e) = sender.send(clean_gh_payload(parsed)) {
                            eprintln!("Failed to send the data to the sender channel: {:?}", e);
                        }
                    }
                    Err(e) => {
                        eprintln!("Error parsing the response from Github: {:?}", e)
                    }
                };
            }
            reqwest::StatusCode::UNAUTHORIZED => {
                eprintln!("Autorization failed for Github API!");
            }
            other => {
                eprintln!("Something unexpected happened! Status code: {:?}", other);
            }
        };
    }
}
