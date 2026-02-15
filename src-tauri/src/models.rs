use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// AI 使用记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiUsageRecord {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    /// "summary" | "translation"
    pub operation_type: String,
    pub model: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
    pub article_id: Option<String>,
}

impl AiUsageRecord {
    pub fn new(
        operation_type: &str,
        model: &str,
        prompt_tokens: u32,
        completion_tokens: u32,
        article_id: Option<&str>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            operation_type: operation_type.to_string(),
            model: model.to_string(),
            prompt_tokens,
            completion_tokens,
            total_tokens: prompt_tokens + completion_tokens,
            article_id: article_id.map(|s| s.to_string()),
        }
    }
}

/// AI 使用统计汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiUsageSummary {
    pub total_prompt_tokens: u64,
    pub total_completion_tokens: u64,
    pub total_tokens: u64,
    pub total_cost: f64,
    pub total_calls: u64,
    pub summary_tokens: u64,
    pub summary_cost: f64,
    pub summary_calls: u64,
    pub translation_tokens: u64,
    pub translation_cost: f64,
    pub translation_calls: u64,
    pub daily_stats: Vec<DailyUsageStats>,
}

/// 每日使用统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyUsageStats {
    pub date: String,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
    pub cost: f64,
    pub calls: u64,
}

/// RSS 订阅源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feed {
    pub id: String,
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub use_full_content: bool,
    #[serde(default)]
    pub use_ai_summary: bool,
    #[serde(default)]
    pub use_ai_translation: bool,
}

/// RSS 文章
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Article {
    pub id: String,
    pub feed_id: String,
    pub title: String,
    pub link: String,
    pub description: Option<String>,
    pub content: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub read: bool,
    pub created_at: DateTime<Utc>,
    /// 阅读进度 0.0-100.0
    #[serde(default)]
    pub reading_progress: f32,
    /// 是否收藏
    #[serde(default)]
    pub favorite: bool,
    /// 全文抓取的内容（与原始 content 分开存储）
    #[serde(default)]
    pub full_content: Option<String>,
    /// AI 生成的文章摘要
    #[serde(default)]
    pub ai_summary: Option<String>,
    /// AI 翻译的内容
    #[serde(default)]
    pub ai_translation: Option<String>,
    /// AI 翻译的标题
    #[serde(default)]
    pub ai_translated_title: Option<String>,
    /// RSS 原始 GUID（用于去重）
    #[serde(default)]
    pub guid: Option<String>,
    /// 文章缩略图 URL
    #[serde(default)]
    pub thumbnail_url: Option<String>,
}

impl Article {
    /// 判断两篇文章是否为同一篇（同 feed 内去重）
    /// 优先用 guid+feed_id，fallback 到 link+feed_id
    pub fn is_duplicate_of(&self, other: &Article) -> bool {
        if self.feed_id != other.feed_id {
            return false;
        }
        if let (Some(ref g1), Some(ref g2)) = (&self.guid, &other.guid) {
            if !g1.is_empty() && !g2.is_empty() {
                return g1 == g2;
            }
        }
        self.link == other.link
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddFeedRequest {
    pub url: String,
    #[serde(default)]
    pub use_full_content: bool,
    #[serde(default)]
    pub use_ai_summary: bool,
    #[serde(default)]
    pub use_ai_translation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFeedRequest {
    pub id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub use_full_content: Option<bool>,
    pub use_ai_summary: Option<bool>,
    pub use_ai_translation: Option<bool>,
}

/// 获取文章的请求参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetArticlesRequest {
    pub feed_id: Option<String>,
    pub limit: Option<usize>,
    pub unread_only: Option<bool>,
}

/// API 响应包装
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedWithUnreadCount {
    pub feed: Feed,
    pub unread_count: usize,
}

/// 日志中的文章摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogArticleSummary {
    pub title: String,
    pub link: String,
}

/// 订阅刷新日志
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedLog {
    pub id: String,
    pub feed_id: String,
    pub feed_title: String,
    pub timestamp: DateTime<Utc>,
    pub success: bool,
    pub new_article_count: usize,
    pub new_articles: Vec<LogArticleSummary>,
    pub error: Option<String>,
    pub duration_ms: u64,
}

impl FeedLog {
    pub fn success(
        feed_id: String,
        feed_title: String,
        new_articles: Vec<LogArticleSummary>,
        duration_ms: u64,
    ) -> Self {
        let new_article_count = new_articles.len();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            feed_id,
            feed_title,
            timestamp: Utc::now(),
            success: true,
            new_article_count,
            new_articles,
            error: None,
            duration_ms,
        }
    }

    pub fn failure(feed_id: String, feed_title: String, error: String, duration_ms: u64) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            feed_id,
            feed_title,
            timestamp: Utc::now(),
            success: false,
            new_article_count: 0,
            new_articles: vec![],
            error: Some(error),
            duration_ms,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_article() -> Article {
        Article {
            id: "test-id".to_string(),
            feed_id: "feed-id".to_string(),
            title: "Test Article".to_string(),
            link: "https://example.com/article".to_string(),
            description: Some("Test description".to_string()),
            content: Some("<p>Content</p>".to_string()),
            published_at: Some(Utc::now()),
            read: false,
            created_at: Utc::now(),
            reading_progress: 0.0,
            favorite: false,
            full_content: None,
            ai_summary: None,
            ai_translation: None,
            ai_translated_title: None,
            guid: Some("test-guid".to_string()),
            thumbnail_url: None,
        }
    }

    #[test]
    fn test_article_has_thumbnail_url_field() {
        let article = create_test_article();
        assert!(article.thumbnail_url.is_none());

        let mut article_with_thumbnail = create_test_article();
        article_with_thumbnail.thumbnail_url = Some("https://example.com/image.jpg".to_string());
        assert_eq!(article_with_thumbnail.thumbnail_url, Some("https://example.com/image.jpg".to_string()));
    }

    #[test]
    fn test_article_serialization_with_thumbnail() {
        let mut article = create_test_article();
        article.thumbnail_url = Some("https://example.com/thumb.jpg".to_string());

        let json = serde_json::to_string(&article).unwrap();
        assert!(json.contains("thumbnail_url"));
        assert!(json.contains("https://example.com/thumb.jpg"));
    }

    #[test]
    fn test_article_deserialization_with_thumbnail() {
        let json = r#"{
            "id": "test-id",
            "feed_id": "feed-id",
            "title": "Test",
            "link": "https://example.com",
            "read": false,
            "created_at": "2024-01-01T00:00:00Z",
            "thumbnail_url": "https://example.com/image.png"
        }"#;

        let article: Article = serde_json::from_str(json).unwrap();
        assert_eq!(article.thumbnail_url, Some("https://example.com/image.png".to_string()));
    }

    #[test]
    fn test_article_deserialization_without_thumbnail() {
        let json = r#"{
            "id": "test-id",
            "feed_id": "feed-id",
            "title": "Test",
            "link": "https://example.com",
            "read": false,
            "created_at": "2024-01-01T00:00:00Z"
        }"#;

        let article: Article = serde_json::from_str(json).unwrap();
        // thumbnail_url 应该使用默认值 None
        assert!(article.thumbnail_url.is_none());
    }

    #[test]
    fn test_article_is_duplicate_same_feed_different_link() {
        let a1 = create_test_article();
        let mut a2 = create_test_article();
        a2.link = "https://example.com/different".to_string();
        a2.guid = None;

        assert!(!a1.is_duplicate_of(&a2));
    }
}
