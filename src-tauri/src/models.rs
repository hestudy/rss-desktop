use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

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
