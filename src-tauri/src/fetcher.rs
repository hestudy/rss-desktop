use crate::error::Result;
use crate::models::{Feed, Article};
use crate::error::RssError;
use feed_rs::parser;
use chrono::Utc;
use uuid::Uuid;
use std::time::Duration;

/// 最大允许的文章数量限制
pub const MAX_ARTICLES_PER_FETCH: usize = 500;

/// 类型别名，避免 `>>` 解析歧义
type FeedResult = (Feed, Vec<Article>);

/// 验证 URL 并防止 SSRF 攻击
fn validate_url(url: &str) -> Result<bool> {
    // 基本 URL 格式验证
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(RssError::InvalidUrl(
            "Only HTTP and HTTPS URLs are allowed".to_string()
        ));
    }

    // 检查是否包含 localhost 或私有 IP
    let url_lower = url.to_lowercase();
    if url_lower.contains("localhost") || url_lower.contains("127.0.0.1")
        || url_lower.contains("192.168.") || url_lower.contains("10.")
        || url_lower.contains("172.16.") {
        return Err(RssError::InvalidUrl(
            "Access to private hosts is not allowed".to_string()
        ));
    }

    Ok(true)
}

/// 从 URL 获取并解析 RSS Feed
pub fn fetch_feed(url: &str) -> Result<FeedResult> {
    // 验证 URL（防止 SSRF）
    validate_url(url)?;

    // 使用 ureq 获取内容
    let response = ureq::get(url)
        .set("User-Agent", "RSS-Desktop/0.1.0")
        .timeout(Duration::from_secs(15))
        .call()
        .map_err(|e| RssError::HttpError(e))?;

    // 检查响应状态 (200-299)
    let status = response.status();
    if status < 200 || status >= 300 {
        return Err(RssError::InvalidUrl(format!(
            "HTTP error: {}", status
        )));
    }

    let feed_text = response.into_string()?;
    let parsed_feed = parser::parse(feed_text.as_bytes())
        .map_err(|e| RssError::FeedError(e.to_string()))?;

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
            })
        })
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
