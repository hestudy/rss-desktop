use chrono::{DateTime, Utc};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::{BinaryHeap, HashMap};
use std::cmp::Ordering;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, Mutex, RwLock, Semaphore};
use uuid::Uuid;

use crate::ai_summarizer;
use crate::ai_translator;
use crate::content_extractor::fetch_and_extract_content;
use crate::storage::Storage;

// ============= 类型定义 =============

/// 任务类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TaskType {
    FetchFullContent {
        article_id: String,
        url: String,
    },
    AiSummary {
        article_id: String,
    },
    AiTranslation {
        article_id: String,
        target_lang: String,
    },
}

/// 任务优先级
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskPriority {
    /// 用户手动触发
    High = 1,
    /// 后台自动触发
    Normal = 0,
}

impl PartialOrd for TaskPriority {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for TaskPriority {
    fn cmp(&self, other: &Self) -> Ordering {
        (*self as u8).cmp(&(*other as u8))
    }
}

/// 任务状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed { error: String, retries: u32 },
    Cancelled,
}

/// 队列中的任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueTask {
    pub id: String,
    pub task_type: TaskType,
    pub priority: TaskPriority,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub retries: u32,
    #[serde(default)]
    pub on_complete: Vec<TaskType>,
}

impl QueueTask {
    pub fn new(task_type: TaskType, priority: TaskPriority) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            task_type,
            priority,
            status: TaskStatus::Pending,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            retries: 0,
            on_complete: Vec::new(),
        }
    }

    /// 获取任务关联的 article_id
    pub fn article_id(&self) -> &str {
        match &self.task_type {
            TaskType::FetchFullContent { article_id, .. } => article_id,
            TaskType::AiSummary { article_id } => article_id,
            TaskType::AiTranslation { article_id, .. } => article_id,
        }
    }
}

/// 优先队列中的条目（用于 BinaryHeap 排序）
struct PriorityEntry {
    task: QueueTask,
}

impl PartialEq for PriorityEntry {
    fn eq(&self, other: &Self) -> bool {
        self.task.priority == other.task.priority
            && self.task.created_at == other.task.created_at
    }
}

impl Eq for PriorityEntry {}

impl PartialOrd for PriorityEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PriorityEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        // 高优先级先出；同优先级按创建时间早的先出
        self.task
            .priority
            .cmp(&other.task.priority)
            .then_with(|| other.task.created_at.cmp(&self.task.created_at))
    }
}

/// 队列状态快照（发送到前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStatusSnapshot {
    pub pending_count: usize,
    pub running_count: usize,
    pub completed_count: usize,
    pub failed_count: usize,
    pub tasks: Vec<QueueTask>,
}

/// 任务进度事件（发送到前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskProgressEvent {
    pub task_id: String,
    pub article_id: String,
    pub task_type: String,
    pub status: String,
    pub error: Option<String>,
}

// ============= 最大重试次数 =============
const MAX_RETRIES: u32 = 3;
const MAX_QUEUE_SIZE: usize = 500;

// ============= 任务队列 =============

pub struct TaskQueue {
    sender: mpsc::Sender<QueueTask>,
    task_states: Arc<RwLock<HashMap<String, QueueTask>>>,
    cancelled: Arc<RwLock<std::collections::HashSet<String>>>,
}

impl TaskQueue {
    /// 创建并启动任务队列
    pub fn new(
        max_concurrency: usize,
        storage: Arc<Storage>,
        data_dir: std::path::PathBuf,
        app_handle: AppHandle,
    ) -> Self {
        let (sender, receiver) = mpsc::channel::<QueueTask>(MAX_QUEUE_SIZE);
        let task_states: Arc<RwLock<HashMap<String, QueueTask>>> =
            Arc::new(RwLock::new(HashMap::new()));
        let cancelled: Arc<RwLock<std::collections::HashSet<String>>> =
            Arc::new(RwLock::new(std::collections::HashSet::new()));

        let states_clone = task_states.clone();
        let cancelled_clone = cancelled.clone();

        tauri::async_runtime::spawn(Self::worker_loop(
            receiver,
            states_clone,
            cancelled_clone,
            max_concurrency,
            storage,
            data_dir,
            app_handle,
        ));

        Self {
            sender,
            task_states,
            cancelled,
        }
    }

    /// 提交任务到队列
    pub async fn submit(&self, task: QueueTask) -> Result<String, String> {
        let task_id = task.id.clone();

        // 去重：检查是否已有相同 article_id + 相同 task_type 的 pending/running 任务
        {
            let states = self.task_states.read().await;
            for existing in states.values() {
                if existing.article_id() == task.article_id()
                    && std::mem::discriminant(&existing.task_type)
                        == std::mem::discriminant(&task.task_type)
                    && matches!(
                        existing.status,
                        TaskStatus::Pending | TaskStatus::Running
                    )
                {
                    info!(
                        "[Queue] Skipping duplicate task for article {}",
                        task.article_id()
                    );
                    return Ok(existing.id.clone());
                }
            }
        }

        {
            let mut states = self.task_states.write().await;
            states.insert(task_id.clone(), task.clone());
        }

        self.sender
            .send(task)
            .await
            .map_err(|e| format!("Failed to submit task: {}", e))?;

        info!("[Queue] Task {} submitted", task_id);
        Ok(task_id)
    }

    /// 取消任务
    pub async fn cancel(&self, task_id: &str) -> Result<(), String> {
        {
            let mut cancelled = self.cancelled.write().await;
            cancelled.insert(task_id.to_string());
        }

        {
            let mut states = self.task_states.write().await;
            if let Some(task) = states.get_mut(task_id) {
                task.status = TaskStatus::Cancelled;
                task.completed_at = Some(Utc::now());
            }
        }

        info!("[Queue] Task {} cancelled", task_id);
        Ok(())
    }

    /// 获取队列状态快照
    pub async fn get_status(&self) -> QueueStatusSnapshot {
        let states = self.task_states.read().await;
        let mut pending = 0;
        let mut running = 0;
        let mut completed = 0;
        let mut failed = 0;

        for task in states.values() {
            match &task.status {
                TaskStatus::Pending => pending += 1,
                TaskStatus::Running => running += 1,
                TaskStatus::Completed => completed += 1,
                TaskStatus::Failed { .. } => failed += 1,
                TaskStatus::Cancelled => {}
            }
        }

        let mut tasks: Vec<QueueTask> = states.values().cloned().collect();
        tasks.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        QueueStatusSnapshot {
            pending_count: pending,
            running_count: running,
            completed_count: completed,
            failed_count: failed,
            tasks,
        }
    }

    /// 清理已完成/已取消的任务
    pub async fn clear_completed(&self) -> usize {
        let mut states = self.task_states.write().await;
        let before = states.len();
        states.retain(|_, task| {
            !matches!(
                task.status,
                TaskStatus::Completed | TaskStatus::Cancelled
            )
        });
        before - states.len()
    }

    /// Worker loop：从 channel 接收任务，用优先队列排序，用 semaphore 控制并发
    async fn worker_loop(
        mut receiver: mpsc::Receiver<QueueTask>,
        task_states: Arc<RwLock<HashMap<String, QueueTask>>>,
        cancelled: Arc<RwLock<std::collections::HashSet<String>>>,
        max_concurrency: usize,
        storage: Arc<Storage>,
        data_dir: std::path::PathBuf,
        app_handle: AppHandle,
    ) {
        let semaphore = Arc::new(Semaphore::new(max_concurrency));
        let pending_queue: Arc<Mutex<BinaryHeap<PriorityEntry>>> =
            Arc::new(Mutex::new(BinaryHeap::new()));

        let (notify_tx, mut notify_rx) = mpsc::channel::<()>(100);

        let pq_clone = pending_queue.clone();
        let notify_tx_clone = notify_tx.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(task) = receiver.recv().await {
                let mut pq = pq_clone.lock().await;
                pq.push(PriorityEntry { task });
                let _ = notify_tx_clone.send(()).await;
            }
        });

        loop {
            let _ = notify_rx.recv().await;

            loop {
                let task = {
                    let mut pq = pending_queue.lock().await;
                    pq.pop().map(|e| e.task)
                };

                let task = match task {
                    Some(t) => t,
                    None => break,
                };

                {
                    let cancelled_set = cancelled.read().await;
                    if cancelled_set.contains(&task.id) {
                        continue;
                    }
                }

                let permit = match semaphore.clone().try_acquire_owned() {
                    Ok(p) => p,
                    Err(_) => {
                        let mut pq = pending_queue.lock().await;
                        pq.push(PriorityEntry { task });
                        break;
                    }
                };

                let task_id = task.id.clone();
                {
                    let mut states = task_states.write().await;
                    if let Some(t) = states.get_mut(&task_id) {
                        t.status = TaskStatus::Running;
                        t.started_at = Some(Utc::now());
                    }
                }

                emit_progress(&app_handle, &task, "running", None);

                let storage_clone = storage.clone();
                let data_dir_clone = data_dir.clone();
                let states_clone = task_states.clone();
                let cancelled_clone = cancelled.clone();
                let app_handle_clone = app_handle.clone();
                let pq_clone = pending_queue.clone();
                let notify_tx_clone = notify_tx.clone();

                tauri::async_runtime::spawn(async move {
                    {
                        let cancelled_set = cancelled_clone.read().await;
                        if cancelled_set.contains(&task.id) {
                            drop(permit);
                            return;
                        }
                    }

                    let result = execute_task(
                        &task,
                        &storage_clone,
                        &data_dir_clone,
                    )
                    .await;

                    match result {
                        Ok(()) => {
                            {
                                let mut states = states_clone.write().await;
                                if let Some(t) = states.get_mut(&task.id) {
                                    t.status = TaskStatus::Completed;
                                    t.completed_at = Some(Utc::now());
                                }
                            }
                            emit_progress(&app_handle_clone, &task, "completed", None);
                            info!("[Queue] Task {} completed", task.id);

                            for next_task_type in &task.on_complete {
                                let chained = QueueTask::new(
                                    next_task_type.clone(),
                                    task.priority,
                                );
                                {
                                    let mut states = states_clone.write().await;
                                    states.insert(chained.id.clone(), chained.clone());
                                }
                                info!(
                                    "[Queue] Chained task {} submitted after {}",
                                    chained.id, task.id
                                );
                                let mut pq = pq_clone.lock().await;
                                pq.push(PriorityEntry { task: chained });
                                let _ = notify_tx_clone.send(()).await;
                            }
                        }
                        Err(e) => {
                            let retries = task.retries + 1;
                            if retries < MAX_RETRIES {
                                warn!(
                                    "[Queue] Task {} failed (attempt {}): {}, retrying",
                                    task.id, retries, e
                                );
                                let mut retry_task = task.clone();
                                retry_task.retries = retries;
                                retry_task.status = TaskStatus::Pending;
                                retry_task.started_at = None;

                                {
                                    let mut states = states_clone.write().await;
                                    if let Some(t) = states.get_mut(&retry_task.id) {
                                        t.status = TaskStatus::Pending;
                                        t.retries = retries;
                                    }
                                }

                                let mut pq = pq_clone.lock().await;
                                pq.push(PriorityEntry { task: retry_task });
                                let _ = notify_tx_clone.send(()).await;
                            } else {
                                error!(
                                    "[Queue] Task {} failed after {} retries: {}",
                                    task.id, MAX_RETRIES, e
                                );
                                let mut states = states_clone.write().await;
                                if let Some(t) = states.get_mut(&task.id) {
                                    t.status = TaskStatus::Failed {
                                        error: e.clone(),
                                        retries,
                                    };
                                    t.completed_at = Some(Utc::now());
                                }
                                emit_progress(
                                    &app_handle_clone,
                                    &task,
                                    "failed",
                                    Some(e),
                                );
                            }
                        }
                    }

                    drop(permit);
                    let _ = notify_tx_clone.send(()).await;
                });
            }
        }
    }
}

/// 执行具体任务
async fn execute_task(
    task: &QueueTask,
    storage: &Arc<Storage>,
    data_dir: &std::path::Path,
) -> Result<(), String> {
    match &task.task_type {
        TaskType::FetchFullContent { article_id, url } => {
            let url = url.clone();
            let content = tauri::async_runtime::spawn_blocking(move || {
                fetch_and_extract_content(&url)
            })
            .await
            .map_err(|e| format!("Task join error: {}", e))?
            .map_err(|e| e.to_string())?;

            storage
                .update_article_full_content(article_id, &content)
                .map_err(|e| format!("Failed to save full content: {}", e))?;

            info!(
                "[Queue] Fetched full content for article {}, len={}",
                article_id,
                content.len()
            );
            Ok(())
        }
        TaskType::AiSummary { article_id } => {
            let article = storage
                .get_article(article_id)
                .map_err(|e| format!("Failed to get article: {}", e))?
                .ok_or_else(|| "Article not found".to_string())?;

            let content = article
                .full_content
                .as_deref()
                .or(article.content.as_deref())
                .or(article.description.as_deref())
                .ok_or_else(|| "Article content is empty".to_string())?
                .to_string();

            let ai_settings = crate::settings::load_ai_settings_from_dir(data_dir);
            let settings_clone = ai_settings.clone();
            let article_id_clone = article_id.clone();

            let (summary, usage_record) = tauri::async_runtime::spawn_blocking(move || {
                ai_summarizer::generate_summary(&content, &settings_clone, Some(&article_id_clone))
            })
            .await
            .map_err(|e| format!("AI summary task join error: {}", e))??;

            storage
                .update_article_ai_summary(article_id, &summary)
                .map_err(|e| format!("Failed to save AI summary: {}", e))?;

            if let Err(e) = storage.add_ai_usage_record(&usage_record) {
                warn!("[Queue] Failed to save summary usage record: {}", e);
            }

            info!(
                "[Queue] Generated AI summary for article {}, len={}",
                article_id,
                summary.len()
            );
            Ok(())
        }
        TaskType::AiTranslation {
            article_id,
            target_lang,
        } => {
            let article = storage
                .get_article(article_id)
                .map_err(|e| format!("Failed to get article: {}", e))?
                .ok_or_else(|| "Article not found".to_string())?;

            let content = article
                .full_content
                .as_deref()
                .or(article.content.as_deref())
                .or(article.description.as_deref())
                .ok_or_else(|| "Article content is empty".to_string())?
                .to_string();

            let ai_settings = crate::settings::load_ai_settings_from_dir(data_dir);
            let lang = target_lang.clone();
            let settings_clone = ai_settings.clone();
            let article_id_clone = article_id.clone();

            let content_handle = tauri::async_runtime::spawn_blocking(move || {
                ai_translator::translate_content(&content, &lang, &settings_clone, Some(&article_id_clone))
            });

            let title_for_task = article.title.clone();
            let lang_for_title = target_lang.clone();
            let settings_for_title = ai_settings.clone();
            let title_handle = tauri::async_runtime::spawn_blocking(move || {
                ai_translator::translate_title(&title_for_task, &lang_for_title, &settings_for_title)
            });

            let (content_result, title_result) = tokio::join!(content_handle, title_handle);
            let (translation, usage_record) = content_result
                .map_err(|e| format!("Translation task join error: {}", e))??;

            let title_result = title_result
                .map_err(|e| format!("Title translation task join error: {}", e))?;
            let (translated_title, title_pt, title_ct) = match title_result {
                Ok((text, pt, ct)) => (Some(text), pt, ct),
                Err(_) => (None, 0, 0),
            };

            storage
                .update_article_ai_translation(article_id, &translation, translated_title.as_deref())
                .map_err(|e| format!("Failed to save translation: {}", e))?;

            if let Err(e) = storage.add_ai_usage_record(&usage_record) {
                warn!("[Queue] Failed to save translation usage record: {}", e);
            }

            if title_pt > 0 || title_ct > 0 {
                let title_usage = crate::models::AiUsageRecord::new(
                    "translation",
                    &ai_settings.model,
                    title_pt,
                    title_ct,
                    Some(article_id),
                );
                if let Err(e) = storage.add_ai_usage_record(&title_usage) {
                    warn!("[Queue] Failed to save title translation usage record: {}", e);
                }
            }

            info!(
                "[Queue] Translated article {}, len={}, title_translated={}",
                article_id,
                translation.len(),
                translated_title.is_some()
            );
            Ok(())
        }
    }
}

/// 发送进度事件到前端
fn emit_progress(app_handle: &AppHandle, task: &QueueTask, status: &str, error: Option<String>) {
    let task_type_str = match &task.task_type {
        TaskType::FetchFullContent { .. } => "fetch_full_content",
        TaskType::AiSummary { .. } => "ai_summary",
        TaskType::AiTranslation { .. } => "ai_translation",
    };

    let event = TaskProgressEvent {
        task_id: task.id.clone(),
        article_id: task.article_id().to_string(),
        task_type: task_type_str.to_string(),
        status: status.to_string(),
        error,
    };

    let _ = app_handle.emit("queue-task-progress", &event);
}

// ============= 测试 =============
#[cfg(test)]
mod tests {
    use super::*;

    // 测试: QueueTask 创建
    #[test]
    fn test_queue_task_new() {
        let task = QueueTask::new(
            TaskType::FetchFullContent {
                article_id: "art-1".to_string(),
                url: "https://example.com/article".to_string(),
            },
            TaskPriority::High,
        );

        assert!(!task.id.is_empty());
        assert_eq!(task.priority, TaskPriority::High);
        assert_eq!(task.status, TaskStatus::Pending);
        assert_eq!(task.retries, 0);
        assert!(task.started_at.is_none());
        assert!(task.completed_at.is_none());
    }

    // 测试: article_id 提取
    #[test]
    fn test_queue_task_article_id() {
        let task1 = QueueTask::new(
            TaskType::FetchFullContent {
                article_id: "art-1".to_string(),
                url: "https://example.com".to_string(),
            },
            TaskPriority::Normal,
        );
        assert_eq!(task1.article_id(), "art-1");

        let task2 = QueueTask::new(
            TaskType::AiSummary {
                article_id: "art-2".to_string(),
            },
            TaskPriority::Normal,
        );
        assert_eq!(task2.article_id(), "art-2");

        let task3 = QueueTask::new(
            TaskType::AiTranslation {
                article_id: "art-3".to_string(),
                target_lang: "en".to_string(),
            },
            TaskPriority::Normal,
        );
        assert_eq!(task3.article_id(), "art-3");
    }

    // 测试: 优先级排序
    #[test]
    fn test_priority_ordering() {
        assert!(TaskPriority::High > TaskPriority::Normal);
    }

    // 测试: PriorityEntry 排序（高优先级先出）
    #[test]
    fn test_priority_entry_ordering() {
        let mut heap = BinaryHeap::new();

        let normal_task = QueueTask::new(
            TaskType::AiSummary {
                article_id: "normal".to_string(),
            },
            TaskPriority::Normal,
        );

        let high_task = QueueTask::new(
            TaskType::AiSummary {
                article_id: "high".to_string(),
            },
            TaskPriority::High,
        );

        heap.push(PriorityEntry {
            task: normal_task,
        });
        heap.push(PriorityEntry {
            task: high_task,
        });

        let first = heap.pop().unwrap();
        assert_eq!(first.task.priority, TaskPriority::High);
        assert_eq!(first.task.article_id(), "high");

        let second = heap.pop().unwrap();
        assert_eq!(second.task.priority, TaskPriority::Normal);
    }

    // 测试: TaskType 序列化
    #[test]
    fn test_task_type_serialize() {
        let tt = TaskType::FetchFullContent {
            article_id: "a1".to_string(),
            url: "https://example.com".to_string(),
        };
        let json = serde_json::to_string(&tt).unwrap();
        assert!(json.contains("fetch_full_content"));

        let parsed: TaskType = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, tt);
    }

    // 测试: TaskStatus 序列化
    #[test]
    fn test_task_status_serialize() {
        let status = TaskStatus::Failed {
            error: "timeout".to_string(),
            retries: 2,
        };
        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("failed"));
        assert!(json.contains("timeout"));

        let parsed: TaskStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, status);
    }

    // 测试: QueueTask 序列化往返
    #[test]
    fn test_queue_task_serialize_roundtrip() {
        let task = QueueTask::new(
            TaskType::AiTranslation {
                article_id: "art-1".to_string(),
                target_lang: "zh-CN".to_string(),
            },
            TaskPriority::High,
        );

        let json = serde_json::to_string(&task).unwrap();
        let parsed: QueueTask = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.id, task.id);
        assert_eq!(parsed.priority, task.priority);
        assert_eq!(parsed.task_type, task.task_type);
    }

    // 测试: QueueStatusSnapshot 序列化
    #[test]
    fn test_queue_status_snapshot_serialize() {
        let snapshot = QueueStatusSnapshot {
            pending_count: 5,
            running_count: 2,
            completed_count: 10,
            failed_count: 1,
            tasks: vec![],
        };

        let json = serde_json::to_string(&snapshot).unwrap();
        let parsed: QueueStatusSnapshot = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.pending_count, 5);
        assert_eq!(parsed.running_count, 2);
        assert_eq!(parsed.completed_count, 10);
        assert_eq!(parsed.failed_count, 1);
    }

    // 测试: TaskProgressEvent 序列化
    #[test]
    fn test_task_progress_event_serialize() {
        let event = TaskProgressEvent {
            task_id: "t1".to_string(),
            article_id: "a1".to_string(),
            task_type: "ai_summary".to_string(),
            status: "running".to_string(),
            error: None,
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("ai_summary"));
        assert!(json.contains("running"));
    }
}
