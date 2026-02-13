use crate::error::Result;
use crate::error::RssError;
use crate::models::{Article, Feed};
use chrono::Utc;
use feed_rs::parser;
use std::time::Duration;
use uuid::Uuid;

/// 最大允许的文章数量限制
pub const MAX_ARTICLES_PER_FETCH: usize = 500;

/// 类型别名，避免 `>>` 解析歧义
type FeedResult = (Feed, Vec<Article>);

/// 验证 URL 并防止 SSRF 攻击
pub fn validate_url(url: &str) -> Result<bool> {
    // 基本 URL 格式验证
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(RssError::InvalidUrl(
            "Only HTTP and HTTPS URLs are allowed".to_string(),
        ));
    }

    // 检查是否包含 localhost 或私有 IP
    let url_lower = url.to_lowercase();
    if url_lower.contains("localhost")
        || url_lower.contains("127.0.0.1")
        || url_lower.contains("192.168.")
        || url_lower.contains("10.")
        || url_lower.contains("172.16.")
    {
        return Err(RssError::InvalidUrl(
            "Access to private hosts is not allowed".to_string(),
        ));
    }

    Ok(true)
}

/// 从 URL 获取并解析 RSS Feed
pub fn fetch_feed(url: &str) -> Result<FeedResult> {
    // 验证 URL（防止 SSRF）
    validate_url(url)?;

    // 使用 ureq 获取内容 - 增加超时时间以支持大型 RSS feeds
    let response = ureq::get(url)
        .set("User-Agent", "RSS-Desktop/0.1.0")
        .timeout(Duration::from_secs(60)) // 增加到 60 秒
        .call()
        .map_err(|e| {
            RssError::IoError(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Network error: {}", e),
            ))
        })?;

    // 检查响应状态 (200-299)
    let status = response.status();
    if status < 200 || status >= 300 {
        return Err(RssError::InvalidUrl(format!(
            "HTTP error: {} - Server returned non-success status",
            status
        )));
    }

    // 获取响应内容 - 捕获读取错误
    let feed_text = response.into_string().map_err(|e| {
        RssError::IoError(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to read response: {}", e),
        ))
    })?;

    // 检查内容长度
    if feed_text.is_empty() {
        return Err(RssError::FeedError(
            "Empty response from server".to_string(),
        ));
    }

    // 解析 RSS/Atom feed
    let parsed_feed = parser::parse(feed_text.as_bytes())
        .map_err(|e| RssError::FeedError(format!("Failed to parse RSS feed: {}", e)))?;

    let title = parsed_feed
        .title
        .map(|t| t.content)
        .unwrap_or_else(|| "Untitled Feed".to_string());

    let description = parsed_feed.description.map(|d| d.content);

    let feed_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    // Feed RSS 图标处理
    let icon_url = parsed_feed.icon.map(|icon| icon.uri);

    let feed = Feed {
        id: feed_id.clone(),
        url: url.to_string(),
        title: title.clone(),
        description,
        icon_url,
        created_at: now,
        updated_at: now,
        use_full_content: false,
        use_ai_summary: false,
        use_ai_translation: false,
    };

    let articles: Vec<Article> = parsed_feed
        .entries
        .into_iter()
        .filter_map(|entry| {
            let title = entry.title.map(|t| t.content)?;
            let link = entry
                .links
                .first()
                .map(|l| l.href.to_string())
                .unwrap_or_else(|| "about:blank".to_string());

            let guid = {
                let trimmed = entry.id.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            };

            let published_at = entry.published.or(entry.updated);
            let content = entry.content.and_then(|c| c.body);

            Some(Article {
                id: Uuid::new_v4().to_string(),
                feed_id: feed_id.clone(),
                title,
                link,
                description: entry.summary.map(|s| s.content),
                content,
                published_at,
                read: false,
                created_at: now,
                reading_progress: 0.0,
                favorite: false,
                full_content: None,
                ai_summary: None,
                ai_translation: None,
                ai_translated_title: None,
                guid,
            })
        })
        .take(MAX_ARTICLES_PER_FETCH) // 限制文章数量
        .collect();

    Ok((feed, articles))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_url_valid_https() {
        let result = validate_url("https://example.com/feed.xml");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_url_valid_http() {
        let result = validate_url("http://example.com/feed.xml");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_url_invalid_scheme() {
        let result = validate_url("file:///etc/passwd");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_localhost_blocked() {
        let result = validate_url("http://localhost/feed.xml");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_private_ip_blocked() {
        let result = validate_url("http://127.0.0.1/feed.xml");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_private_ip_192_blocked() {
        let result = validate_url("http://192.168.1.1/feed.xml");
        assert!(result.is_err());
    }

    #[test]
    fn test_fetch_feed_mock() {
        let result = fetch_feed("https://example.com/feed.xml");
        // 预期会失败，因为这不是真实的 RSS URL
        assert!(result.is_err());
    }
}
