use crate::types::{CommitPayload, Event, EventForClient, PullReqPayload};

pub fn clean_gh_payload(events: Vec<Event>) -> String {
    let mut cleaned_events: Vec<EventForClient> = Vec::new();

    for event in events {
        // Avoid pushing actions done by bots
        if check_for_bot(&event.actor.display_login) {
            continue;
        }

        // Convert repository URL to Github UI view
        let mut repo = event.repo;
        repo.url = repo
            .url
            .replace("/api.github", "/github")
            .replace("/repos/", "/");

        // Convert actor URL to Github UI view
        let mut actor = event.actor;
        actor.url = actor
            .url
            .replace("/api.github", "/github")
            .replace("/users/", "/");

        // Set the avatar size to 64px
        actor.avatar_url.push_str("s=64");

        match event.r#type.as_str() {
            "PushEvent" => {
                if let Ok(commit_payload) = serde_json::from_value::<CommitPayload>(event.payload) {
                    let commits_size = commit_payload.size;

                    // Convert commit URL to Github UI view
                    let mut commit_url = String::from("");
                    if commit_payload.commits.len() > 0 {
                        if let Some(commit) = commit_payload.commits.get(0) {
                            commit_url = commit.url.clone();
                            commit_url = commit_url
                                .replace("/api.github", "/github")
                                .replace("/repos/", "/")
                                .replace("/commits/", "/commit/");
                        }
                    }
                    cleaned_events.push(EventForClient {
                        r#type: event.r#type,
                        action: "".to_string(),
                        event_url: commit_url,
                        commits_size,
                        repo,
                        actor,
                    });
                }
            }

            "PullRequestEvent" => {
                if let Ok(pull_req_payload) =
                    serde_json::from_value::<PullReqPayload>(event.payload)
                {
                    // Convert pull request URL to Github UI view
                    let pull_req_url = pull_req_payload
                        .pull_request
                        .url
                        .replace("/api.github", "/github")
                        .replace("/repos/", "/")
                        .replace("/pulls/", "/pull/");

                    cleaned_events.push(EventForClient {
                        r#type: event.r#type,
                        action: pull_req_payload.action,
                        event_url: pull_req_url,
                        commits_size: 0,
                        repo,
                        actor,
                    });
                }
            }

            "IssueCommentEvent" => {
                if let Some(comment) = event.payload["comment"].as_object() {
                    if let Some(event_url) = comment["html_url"].as_str() {
                        cleaned_events.push(EventForClient {
                            r#type: event.r#type,
                            action: "commented".to_string(),
                            event_url: event_url.to_string(),
                            commits_size: 0,
                            repo,
                            actor,
                        });
                    }
                }
            }

            "IssuesEvent" => {
                if let Some(payload) = event.payload["payload"].as_object() {
                    if let Some(action) = payload["action"].as_str() {
                        if let Some(issue) = payload["issue"].as_object() {
                            if let Some(event_url) = issue["html_url"].as_str() {
                                cleaned_events.push(EventForClient {
                                    r#type: event.r#type,
                                    action: action.to_string(),
                                    event_url: event_url.to_string(),
                                    commits_size: 0,
                                    repo,
                                    actor,
                                });
                            }
                        }
                    }
                }
            }

            _ => {}
        }
    }

    if let Ok(data) = serde_json::to_string(&cleaned_events) {
        return data;
    } else {
        eprintln!("Error processing Github payload");
        return "".to_string();
    }
}

fn check_for_bot(actor_display_name: &String) -> bool {
    actor_display_name
        .to_lowercase()
        .find("github-actions")
        .is_some()
        | actor_display_name.to_lowercase().find("bot").is_some()
        | actor_display_name.to_lowercase().find("codecov").is_some()
}
