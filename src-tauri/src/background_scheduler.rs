use crate::ai_summarizer;
use crate::settings::{AiSettings, AppSettings, SchedulerState};
use crate::storage::Storage;
use crate::fetcher::fetch_feed;
use crate::content_extractor::fetch_and_extract_content;
use crate::scheduler::{calculate_next_run_time, calculate_retry_backoff};
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
    pub async fn start(&self, storage: Arc<Storage>, data_dir: PathBuf) -> std::result::Result<(), String> {
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
                let settings = match Self::get_settings(&data_dir).await {
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
                    event_tx.clone(),
                    &data_dir,
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
    async fn get_settings(data_dir: &PathBuf) -> std::result::Result<Option<AppSettings>, String> {
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

    async fn get_ai_settings(data_dir: &PathBuf) -> std::result::Result<Option<AiSettings>, String> {
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

        if let Some(value) = store.get("ai_settings") {
            let settings: AiSettings = serde_json::from_value(value.clone())
                .map_err(|e| format!("Failed to parse AI settings: {}", e))?;
            Ok(Some(settings))
        } else {
            Ok(None)
        }
    }

    async fn refresh_all_feeds(
        storage: &Arc<Storage>,
        event_tx: broadcast::Sender<NewArticlesEvent>,
        data_dir: &PathBuf,
    ) -> std::result::Result<(), String> {
        let ai_settings = match Self::get_ai_settings(data_dir).await {
            Ok(Some(settings)) => settings,
            Ok(None) => AiSettings::default(),
            Err(e) => {
                warn!("Failed to load AI settings: {}", e);
                AiSettings::default()
            }
        };
        let auto_summary_enabled =
            ai_settings.enable_auto_summary && !ai_settings.api_key.trim().is_empty();
        let mut auto_summary_count = 0usize;

        let feeds = storage.get_all_feeds()
            .map_err(|e| format!("Failed to get feeds: {}", e))?;

        for feed in feeds {
            let feed_id = feed.id.clone();
            let feed_url = feed.url.clone();
            let feed_title = feed.title.clone();

            let existing_links: Vec<String> = storage.get_articles(Some(&feed_id), None)
                .unwrap_or_default()
                .into_iter()
                .map(|a| a.link)
                .collect();

            let (_feed, articles) = fetch_feed(&feed_url)
                .map_err(|e| format!("Failed to fetch {}: {}", feed_title, e))?;

            let new_count = articles.iter()
                .filter(|a| !existing_links.contains(&a.link))
                .count();

            if new_count > 0 {
                for article in &articles {
                    let mut article = article.clone();
                    article.feed_id = feed_id.clone();
                    let is_new = !existing_links.contains(&article.link);
                    let _ = storage.add_article(&article);

                    let mut summary_source = article
                        .full_content
                        .clone()
                        .or_else(|| article.content.clone())
                        .or_else(|| article.description.clone());

                    if is_new && feed.use_full_content {
                        match fetch_and_extract_content(&article.link) {
                            Ok(content) => {
                                let _ = storage.update_article_full_content(&article.id, &content);
                                summary_source = Some(content);
                            }
                            Err(e) => {
                                warn!("Failed to fetch full content for {}: {}", article.link, e);
                            }
                        }
                    }

                    if is_new && auto_summary_enabled && auto_summary_count < 3 {
                        if let Some(content) = summary_source {
                            let storage_clone = storage.clone();
                            let article_id = article.id.clone();
                            let ai_settings_clone = ai_settings.clone();

                            tokio::spawn(async move {
                                let summarize_result = tauri::async_runtime::spawn_blocking(move || {
                                    ai_summarizer::generate_summary(&content, &ai_settings_clone)
                                })
                                .await;

                                match summarize_result {
                                    Ok(Ok(summary)) => {
                                        if let Err(e) = storage_clone.update_article_ai_summary(&article_id, &summary) {
                                            warn!("Failed to save AI summary for {}: {}", article_id, e);
                                        } else {
                                            info!("Auto summary generated for article {}", article_id);
                                        }
                                    }
                                    Ok(Err(e)) => {
                                        warn!("Auto summary failed for article {}: {}", article_id, e);
                                    }
                                    Err(e) => {
                                        warn!("Auto summary task join failed for article {}: {}", article_id, e);
                                    }
                                }
                            });

                            auto_summary_count += 1;
                        }
                    }
                }

                let mut updated_feed = feed.clone();
                updated_feed.updated_at = Utc::now();
                let _ = storage.update_feed(&updated_feed);

                let summaries: Vec<ArticleSummary> = articles.iter()
                    .filter(|a| !existing_links.contains(&a.link))
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

    // 创建测试用的临时目录和共享 Storage
    fn create_test_storage() -> (PathBuf, Arc<Storage>) {
        let mut temp_dir = std::env::temp_dir();
        temp_dir.push(format!("rss-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let storage = Arc::new(Storage::new(&temp_dir).unwrap());
        (temp_dir, storage)
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
        let _receiver = scheduler.subscribe();
        // 验证可以订阅
        drop(_receiver);
    }

    // 测试: 启动调度器
    #[tokio::test]
    async fn test_scheduler_start() {
        let (data_dir, storage) = create_test_storage();
        let scheduler = BackgroundScheduler::new();

        // 启动调度器
        let result = scheduler.start(storage, data_dir.clone()).await;
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
        let (data_dir, storage) = create_test_storage();
        let scheduler = BackgroundScheduler::new();

        // 第一次启动
        let result1 = scheduler.start(storage.clone(), data_dir.clone()).await;
        assert!(result1.is_ok());

        // 第二次启动应该成功但不重复创建任务
        let result2 = scheduler.start(storage, data_dir.clone()).await;
        assert!(result2.is_ok());

        scheduler.stop().await;

        cleanup_test_data_dir(&data_dir);
    }

    // 测试: 停止调度器
    #[tokio::test]
    async fn test_scheduler_stop() {
        let (data_dir, storage) = create_test_storage();
        let scheduler = BackgroundScheduler::new();

        scheduler.start(storage, data_dir.clone()).await.unwrap();
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
