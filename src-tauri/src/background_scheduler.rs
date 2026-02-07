use crate::settings::{AppSettings, SchedulerState};
use crate::commands::AppState;
use crate::storage::Storage;
use crate::fetcher::fetch_feed;
use crate::scheduler::{calculate_next_run_time, calculate_retry_backoff, count_new_articles};
use chrono::Utc;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, RwLock, broadcast};
use tokio::task::JoinHandle;
use log::{error, info, warn};

/// 新文章事件
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NewArticlesEvent {
    pub feed_id: String,
    pub feed_title: String,
    pub new_count: usize,
    pub articles: Vec<ArticleSummary>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ArticleSummary {
    pub id: String,
    pub title: String,
    pub url: String,
}

/// 调度器运行状态
#[derive(Debug, Clone, PartialEq)]
pub enum SchedulerStatus {
    Stopped,
    Running,
    Paused,
}

/// 后台调度器
pub struct BackgroundScheduler {
    status: Arc<RwLock<SchedulerStatus>>,
    state: Arc<RwLock<SchedulerState>>,
    event_tx: broadcast::Sender<NewArticlesEvent>,
    _handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

impl BackgroundScheduler {
    /// 创建新的调度器实例
    pub fn new() -> Self {
        let (event_tx, _) = broadcast::channel(100);

        Self {
            status: Arc::new(RwLock::new(SchedulerStatus::Stopped)),
            state: Arc::new(RwLock::new(SchedulerState::default())),
            event_tx,
            _handle: Arc::new(Mutex::new(None)),
        }
    }

    /// 启动调度器
    pub async fn start(&self, data_dir: std::path::PathBuf) -> std::result::Result<(), String> {
        // 检查是否已在运行
        {
            let status = self.status.read().await;
            if *status == SchedulerStatus::Running {
                return Ok(());
            }
        }

        // 更新状态为运行中
        {
            let mut status = self.status.write().await;
            *status = SchedulerStatus::Running;
        }

        let state_clone = self.state.clone();
        let event_tx = self.event_tx.clone();
        let status_clone = self.status.clone();

        let handle = tokio::spawn(async move {
            let storage = match Storage::new(&data_dir) {
                Ok(s) => Arc::new(s),
                Err(e) => {
                    error!("Failed to initialize storage: {}", e);
                    let mut status = status_clone.write().await;
                    *status = SchedulerStatus::Stopped;
                    return;
                }
            };

            let mut interval = tokio::time::interval(Duration::from_secs(60));
            let mut consecutive_errors = 0u32;

            loop {
                // 检查是否应该继续运行
                {
                    let status = status_clone.read().await;
                    if *status != SchedulerStatus::Running {
                        break;
                    }
                }

                interval.tick().await;

                // 获取设置
                let settings = match Self::get_settings(&storage, &data_dir).await {
                    Ok(Some(s)) => s,
                    Ok(None) => AppSettings::default(),
                    Err(e) => {
                        warn!("Failed to get settings: {}", e);
                        consecutive_errors += 1;
                        let backoff = calculate_retry_backoff(consecutive_errors);
                        tokio::time::sleep(backoff).await;
                        continue;
                    }
                };

                // 检查是否启用后台刷新
                if !settings.enable_background_refresh {
                    continue;
                }

                // 检查是否到达运行时间
                let now = Utc::now();
                let should_run = {
                    let state = state_clone.read().await;
                    match state.next_run_at {
                        Some(next) => now >= next,
                        None => true, // 首次运行
                    }
                };

                if !should_run {
                    continue;
                }

                // 执行刷新
                match Self::refresh_all_feeds(
                    &storage,
                    &settings,
                    event_tx.clone(),
                ).await {
                    Ok(_) => {
                        consecutive_errors = 0;
                        info!("Successfully refreshed all feeds");
                    }
                    Err(e) => {
                        error!("Failed to refresh feeds: {}", e);
                        consecutive_errors += 1;
                    }
                }

                // 更新调度器状态
                let now = Utc::now();
                let next_run = calculate_next_run_time(&now, &settings);
                {
                    let mut state = state_clone.write().await;
                    state.last_run_at = Some(now);
                    state.next_run_at = Some(next_run);
                    state.consecutive_errors = consecutive_errors;
                }
            }
        });

        // 保存句柄
        let mut guard = self._handle.lock().await;
        *guard = Some(handle);

        Ok(())
    }

    /// 停止调度器
    pub async fn stop(&self) {
        let mut status = self.status.write().await;
        *status = SchedulerStatus::Stopped;

        // 等待任务结束
        let mut guard = self._handle.lock().await;
        if let Some(handle) = guard.take() {
            handle.abort();
        }
    }

    /// 获取调度器状态
    pub async fn get_state(&self) -> SchedulerState {
        self.state.read().await.clone()
    }

    /// 订阅新文章事件
    pub fn subscribe(&self) -> broadcast::Receiver<NewArticlesEvent> {
        self.event_tx.subscribe()
    }

    /// 获取调度器状态
    pub async fn get_status(&self) -> SchedulerStatus {
        self.status.read().await.clone()
    }

    /// 从存储获取设置
    async fn get_settings(storage: &Arc<Storage>, data_dir: &PathBuf) -> std::result::Result<Option<AppSettings>, String> {
        use std::collections::HashMap;
        use std::fs::File;
        use std::io::BufReader;

        let store_path = data_dir.join("store.json");
        if !store_path.exists() {
            return Ok(None);
        }

        let file = File::open(&store_path)
            .map_err(|e| format!("Failed to open store: {}", e))?;
        let reader = BufReader::new(file);
        let store: HashMap<String, serde_json::Value> = serde_json::from_reader(reader)
            .map_err(|e| format!("Failed to parse store: {}", e))?;

        if let Some(value) = store.get("app_settings") {
            let settings: AppSettings = serde_json::from_value(value.clone())
                .map_err(|e| format!("Failed to parse settings: {}", e))?;
            Ok(Some(settings))
        } else {
            Ok(None)
        }
    }

    /// 刷新所有订阅
    async fn refresh_all_feeds(
        storage: &Arc<Storage>,
        settings: &AppSettings,
        event_tx: broadcast::Sender<NewArticlesEvent>,
    ) -> std::result::Result<(), String> {
        let feeds = storage.get_all_feeds()
            .map_err(|e| format!("Failed to get feeds: {}", e))?;

        for feed in feeds {
            let feed_id = feed.id.clone();
            let feed_url = feed.url.clone();
            let feed_title = feed.title.clone();

            // 获取刷新前的文章 ID
            let existing_ids: Vec<String> = storage.get_articles(Some(&feed_id), None)
                .unwrap_or_default()
                .into_iter()
                .map(|a| a.id)
                .collect();

            // 获取最新内容
            let (_feed, articles) = fetch_feed(&feed_url)
                .map_err(|e| format!("Failed to fetch {}: {}", feed_title, e))?;

            // 统计新文章
            let new_article_ids: Vec<String> = articles.iter()
                .map(|a| a.id.clone())
                .collect();

            let new_count = count_new_articles(&existing_ids, &new_article_ids);

            if new_count > 0 {
                // 保存新文章
                for article in &articles {
                    let _ = storage.add_article(article);
                }

                // 更新订阅时间
                let mut updated_feed = feed.clone();
                updated_feed.updated_at = Utc::now();
                let _ = storage.update_feed(&updated_feed);

                // 发送事件
                let summaries: Vec<ArticleSummary> = articles.iter()
                    .filter(|a| !existing_ids.contains(&a.id))
                    .map(|a| ArticleSummary {
                        id: a.id.clone(),
                        title: a.title.clone(),
                        url: a.link.clone(),
                    })
                    .collect();

                let event = NewArticlesEvent {
                    feed_id: feed_id.clone(),
                    feed_title,
                    new_count,
                    articles: summaries,
                };

                let _ = event_tx.send(event);
            }
        }

        Ok(())
    }
}

impl Default for BackgroundScheduler {
    fn default() -> Self {
        Self::new()
    }
}

// ============= 测试模块 (TDD: 先写测试) =============
#[cfg(test)]
mod tests {
    use super::*;

    // 创建测试用的临时目录
    fn create_test_data_dir() -> PathBuf {
        let mut temp_dir = std::env::temp_dir();
        temp_dir.push(format!("rss-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        temp_dir
    }

    // 清理测试目录
    fn cleanup_test_data_dir(dir: &PathBuf) {
        let _ = std::fs::remove_dir_all(dir);
    }

    // 测试: 创建新调度器
    #[tokio::test]
    async fn test_scheduler_new() {
        let scheduler = BackgroundScheduler::new();
        assert_eq!(scheduler.get_status().await, SchedulerStatus::Stopped);
    }

    // 测试: 调度器默认状态
    #[tokio::test]
    async fn test_scheduler_default() {
        let scheduler = BackgroundScheduler::default();
        assert_eq!(scheduler.get_status().await, SchedulerStatus::Stopped);
    }

    // 测试: 订阅事件
    #[tokio::test]
    async fn test_scheduler_subscribe() {
        let scheduler = BackgroundScheduler::new();
        let mut receiver = scheduler.subscribe();
        // 验证可以订阅
        drop(receiver);
    }

    // 测试: 启动调度器
    #[tokio::test]
    async fn test_scheduler_start() {
        let data_dir = create_test_data_dir();
        let scheduler = BackgroundScheduler::new();

        // 启动调度器
        let result = scheduler.start(data_dir.clone()).await;
        assert!(result.is_ok());

        // 验证状态
        assert_eq!(scheduler.get_status().await, SchedulerStatus::Running);

        // 停止调度器
        scheduler.stop().await;
        assert_eq!(scheduler.get_status().await, SchedulerStatus::Stopped);

        cleanup_test_data_dir(&data_dir);
    }

    // 测试: 重复启动调度器
    #[tokio::test]
    async fn test_scheduler_start_twice() {
        let data_dir = create_test_data_dir();
        let scheduler = BackgroundScheduler::new();

        // 第一次启动
        let result1 = scheduler.start(data_dir.clone()).await;
        assert!(result1.is_ok());

        // 第二次启动应该成功但不重复创建任务
        let result2 = scheduler.start(data_dir.clone()).await;
        assert!(result2.is_ok());

        scheduler.stop().await;

        cleanup_test_data_dir(&data_dir);
    }

    // 测试: 停止调度器
    #[tokio::test]
    async fn test_scheduler_stop() {
        let data_dir = create_test_data_dir();
        let scheduler = BackgroundScheduler::new();

        scheduler.start(data_dir.clone()).await.unwrap();
        scheduler.stop().await;

        // 等待任务结束
        tokio::time::sleep(Duration::from_millis(100)).await;

        assert_eq!(scheduler.get_status().await, SchedulerStatus::Stopped);

        cleanup_test_data_dir(&data_dir);
    }

    // 测试: 事件广播
    #[test]
    fn test_event_broadcast() {
        let (tx, _rx) = broadcast::channel(100);

        let event = NewArticlesEvent {
            feed_id: "test-feed".to_string(),
            feed_title: "Test Feed".to_string(),
            new_count: 3,
            articles: vec![
                ArticleSummary {
                    id: "1".to_string(),
                    title: "Article 1".to_string(),
                    url: "https://example.com/1".to_string(),
                },
            ],
        };

        let result = tx.send(event);
        assert!(result.is_ok());
    }

    // 测试: ArticleSummary 序列化
    #[test]
    fn test_article_summary_serialize() {
        let summary = ArticleSummary {
            id: "123".to_string(),
            title: "Test Article".to_string(),
            url: "https://example.com/test".to_string(),
        };

        let json = serde_json::to_string(&summary).unwrap();
        let parsed: ArticleSummary = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.id, summary.id);
        assert_eq!(parsed.title, summary.title);
        assert_eq!(parsed.url, summary.url);
    }

    // 测试: NewArticlesEvent 序列化
    #[test]
    fn test_new_articles_event_serialize() {
        let event = NewArticlesEvent {
            feed_id: "feed-1".to_string(),
            feed_title: "My Feed".to_string(),
            new_count: 5,
            articles: vec![
                ArticleSummary {
                    id: "1".to_string(),
                    title: "First".to_string(),
                    url: "https://example.com/1".to_string(),
                },
                ArticleSummary {
                    id: "2".to_string(),
                    title: "Second".to_string(),
                    url: "https://example.com/2".to_string(),
                },
            ],
        };

        let json = serde_json::to_string(&event).unwrap();
        let parsed: NewArticlesEvent = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.feed_id, event.feed_id);
        assert_eq!(parsed.feed_title, event.feed_title);
        assert_eq!(parsed.new_count, event.new_count);
        assert_eq!(parsed.articles.len(), event.articles.len());
    }
}
