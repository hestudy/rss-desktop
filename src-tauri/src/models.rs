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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddFeedRequest {
    pub url: String,
    #[serde(default)]
    pub use_full_content: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFeedRequest {
    pub id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub use_full_content: Option<bool>,
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
