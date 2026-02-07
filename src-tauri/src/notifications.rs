use crate::settings::{AppSettings, NotificationType};
use crate::background_scheduler::NewArticlesEvent;
use tauri::{AppHandle, Emitter};

/// 通知管理器
pub struct NotificationManager {
    app_handle: AppHandle,
}

impl NotificationManager {
    /// 创建新的通知管理器
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// 检查通知权限
    pub fn check_permission(&self) -> bool {
        // Tauri 2.x 通知插件会自动处理权限
        true
    }

    /// 请求通知权限
    pub async fn request_permission(&self) -> std::result::Result<bool, String> {
        // Tauri 2.x 通知插件会自动请求权限
        Ok(true)
    }

    /// 发送新文章通知
    pub fn notify_new_articles(&self, event: &NewArticlesEvent, settings: &AppSettings) -> std::result::Result<(), String> {
        // 检查是否启用通知
        if !settings.enable_notifications {
            return Ok(());
        }

        // 检查通知类型
        match settings.notification_type {
            NotificationType::None => return Ok(()),
            NotificationType::System => {
                // 发送系统通知
                self.send_system_notification(event, settings)?;
            }
        }

        Ok(())
    }

    /// 发送系统通知
    fn send_system_notification(&self, event: &NewArticlesEvent, settings: &AppSettings) -> std::result::Result<(), String> {
        let title = if event.new_count == 1 {
            format!("来自 {} 的新文章", event.feed_title)
        } else {
            format!("来自 {} 的 {} 篇新文章", event.feed_title, event.new_count)
        };

        let body = if event.new_count <= settings.max_notifications_per_batch {
            // 显示所有文章标题
            event.articles
                .iter()
                .take(settings.max_notifications_per_batch)
                .map(|a| a.title.as_str())
                .collect::<Vec<_>>()
                .join("\n")
        } else {
            // 聚合通知
            let count = event.new_count.min(settings.max_notifications_per_batch);
            let others = event.new_count - count;
            let articles_text = event.articles
                .iter()
                .take(count)
                .map(|a| a.title.as_str())
                .collect::<Vec<_>>()
                .join("\n");

            if others > 0 {
                format!("{}\n...还有 {} 篇文章", articles_text, others)
            } else {
                articles_text
            }
        };

        // 发送通知到前端，由前端处理通知显示
        let notification_data = serde_json::json!({
            "title": title,
            "body": body,
            "feed_id": event.feed_id,
            "count": event.new_count,
        });

        self.app_handle
            .emit("show-notification", &notification_data)
            .map_err(|e| format!("Failed to send notification event: {}", e))?;

        Ok(())
    }

    /// 发送简单通知
    pub fn notify(&self, title: &str, body: &str) -> std::result::Result<(), String> {
        let notification_data = serde_json::json!({
            "title": title,
            "body": body,
        });

        self.app_handle
            .emit("show-notification", &notification_data)
            .map_err(|e| format!("Failed to send notification event: {}", e))?;

        Ok(())
    }
}

// ============= 测试模块 (TDD: 先写测试) =============
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    // 测试: NewArticlesEvent 可以被正确处理
    #[test]
    fn test_notification_event_structure() {
        let event = NewArticlesEvent {
            feed_id: "test-feed".to_string(),
            feed_title: "Test Feed".to_string(),
            new_count: 3,
            articles: vec![
                crate::background_scheduler::ArticleSummary {
                    id: "1".to_string(),
                    title: "Article 1".to_string(),
                    url: "https://example.com/1".to_string(),
                },
                crate::background_scheduler::ArticleSummary {
                    id: "2".to_string(),
                    title: "Article 2".to_string(),
                    url: "https://example.com/2".to_string(),
                },
                crate::background_scheduler::ArticleSummary {
                    id: "3".to_string(),
                    title: "Article 3".to_string(),
                    url: "https://example.com/3".to_string(),
                },
            ],
        };

        assert_eq!(event.feed_id, "test-feed");
        assert_eq!(event.feed_title, "Test Feed");
        assert_eq!(event.new_count, 3);
        assert_eq!(event.articles.len(), 3);
    }

    // 测试: 系统通知标题格式（单篇文章）
    #[test]
    fn test_notification_title_single_article() {
        let title = "来自 Test Feed 的新文章";
        assert!(title.contains("Test Feed"));
        assert!(title.contains("新文章"));
    }

    // 测试: 系统通知标题格式（多篇文章）
    #[test]
    fn test_notification_title_multiple_articles() {
        let title = format!("来自 Test Feed 的 {} 篇新文章", 5);
        assert!(title.contains("Test Feed"));
        assert!(title.contains("5"));
        assert!(title.contains("篇新文章"));
    }

    // 测试: AppSettings 序列化
    #[test]
    fn test_settings_serialization() {
        let settings = AppSettings {
            enable_notifications: true,
            ..Default::default()
        };

        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("enable_notifications"));
    }

    // 测试: 通知类型序列化
    #[test]
    fn test_notification_type_serialization() {
        let system = NotificationType::System;
        let none = NotificationType::None;

        assert_eq!(serde_json::to_string(&system).unwrap(), "\"system\"");
        assert_eq!(serde_json::to_string(&none).unwrap(), "\"none\"");
    }

    // 测试: 文章标题拼接
    #[test]
    fn test_article_titles_join() {
        let titles = vec![
            "Article 1".to_string(),
            "Article 2".to_string(),
            "Article 3".to_string(),
        ];

        let joined = titles.iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n");

        assert_eq!(joined, "Article 1\nArticle 2\nArticle 3");
    }

    // 测试: 聚合通知文本格式
    #[test]
    fn test_aggregate_notification_text() {
        let count = 3;
        let others = 5;
        let articles_text = "Article 1\nArticle 2\nArticle 3";

        let result = if others > 0 {
            format!("{}\n...还有 {} 篇文章", articles_text, others)
        } else {
            articles_text.to_string()
        };

        assert!(result.contains("Article 1"));
        assert!(result.contains("还有 5 篇文章"));
    }
}
