use crate::error::{Result, RssError};
use crate::fetcher::validate_url;
use dom_smoothie::{Config, Readability};
use std::time::Duration;

const MAX_CONTENT_SIZE: usize = 1_048_576; // 1MB

pub fn fetch_and_extract_content(url: &str) -> Result<String> {
    // SSRF 防护
    validate_url(url)?;

    let response = ureq::get(url)
        .set("User-Agent", "Mozilla/5.0 (compatible; RSS-Desktop/0.1.0)")
        .set(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        )
        .set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
        .timeout(Duration::from_secs(30))
        .call()
        .map_err(|e| RssError::ContentExtractionError(format!("页面请求失败: {}", e)))?;

    let status = response.status();
    if status < 200 || status >= 300 {
        return Err(RssError::ContentExtractionError(format!(
            "服务器返回错误状态码: {}",
            status
        )));
    }

    let html = response
        .into_string()
        .map_err(|e| RssError::ContentExtractionError(format!("读取响应内容失败: {}", e)))?;

    if html.is_empty() {
        return Err(RssError::ContentExtractionError(
            "服务器返回了空响应".to_string(),
        ));
    }

    if html.len() > MAX_CONTENT_SIZE {
        return Err(RssError::ContentExtractionError(format!(
            "页面内容过大: {} 字节（最大: {} 字节）",
            html.len(),
            MAX_CONTENT_SIZE
        )));
    }

    extract_content_from_html(&html, Some(url))
}

pub fn extract_content_from_html(html: &str, url: Option<&str>) -> Result<String> {
    if is_likely_spa(html) {
        return Err(RssError::ContentExtractionError(
            "该页面使用 JavaScript 动态渲染内容，无法提取全文".to_string(),
        ));
    }

    let cfg = Config {
        max_elements_to_parse: 5000,
        ..Default::default()
    };

    let mut readability = Readability::new(html, url, Some(cfg))
        .map_err(|e| RssError::ContentExtractionError(format!("HTML 解析失败: {}", e)))?;

    let article = readability
        .parse()
        .map_err(|e| RssError::ContentExtractionError(format!("内容提取失败: {}", e)))?;

    let content = article.content.to_string();

    if content.trim().is_empty() {
        return Err(RssError::ContentExtractionError(
            "未找到可读内容".to_string(),
        ));
    }

    Ok(content)
}

fn is_likely_spa(html: &str) -> bool {
    let html_lower = html.to_lowercase();

    let has_spa_root = html_lower.contains(r#"id="root""#)
        || html_lower.contains("id='root'")
        || html_lower.contains(r#"id="app""#)
        || html_lower.contains("id='app'")
        || html_lower.contains(r#"id="__next""#)
        || html_lower.contains("id='__next'")
        || html_lower.contains(r#"id="__nuxt""#)
        || html_lower.contains("id='__nuxt'");

    if !has_spa_root {
        return false;
    }

    let body_content = html_lower
        .split("<body")
        .nth(1)
        .and_then(|s| s.split("</body>").next())
        .unwrap_or("");

    let text_len: usize = body_content
        .split('<')
        .filter_map(|s| s.split_once('>').map(|(_, text)| text.trim().len()))
        .sum();

    text_len < 100
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_content_from_simple_html() {
        let html = r#"
        <html>
        <head><title>Test Article</title></head>
        <body>
            <nav>Navigation links here</nav>
            <article>
                <h1>Test Article Title</h1>
                <p>This is the main content of the article. It contains enough text
                to be recognized as the primary content by the readability algorithm.
                We need to make sure there is sufficient content here for the algorithm
                to properly identify this as the main article body.</p>
                <p>Here is another paragraph with more content. The readability algorithm
                needs multiple paragraphs with substantial text to properly identify
                the main content area of the page.</p>
                <p>And yet another paragraph to ensure we have enough content for the
                extraction algorithm to work correctly. This should be more than enough
                text for the readability heuristics to kick in.</p>
            </article>
            <footer>Footer content here</footer>
        </body>
        </html>
        "#;

        let result = extract_content_from_html(html, None);
        assert!(result.is_ok(), "Should extract content: {:?}", result.err());

        let content = result.unwrap();
        assert!(
            content.contains("main content of the article"),
            "Should contain article text, got: {}",
            content
        );
    }

    #[test]
    fn test_extract_content_empty_html() {
        let html = "<html><body></body></html>";
        let result = extract_content_from_html(html, None);
        assert!(result.is_err(), "Should fail on empty content");
    }

    #[test]
    fn test_extract_content_no_article() {
        let html = "<html><head></head><body></body></html>";
        let result = extract_content_from_html(html, None);
        assert!(
            result.is_err(),
            "Should fail when no readable content found"
        );
    }

    #[test]
    fn test_fetch_invalid_url() {
        let result = fetch_and_extract_content("ftp://example.com");
        assert!(result.is_err(), "Should reject non-HTTP URLs");
    }

    #[test]
    fn test_fetch_localhost_blocked() {
        let result = fetch_and_extract_content("http://localhost/article");
        assert!(result.is_err(), "Should block localhost");
    }

    #[test]
    fn test_fetch_private_ip_blocked() {
        let result = fetch_and_extract_content("http://192.168.1.1/article");
        assert!(result.is_err(), "Should block private IPs");
    }

    #[test]
    fn test_extract_preserves_html_structure() {
        let html = r#"
        <html>
        <head><title>Structured Article</title></head>
        <body>
            <div id="content">
                <h1>Article with Structure</h1>
                <p>First paragraph with <strong>bold text</strong> and <em>italic text</em>.
                This paragraph needs to be long enough for the readability algorithm to
                properly identify it as meaningful content.</p>
                <p>Second paragraph with a <a href="https://example.com">link</a>.
                Again, we need sufficient text here for the algorithm to work properly
                and extract the content correctly.</p>
                <ul>
                    <li>List item one with some descriptive text</li>
                    <li>List item two with some descriptive text</li>
                    <li>List item three with some descriptive text</li>
                </ul>
                <p>Third paragraph to ensure we have enough content for extraction.
                The readability algorithm uses various heuristics to determine what
                constitutes the main content of a page.</p>
            </div>
        </body>
        </html>
        "#;

        let result = extract_content_from_html(html, None);
        assert!(
            result.is_ok(),
            "Should extract structured content: {:?}",
            result.err()
        );

        let content = result.unwrap();
        assert!(
            content.contains("<p>") || content.contains("<div>"),
            "Should preserve HTML tags"
        );
    }

    #[test]
    fn test_detect_spa_page() {
        let spa_html = r#"
        <html><head><title>App</title></head>
        <body><div id="root"></div>
        <script type="module" src="/assets/app.js"></script>
        </body></html>"#;
        assert!(is_likely_spa(spa_html));
    }

    #[test]
    fn test_normal_page_not_detected_as_spa() {
        let normal_html = r#"
        <html><head><title>Article</title></head>
        <body><div id="root">
        <article><h1>Title</h1>
        <p>This is a real article with substantial content that should not be
        detected as a SPA page because it has meaningful text content in the body
        and enough words to pass the threshold check.</p>
        </article></div></body></html>"#;
        assert!(!is_likely_spa(normal_html));
    }

    #[test]
    fn test_spa_extract_returns_meaningful_error() {
        let spa_html = r#"
        <html><head><title>App</title></head>
        <body class="min-h-screen"><div id="root"></div>
        <script type="module" crossorigin src="/assets/app.js"></script>
        </body></html>"#;
        let result = extract_content_from_html(spa_html, None);
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("JavaScript"),
            "Error should mention JavaScript: {}",
            err_msg
        );
    }

    #[test]
    fn test_spa_single_quote_attributes() {
        let spa_html = r#"
        <html><head><title>App</title></head>
        <body><div id='root'></div>
        <script type="module" src="/assets/app.js"></script>
        </body></html>"#;
        assert!(is_likely_spa(spa_html));
    }

    #[test]
    fn test_no_spa_root_not_detected() {
        let html = r#"
        <html><head><title>Page</title></head>
        <body><div id="content"></div>
        <script src="/app.js"></script>
        </body></html>"#;
        assert!(!is_likely_spa(html));
    }

    #[test]
    fn test_spa_boundary_text_at_threshold() {
        let padding = "x".repeat(100);
        let html = format!(
            r#"<html><head></head><body><div id="root">{}</div></body></html>"#,
            padding
        );
        assert!(!is_likely_spa(&html));
    }

    #[test]
    fn test_spa_boundary_text_below_threshold() {
        let padding = "x".repeat(99);
        let html = format!(
            r#"<html><head></head><body><div id="root">{}</div></body></html>"#,
            padding
        );
        assert!(is_likely_spa(&html));
    }
}
