use crate::settings::{AppSettings, NotificationType};
use crate::background_scheduler::NewArticlesEvent;
use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// 通知导航有效期（秒）
const PENDING_FEED_TIMEOUT_SECS: u64 = 30;

/// 待处理的通知导航目标（点击通知后跳转的 feed_id）
/// 超过 PENDING_FEED_TIMEOUT_SECS 秒后自动失效，避免用户很久之后切回窗口时意外跳转。
pub struct PendingNotificationFeed {
    inner: Mutex<Option<(String, Instant)>>,
}

impl PendingNotificationFeed {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    /// 设置待跳转的 feed_id（同时记录时间戳）
    pub fn set(&self, id: String) {
        let mut guard = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        *guard = Some((id, Instant::now()));
    }

    /// 取出并清除待跳转的 feed_id。超时则返回 None。
    pub fn take(&self) -> Option<String> {
        let mut guard = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        match guard.take() {
            Some((id, ts)) if ts.elapsed() < Duration::from_secs(PENDING_FEED_TIMEOUT_SECS) => {
                Some(id)
            }
            _ => None,
        }
    }

    /// 仅用于测试：以指定时间戳设置 feed_id
    #[cfg(test)]
    fn set_with_instant(&self, id: String, instant: Instant) {
        let mut guard = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        *guard = Some((id, instant));
    }
}

impl Default for PendingNotificationFeed {
    fn default() -> Self {
        Self::new()
    }
}

/// 通知管理器 - 使用 tauri-plugin-notification 发送 OS 系统通知
pub struct NotificationManager<R: Runtime> {
    app_handle: AppHandle<R>,
}

impl<R: Runtime> NotificationManager<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        Self { app_handle }
    }

    /// 发送新文章通知
    pub fn notify_new_articles(
        &self,
        event: &NewArticlesEvent,
        settings: &AppSettings,
    ) -> std::result::Result<(), String> {
        if !settings.enable_notifications {
            return Ok(());
        }

        match settings.notification_type {
            NotificationType::None => Ok(()),
            NotificationType::System => {
                self.send_system_notification(event, settings)
            }
        }
    }

    /// 通过 tauri-plugin-notification 发送 OS 系统通知
    fn send_system_notification(
        &self,
        event: &NewArticlesEvent,
        settings: &AppSettings,
    ) -> std::result::Result<(), String> {
        let title = if event.new_count == 1 {
            format!("来自 {} 的新文章", event.feed_title)
        } else {
            format!(
                "来自 {} 的 {} 篇新文章",
                event.feed_title, event.new_count
            )
        };

        let body = build_notification_body(
            &event.articles,
            event.new_count,
            settings.max_notifications_per_batch,
        );

        self.app_handle
            .notification()
            .builder()
            .title(&title)
            .body(&body)
            .show()
            .map_err(|e| format!("Failed to show notification: {}", e))
    }
}

/// 构建通知正文
fn build_notification_body(
    articles: &[crate::background_scheduler::ArticleSummary],
    new_count: usize,
    max_per_batch: usize,
) -> String {
    let count = new_count.min(max_per_batch);
    let max_title_len = 80;
    let titles: Vec<String> = articles
        .iter()
        .take(count)
        .map(|a| {
            if a.title.len() > max_title_len {
                format!("{}...", &a.title[..a.title.floor_char_boundary(max_title_len)])
            } else {
                a.title.clone()
            }
        })
        .collect();
    let shown = titles.len();
    let articles_text = titles.join("\n");

    let others = new_count.saturating_sub(shown);
    if others > 0 {
        format!("{}\n...还有 {} 篇文章", articles_text, others)
    } else {
        articles_text
    }
}

// ============= 测试模块 =============
#[cfg(test)]
mod tests {
    use super::*;
    use crate::background_scheduler::ArticleSummary;

    fn make_articles(n: usize) -> Vec<ArticleSummary> {
        (1..=n)
            .map(|i| ArticleSummary {
                id: format!("{}", i),
                title: format!("Article {}", i),
                url: format!("https://example.com/{}", i),
            })
            .collect()
    }

    #[test]
    fn test_build_body_within_limit() {
        let articles = make_articles(3);
        let body = build_notification_body(&articles, 3, 5);
        assert_eq!(body, "Article 1\nArticle 2\nArticle 3");
    }

    #[test]
    fn test_build_body_exceeds_limit() {
        let articles = make_articles(5);
        let body = build_notification_body(&articles, 8, 3);
        assert!(body.contains("Article 1"));
        assert!(body.contains("Article 2"));
        assert!(body.contains("Article 3"));
        assert!(body.contains("还有 5 篇文章"));
    }

    #[test]
    fn test_build_body_empty() {
        let articles: Vec<ArticleSummary> = vec![];
        let body = build_notification_body(&articles, 0, 5);
        assert_eq!(body, "");
    }

    #[test]
    fn test_build_body_single_article() {
        let articles = make_articles(1);
        let body = build_notification_body(&articles, 1, 5);
        assert_eq!(body, "Article 1");
    }

    #[test]
    fn test_build_body_exact_limit() {
        let articles = make_articles(5);
        let body = build_notification_body(&articles, 5, 5);
        assert_eq!(
            body,
            "Article 1\nArticle 2\nArticle 3\nArticle 4\nArticle 5"
        );
        assert!(!body.contains("还有"));
    }

    #[test]
    fn test_notification_title_single() {
        let title = format!("来自 {} 的新文章", "Test Feed");
        assert_eq!(title, "来自 Test Feed 的新文章");
    }

    #[test]
    fn test_notification_title_multiple() {
        let title = format!("来自 {} 的 {} 篇新文章", "Test Feed", 5);
        assert_eq!(title, "来自 Test Feed 的 5 篇新文章");
    }

    #[test]
    fn test_notification_event_structure() {
        let event = NewArticlesEvent {
            feed_id: "test-feed".to_string(),
            feed_title: "Test Feed".to_string(),
            new_count: 3,
            articles: make_articles(3),
        };
        assert_eq!(event.feed_id, "test-feed");
        assert_eq!(event.new_count, 3);
        assert_eq!(event.articles.len(), 3);
    }

    #[test]
    fn test_settings_notification_disabled() {
        let settings = AppSettings {
            enable_notifications: false,
            ..Default::default()
        };
        assert!(!settings.enable_notifications);
    }

    #[test]
    fn test_settings_notification_type_none() {
        let settings = AppSettings {
            notification_type: NotificationType::None,
            ..Default::default()
        };
        assert_eq!(settings.notification_type, NotificationType::None);
    }

    #[test]
    fn test_build_body_truncates_long_title() {
        let articles = vec![ArticleSummary {
            id: "1".to_string(),
            title: "A".repeat(200),
            url: "https://example.com/1".to_string(),
        }];
        let body = build_notification_body(&articles, 1, 5);
        assert!(body.len() < 200);
        assert!(body.ends_with("..."));
    }

    #[test]
    fn test_build_body_new_count_exceeds_articles_len() {
        // new_count=10 但只有 2 篇文章，max_per_batch=5
        let articles = make_articles(2);
        let body = build_notification_body(&articles, 10, 5);
        assert!(body.contains("Article 1"));
        assert!(body.contains("Article 2"));
        // others = 10 - 2(shown) = 8
        assert!(body.contains("还有 8 篇文章"));
    }

    // ---- PendingNotificationFeed 测试 ----

    #[test]
    fn test_pending_feed_new_is_none() {
        let pending = PendingNotificationFeed::new();
        assert_eq!(pending.take(), None);
    }

    #[test]
    fn test_pending_feed_set_and_take() {
        let pending = PendingNotificationFeed::new();
        pending.set("feed-123".to_string());
        assert_eq!(pending.take(), Some("feed-123".to_string()));
    }

    #[test]
    fn test_pending_feed_take_clears_value() {
        let pending = PendingNotificationFeed::new();
        pending.set("feed-abc".to_string());
        let _ = pending.take(); // first take
        assert_eq!(pending.take(), None); // second take should be None
    }

    #[test]
    fn test_pending_feed_set_overwrites_previous() {
        let pending = PendingNotificationFeed::new();
        pending.set("feed-1".to_string());
        pending.set("feed-2".to_string());
        assert_eq!(pending.take(), Some("feed-2".to_string()));
    }

    #[test]
    fn test_pending_feed_expired_returns_none() {
        let pending = PendingNotificationFeed::new();
        // 设置一个 31 秒前的时间戳
        let expired = Instant::now() - Duration::from_secs(PENDING_FEED_TIMEOUT_SECS + 1);
        pending.set_with_instant("feed-old".to_string(), expired);
        assert_eq!(pending.take(), None);
    }

    #[test]
    fn test_pending_feed_within_timeout_returns_value() {
        let pending = PendingNotificationFeed::new();
        // 设置一个 5 秒前的时间戳（在 30 秒有效期内）
        let recent = Instant::now() - Duration::from_secs(5);
        pending.set_with_instant("feed-recent".to_string(), recent);
        assert_eq!(pending.take(), Some("feed-recent".to_string()));
    }

    #[test]
    fn test_pending_feed_concurrent_access() {
        use std::sync::Arc;
        let pending = Arc::new(PendingNotificationFeed::new());
        let mut handles = vec![];
        for i in 0..10 {
            let p = pending.clone();
            handles.push(std::thread::spawn(move || {
                p.set(format!("feed-{}", i));
            }));
        }
        for h in handles {
            h.join().unwrap();
        }
        assert!(pending.take().is_some());
        assert!(pending.take().is_none());
    }
}
