use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub r#type: String, // Since type is a reserved keyword in Rust, we have escaped it with r#
    pub actor: Actor,
    pub repo: Repo,
    pub payload: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
pub struct EventForClient {
    pub r#type: String,
    pub actor: Actor,
    pub repo: Repo,
    pub event_url: String,
    pub action: String,
    pub commits_size: u8,
}

#[derive(Serialize, Deserialize)]
pub struct Actor {
    pub id: i32,
    pub url: String,
    pub avatar_url: String,
    pub display_login: String,
}

#[derive(Serialize, Deserialize)]
pub struct Repo {
    pub id: i32,
    pub name: String,
    pub url: String,
}

#[derive(Serialize, Deserialize)]
pub struct Commit {
    pub sha: String,
    pub message: String,
    pub url: String,
}

#[derive(Serialize, Deserialize)]
pub struct CommitPayload {
    pub size: u8,
    pub commits: Vec<Commit>,
}

#[derive(Serialize, Deserialize)]
pub struct PullRequest {
    pub url: String,
}

#[derive(Serialize, Deserialize)]
pub struct PullReqPayload {
    pub action: String,
    pub pull_request: PullRequest,
}
