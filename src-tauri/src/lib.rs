use std::collections::{BTreeMap, HashSet};

use chrono::{Duration, NaiveDate};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
struct RetentionInputEvent {
    created_at: String,
    user_id_hash: String,
}

#[derive(Debug, Clone, Serialize)]
struct TimePoint {
    date: String,
    value: usize,
}

#[derive(Debug, Clone, Serialize)]
struct CohortPoint {
    date: String,
    #[serde(rename = "newUsers")]
    new_users: usize,
    #[serde(rename = "returningUsers")]
    returning_users: usize,
}

#[derive(Debug, Clone, Serialize)]
struct RetentionStats {
    dau: Vec<TimePoint>,
    wau: Vec<TimePoint>,
    cohorts: Vec<CohortPoint>,
}

fn parse_date(value: &str) -> Option<NaiveDate> {
    value.get(0..10).and_then(|date| NaiveDate::parse_from_str(date, "%Y-%m-%d").ok())
}

#[tauri::command]
fn build_retention_stats(
    startup_events: Vec<RetentionInputEvent>,
    run_events: Vec<RetentionInputEvent>,
) -> Result<RetentionStats, String> {
    let mut day_users: BTreeMap<NaiveDate, HashSet<String>> = BTreeMap::new();
    let mut first_seen: BTreeMap<String, NaiveDate> = BTreeMap::new();

    for event in startup_events.iter().chain(run_events.iter()) {
        if let Some(day) = parse_date(&event.created_at) {
            day_users
                .entry(day)
                .or_default()
                .insert(event.user_id_hash.clone());

            first_seen
                .entry(event.user_id_hash.clone())
                .and_modify(|existing| {
                    if day < *existing {
                        *existing = day;
                    }
                })
                .or_insert(day);
        }
    }

    let mut dau = Vec::with_capacity(day_users.len());
    let mut wau = Vec::with_capacity(day_users.len());
    let mut cohorts = Vec::with_capacity(day_users.len());

    for (day, users_today) in &day_users {
        let mut week_users: HashSet<String> = HashSet::new();
        let week_start = *day - Duration::days(6);

        for (candidate_day, users) in &day_users {
            if *candidate_day >= week_start && *candidate_day <= *day {
                week_users.extend(users.iter().cloned());
            }
        }

        let mut new_users = 0usize;
        let mut returning_users = 0usize;

        for user in users_today {
            if let Some(first_day) = first_seen.get(user) {
                if first_day == day {
                    new_users += 1;
                } else {
                    returning_users += 1;
                }
            }
        }

        dau.push(TimePoint {
            date: day.to_string(),
            value: users_today.len(),
        });
        wau.push(TimePoint {
            date: day.to_string(),
            value: week_users.len(),
        });
        cohorts.push(CohortPoint {
            date: day.to_string(),
            new_users,
            returning_users,
        });
    }

    Ok(RetentionStats { dau, wau, cohorts })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![build_retention_stats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
