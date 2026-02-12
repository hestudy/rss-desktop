use crate::task_queue::{QueueStatusSnapshot, QueueTask, TaskPriority, TaskQueue, TaskType};
use std::sync::Arc;
use tauri::State;

type CommandResult<T> = Result<T, String>;

#[tauri::command]
pub async fn queue_add_task(
    task_type: String,
    article_id: String,
    url: Option<String>,
    target_lang: Option<String>,
    priority: Option<String>,
    queue: State<'_, Arc<TaskQueue>>,
) -> CommandResult<String> {
    let task_type = match task_type.as_str() {
        "fetch_full_content" => {
            let url = url.ok_or("url is required for fetch_full_content")?;
            TaskType::FetchFullContent { article_id, url }
        }
        "ai_summary" => TaskType::AiSummary { article_id },
        "ai_translation" => {
            let lang = target_lang.unwrap_or_else(|| "zh-CN".to_string());
            TaskType::AiTranslation {
                article_id,
                target_lang: lang,
            }
        }
        _ => return Err(format!("Unknown task type: {}", task_type)),
    };

    let priority = match priority.as_deref() {
        Some("normal") => TaskPriority::Normal,
        _ => TaskPriority::High,
    };

    let task = QueueTask::new(task_type, priority);
    queue.submit(task).await
}

#[tauri::command]
pub async fn queue_get_status(
    queue: State<'_, Arc<TaskQueue>>,
) -> CommandResult<QueueStatusSnapshot> {
    Ok(queue.get_status().await)
}

#[tauri::command]
pub async fn queue_cancel_task(
    task_id: String,
    queue: State<'_, Arc<TaskQueue>>,
) -> CommandResult<()> {
    queue.cancel(&task_id).await
}

#[tauri::command]
pub async fn queue_clear_completed(
    queue: State<'_, Arc<TaskQueue>>,
) -> CommandResult<usize> {
    Ok(queue.clear_completed().await)
}
