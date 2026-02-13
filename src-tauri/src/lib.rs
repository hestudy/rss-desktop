// 模块声明
mod models;
mod error;
mod database;
mod storage_sqlite;
mod migration;
mod fetcher;
mod commands;
mod content_extractor;
mod settings;
mod scheduler;
mod scheduler_commands;
mod background_scheduler;
mod notifications;
mod tray;
mod ai_summarizer;
mod ai_translator;
mod ai_pricing;
mod task_queue;
mod queue_commands;

// 导出常用类型
pub use models::{Feed, Article, AddFeedRequest, UpdateFeedRequest, GetArticlesRequest, ApiResponse, FeedWithUnreadCount, FeedLog, LogArticleSummary};
pub use error::{RssError, Result};
pub use settings::{AiSettings, AppSettings, SchedulerState, PollInterval, NotificationType};
pub use background_scheduler::{BackgroundScheduler, NewArticlesEvent, ArticleSummary};
pub use notifications::NotificationManager;
pub use tray::TrayManager;
pub use task_queue::{TaskQueue, TaskType, TaskPriority, QueueTask};

use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tauri::{Manager, Emitter, Listener};
use log::{error, info};

/// 初始化数据目录
fn get_data_dir() -> PathBuf {
    // 获取应用数据目录
    let mut data_dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    data_dir.push("rss-desktop");
    data_dir
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志记录器
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    let data_dir = get_data_dir();

    // 初始化组件
    let scheduler = Arc::new(BackgroundScheduler::new());
    let unread_count = Arc::new(AtomicUsize::new(0));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            // 创建数据目录
            std::fs::create_dir_all(&data_dir)?;

            // 初始化 SQLite 数据库
            let db = Arc::new(
                database::Database::new(&data_dir)
                    .expect("Failed to initialize database")
            );

            // 创建共享的 SqliteStorage 实例
            let shared_storage = Arc::new(
                storage_sqlite::SqliteStorage::new(db)
            );

            // 执行 JSON → SQLite 数据迁移（如果需要）
            if migration::needs_migration(&data_dir) {
                info!("Detected legacy JSON files, starting migration...");
                if let Err(e) = migration::migrate_json_to_sqlite(&data_dir, &shared_storage) {
                    error!("Migration failed: {}", e);
                }
            }

            // 创建通知管理器
            let notification_manager = NotificationManager::new(app.handle().clone());

            // 注册共享 Storage 到 Tauri 状态（所有命令通过 State<Arc<SqliteStorage>> 访问）
            app.manage(shared_storage.clone());

            // 将调度器和其他组件存储在应用状态中
            app.manage(scheduler.clone());
            app.manage(unread_count.clone());
            app.manage(Arc::new(notification_manager));

            let max_concurrency = 3;
            let task_queue = Arc::new(TaskQueue::new(
                max_concurrency,
                shared_storage.clone(),
                app.handle().clone(),
            ));
            app.manage(task_queue.clone());

            // 获取 app handle 用于异步任务
            let app_handle = app.handle().clone();

            // 监听窗口事件以更新未读计数
            let app_handle_for_events = app.handle().clone();
            let storage_for_events = shared_storage.clone();
            app.listen("mark-article-read", move |_| {
                // 文章被标记为已读时更新托盘
                let _ = refresh_unread_count(&app_handle_for_events, &storage_for_events);
            });

            // 使用 async_runtime 来启动后台调度器
            let scheduler_clone = scheduler.clone();
            let storage_for_scheduler = shared_storage.clone();
            let storage_for_events = shared_storage.clone();
            let unread_count_clone = unread_count.clone();
            let task_queue_for_scheduler = task_queue.clone();

            tauri::async_runtime::spawn(async move {
                if let Err(e) = scheduler_clone.start(storage_for_scheduler, Some(task_queue_for_scheduler)).await {
                    error!("Failed to start scheduler: {}", e);
                    return;
                }
                info!("Background scheduler started successfully");

                // 订阅新文章事件
                let mut receiver = scheduler_clone.subscribe();

                // 监听新文章事件并发送通知
                while let Ok(event) = receiver.recv().await {
                    // 获取设置
                    let settings = match get_settings_internal(&storage_for_events) {
                        Ok(Some(s)) => s,
                        Ok(None) => AppSettings::default(),
                        Err(e) => {
                            error!("Failed to get settings: {}", e);
                            AppSettings::default()
                        }
                    };

                    info!(
                        "New articles event: {} new articles from {}",
                        event.new_count, event.feed_title
                    );

                    // 发送事件到前端更新 UI
                    let _ = app_handle.emit("new-articles", &event);

                    // 如果启用了通知，发送通知事件
                    if settings.enable_notifications && settings.notification_type == NotificationType::System {
                        let notification_data = serde_json::json!({
                            "title": if event.new_count == 1 {
                                format!("来自 {} 的新文章", event.feed_title)
                            } else {
                                format!("来自 {} 的 {} 篇新文章", event.feed_title, event.new_count)
                            },
                            "body": event.articles.iter()
                                .take(settings.max_notifications_per_batch)
                                .map(|a| a.title.as_str())
                                .collect::<Vec<_>>()
                                .join("\n"),
                            "feed_id": event.feed_id,
                            "count": event.new_count,
                        });
                        let _ = app_handle.emit("show-notification", &notification_data);
                    }

                    // 更新未读计数
                    unread_count_clone.fetch_add(event.new_count, Ordering::SeqCst);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_feed,
            commands::get_feeds,
            commands::remove_feed,
            commands::refresh_feed,
            commands::refresh_all_feeds,
            commands::get_articles,
            commands::mark_article_read,
            commands::mark_all_read,
            commands::get_unread_count,
            commands::open_link,
            commands::set_store_value,
            commands::get_store_value,
            commands::get_article,
            commands::update_reading_progress,
            commands::set_article_favorite,
            commands::get_favorite_articles,
            commands::update_feed_info,
            commands::fetch_full_content,
            commands::generate_article_summary,
            commands::translate_article,
            commands::get_feed_logs,
            commands::get_all_feed_logs,
            scheduler_commands::get_settings,
            scheduler_commands::update_settings,
            scheduler_commands::get_ai_settings,
            scheduler_commands::update_ai_settings,
            scheduler_commands::get_scheduler_state,
            scheduler_commands::set_scheduler_state,
            queue_commands::queue_add_task,
            queue_commands::queue_get_status,
            queue_commands::queue_cancel_task,
            queue_commands::queue_clear_completed,
            commands::get_ai_usage_summary,
            commands::clear_ai_usage_records,
            commands::get_builtin_model_prices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 内部函数：从已有 storage 获取设置
fn get_settings_internal(storage: &storage_sqlite::SqliteStorage) -> std::result::Result<Option<AppSettings>, String> {
    match storage.get_kv("app_settings") {
        Ok(Some(value)) => {
            let settings: AppSettings = serde_json::from_value(value)
                .map_err(|e| format!("Failed to parse settings: {}", e))?;
            Ok(Some(settings))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get settings: {}", e)),
    }
}

/// 刷新未读计数
fn refresh_unread_count(app: &tauri::AppHandle, storage: &storage_sqlite::SqliteStorage) -> std::result::Result<(), String> {
    let feeds = storage.get_all_feeds()
        .map_err(|e| format!("Failed to get feeds: {}", e))?;

    let total_unread: usize = feeds.iter()
        .map(|f| storage.get_unread_count(&f.id).unwrap_or(0))
        .sum();

    // 发送未读计数到前端
    let _ = app.emit("unread-count-updated", total_unread);

    Ok(())
}

// ============= 测试 =============
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_data_dir() {
        let dir = get_data_dir();
        assert!(dir.ends_with("rss-desktop"));
    }

    #[test]
    fn test_extended_app_state_components() {
        let _scheduler = BackgroundScheduler::new();
        let _count = AtomicUsize::new(0);
        assert_eq!(_count.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn test_background_scheduler_integration() {
        let scheduler = BackgroundScheduler::new();
        let _receiver = scheduler.subscribe();
    }
}
