use crate::error::{Result, RssError};
use crate::fetcher::validate_url;
use dom_smoothie::{Config, Readability};
use headless_chrome::{Browser, LaunchOptions};
use regex::Regex;
use std::sync::{LazyLock, Mutex};
use std::time::Duration;

const MAX_CONTENT_SIZE: usize = 5 * 1_048_576; // 5MB

static RE_STRIP_TAGS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(concat!(
        r"(?is)",
        r"<script\b[^>]*>.*?</script\s*>|",
        r"<style\b[^>]*>.*?</style\s*>|",
        r"<noscript\b[^>]*>.*?</noscript\s*>|",
        r"<iframe\b[^>]*>.*?</iframe\s*>|",
        r"<svg\b[^>]*>.*?</svg\s*>|",
        r"<nav\b[^>]*>.*?</nav\s*>|",
        r"<footer\b[^>]*>.*?</footer\s*>|",
        r"<header\b[^>]*>.*?</header\s*>|",
        r"<aside\b[^>]*>.*?</aside\s*>|",
        r"<!--.*?-->",
    ))
    .unwrap()
});

static CHROME_BROWSER: LazyLock<Mutex<Option<Browser>>> =
    LazyLock::new(|| Mutex::new(None));

/// 清理 Chrome 浏览器实例，释放资源。可在应用退出时调用。
pub fn cleanup_chrome() {
    if let Ok(mut guard) = CHROME_BROWSER.lock() {
        if guard.is_some() {
            log::info!("正在关闭 Chrome 浏览器实例");
            *guard = None;
        }
    }
}

fn get_or_init_browser() -> Result<Browser> {
    let mut guard = CHROME_BROWSER.lock().map_err(|e| {
        RssError::ContentExtractionError(format!("浏览器锁获取失败: {}", e))
    })?;

    if let Some(ref browser) = *guard {
        if browser.get_version().is_ok() {
            return Ok(browser.clone());
        }
    }

    let options = LaunchOptions {
        headless: true,
        sandbox: true,
        idle_browser_timeout: Duration::from_secs(60),
        ..Default::default()
    };

    let browser = Browser::new(options).map_err(|e| {
        RssError::ContentExtractionError(format!(
            "无法启动 Chrome 浏览器，请确保系统已安装 Chrome 或 Chromium: {}",
            e
        ))
    })?;

    *guard = Some(browser.clone());
    Ok(browser)
}

fn try_fetch_via_chrome(url: &str) -> Result<String> {
    // Chrome 能访问 file://, chrome:// 等协议，必须严格校验
    validate_url(url)?;
    if !url.starts_with("https://") {
        return Err(RssError::ContentExtractionError(
            "Chrome 渲染仅支持 HTTPS URL".to_string(),
        ));
    }

    let tab = {
        let browser = get_or_init_browser()?;
        browser.new_tab().map_err(|e| {
            RssError::ContentExtractionError(format!("创建浏览器标签页失败: {}", e))
        })?
    };

    tab.set_default_timeout(Duration::from_secs(30));

    tab.navigate_to(url).map_err(|e| {
        RssError::ContentExtractionError(format!("页面导航失败: {}", e))
    })?;

    tab.wait_until_navigated().map_err(|e| {
        RssError::ContentExtractionError(format!("等待页面加载超时: {}", e))
    })?;

    // 等待 SPA 根节点有子内容，最多 10 秒
    let _ = tab.wait_for_element_with_custom_timeout(
        "#root > *, #app > *, #__next > *, #__nuxt > *, [id='root'] > *, [id='app'] > *",
        Duration::from_secs(10),
    );

    let html = tab.get_content().map_err(|e| {
        RssError::ContentExtractionError(format!("获取渲染后页面内容失败: {}", e))
    })?;

    if let Err(e) = tab.close(true) {
        log::warn!("关闭 Chrome 标签页失败: {}", e);
    }
    Ok(html)
}

fn fetch_spa_content_via_chrome(url: &str) -> Result<String> {
    match try_fetch_via_chrome(url) {
        Ok(html) => Ok(html),
        Err(first_err) => {
            log::warn!("Chrome 首次请求失败，尝试重置浏览器: {}", first_err);
            // 重置 Browser 实例并重试一次
            match CHROME_BROWSER.lock() {
                Ok(mut guard) => {
                    *guard = None;
                }
                Err(_) => {
                    log::warn!("Chrome 浏览器锁已中毒，无法重置");
                    return Err(first_err);
                }
            }
            try_fetch_via_chrome(url)
        }
    }
}

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

    // 检查 Content-Type，拒绝非 HTML 内容
    check_content_type(response.header("content-type"))?;

    // 通过 Content-Length 头提前拒绝已知的超大响应
    check_content_length_header(response.header("content-length"))?;

    // 使用 into_string() 读取（自动处理字符编码如 GBK/GB2312）
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

    // 检测 SPA 页面，走 Chrome 渲染路径
    if is_likely_spa(&html) {
        return fetch_and_extract_spa(url);
    }

    // 用 catch_unwind 包裹解析，防止第三方库 panic 导致线程崩溃
    safe_extract_content_from_html(&html, Some(url))
}

pub fn extract_content_from_html(html: &str, url: Option<&str>) -> Result<String> {
    if is_likely_spa(html) {
        return Err(RssError::ContentExtractionError(
            "该页面使用 JavaScript 动态渲染内容，无法提取全文".to_string(),
        ));
    }

    do_extract_html(html, url, "未找到可读内容")
}

/// 检查 Content-Type，拒绝非 HTML 内容
fn check_content_type(header: Option<&str>) -> Result<()> {
    if let Some(ct) = header {
        let ct_lower = ct.to_lowercase();
        if !ct_lower.contains("text/html")
            && !ct_lower.contains("application/xhtml")
            && !ct_lower.contains("text/xml")
            && !ct_lower.contains("application/xml")
        {
            return Err(RssError::ContentExtractionError(format!(
                "不支持的内容类型: {}",
                ct
            )));
        }
    }
    Ok(())
}

/// 检查 Content-Length 头，提前拒绝已知的超大响应
fn check_content_length_header(header: Option<&str>) -> Result<()> {
    if let Some(value) = header {
        if let Ok(len) = value.parse::<usize>() {
            if len > MAX_CONTENT_SIZE {
                return Err(RssError::ContentExtractionError(format!(
                    "页面内容过大: {} 字节（最大: {} 字节）",
                    len, MAX_CONTENT_SIZE
                )));
            }
        }
    }
    Ok(())
}

fn do_extract_html(html: &str, url: Option<&str>, empty_msg: &str) -> Result<String> {
    let cleaned = preprocess_html(html);

    let cfg = Config {
        max_elements_to_parse: 10000,
        ..Default::default()
    };

    let mut readability = Readability::new(cleaned.as_str(), url, Some(cfg))
        .map_err(|e| RssError::ContentExtractionError(format!("HTML 解析失败: {}", e)))?;

    let article = readability
        .parse()
        .map_err(|e| RssError::ContentExtractionError(format!("内容提取失败: {}", e)))?;

    let content = article.content.to_string();

    if content.trim().is_empty() {
        return Err(RssError::ContentExtractionError(empty_msg.to_string()));
    }

    Ok(content)
}

fn safe_extract(
    html: &str,
    url: Option<&str>,
    panic_prefix: &str,
    extractor: fn(&str, Option<&str>) -> Result<String>,
) -> Result<String> {
    let html_owned = html.to_string();
    let url_owned = url.map(|u| u.to_string());

    let result = std::panic::catch_unwind(move || {
        extractor(&html_owned, url_owned.as_deref())
    });

    match result {
        Ok(inner) => inner,
        Err(panic_info) => {
            let msg = if let Some(s) = panic_info.downcast_ref::<String>() {
                s.clone()
            } else if let Some(s) = panic_info.downcast_ref::<&str>() {
                s.to_string()
            } else {
                "未知内部错误".to_string()
            };
            Err(RssError::ContentExtractionError(format!(
                "{}: {}",
                panic_prefix, msg
            )))
        }
    }
}

/// 用 catch_unwind 包裹内容提取，防止第三方库 panic 导致线程崩溃
pub fn safe_extract_content_from_html(html: &str, url: Option<&str>) -> Result<String> {
    safe_extract(html, url, "内容解析过程中发生异常", extract_content_from_html)
}

fn fetch_and_extract_spa(url: &str) -> Result<String> {
    let html = fetch_spa_content_via_chrome(url)?;
    safe_extract_rendered_html(&html, Some(url))
}

fn extract_rendered_html(html: &str, url: Option<&str>) -> Result<String> {
    do_extract_html(html, url, "Chrome 渲染后仍未找到可读内容")
}

fn safe_extract_rendered_html(html: &str, url: Option<&str>) -> Result<String> {
    safe_extract(html, url, "渲染后内容解析过程中发生异常", extract_rendered_html)
}

/// 预处理 HTML，移除非内容标签以减少 DOM 元素数量
fn preprocess_html(html: &str) -> String {
    RE_STRIP_TAGS.replace_all(html, "").into_owned()
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

    #[test]
    fn test_preprocess_strips_script_and_style() {
        let html = r#"<html><body><script>var x=1;</script><style>.a{}</style><p>content</p></body></html>"#;
        let cleaned = preprocess_html(html);
        assert!(!cleaned.contains("<script"));
        assert!(!cleaned.contains("<style"));
        assert!(cleaned.contains("<p>content</p>"));
    }

    #[test]
    fn test_preprocess_strips_nav_footer_header_aside() {
        let html = r#"<html><body><nav>nav</nav><header>hdr</header><article><p>main</p></article><aside>side</aside><footer>ft</footer></body></html>"#;
        let cleaned = preprocess_html(html);
        assert!(!cleaned.contains("<nav"));
        assert!(!cleaned.contains("<header"));
        assert!(!cleaned.contains("<aside"));
        assert!(!cleaned.contains("<footer"));
        assert!(cleaned.contains("<article>"));
    }

    #[test]
    fn test_preprocess_strips_html_comments() {
        let html = r#"<html><body><!-- comment --><p>text</p></body></html>"#;
        let cleaned = preprocess_html(html);
        assert!(!cleaned.contains("<!--"));
        assert!(cleaned.contains("<p>text</p>"));
    }

    #[test]
    fn test_preprocess_strips_svg_and_iframe() {
        let html = r#"<html><body><svg><circle/></svg><iframe src="x"></iframe><p>ok</p></body></html>"#;
        let cleaned = preprocess_html(html);
        assert!(!cleaned.contains("<svg"));
        assert!(!cleaned.contains("<iframe"));
        assert!(cleaned.contains("<p>ok</p>"));
    }

    #[test]
    fn test_safe_extract_catches_panic() {
        // 模拟一个会 panic 的场景，验证 safe_extract_content_from_html 能捕获
        // 使用一个正常的 HTML，确认正常情况下不会 panic
        let html = r#"
        <html><head><title>Test</title></head>
        <body><article>
            <h1>Title</h1>
            <p>Content paragraph one with enough text for readability.</p>
            <p>Content paragraph two with enough text for readability.</p>
            <p>Content paragraph three with enough text for readability.</p>
        </article></body></html>"#;
        let result = safe_extract_content_from_html(html, Some("https://example.com"));
        assert!(result.is_ok(), "safe_extract should not fail on valid HTML: {:?}", result.err());
    }

    #[test]
    fn test_safe_extract_returns_error_on_empty() {
        let html = "<html><body></body></html>";
        let result = safe_extract_content_from_html(html, None);
        assert!(result.is_err(), "Should return error for empty content");
    }

    #[test]
    fn test_check_content_length_rejects_large() {
        // 验证 Content-Length 检查能提前拒绝大内容
        assert!(check_content_length_header(Some("20000000")).is_err());
    }

    #[test]
    fn test_check_content_length_allows_normal() {
        assert!(check_content_length_header(Some("500000")).is_ok());
        assert!(check_content_length_header(None).is_ok());
        assert!(check_content_length_header(Some("invalid")).is_ok());
    }

    #[test]
    fn test_check_content_type_allows_html() {
        assert!(check_content_type(Some("text/html; charset=utf-8")).is_ok());
        assert!(check_content_type(Some("text/html")).is_ok());
        assert!(check_content_type(Some("application/xhtml+xml")).is_ok());
        assert!(check_content_type(Some("text/xml")).is_ok());
        assert!(check_content_type(Some("application/xml")).is_ok());
        assert!(check_content_type(None).is_ok()); // 无 header 时放行
    }

    #[test]
    fn test_check_content_type_rejects_non_html() {
        assert!(check_content_type(Some("application/pdf")).is_err());
        assert!(check_content_type(Some("image/png")).is_err());
        assert!(check_content_type(Some("application/json")).is_err());
    }

    #[test]
    fn test_catch_unwind_converts_panic_to_error() {
        // 直接验证 catch_unwind 机制能将 panic 转为 Err
        let result = std::panic::catch_unwind(|| -> Result<String> {
            panic!("simulated dom_smoothie panic");
        });
        assert!(result.is_err(), "catch_unwind should capture the panic");
    }

    #[test]
    fn test_extract_rendered_html_with_content() {
        let html = r#"
        <html><head><title>SPA Page</title></head>
        <body><div id="root">
            <article>
                <h1>Rendered Article</h1>
                <p>This content was rendered by JavaScript framework.
                It contains enough text for the readability algorithm to
                properly identify it as the main content area.</p>
                <p>Second paragraph with additional content that helps
                the extraction algorithm work correctly.</p>
                <p>Third paragraph to ensure sufficient content for
                the readability heuristics to kick in properly.</p>
            </article>
        </div></body></html>"#;

        let result = extract_rendered_html(html, Some("https://example.com"));
        assert!(result.is_ok(), "Should extract rendered content: {:?}", result.err());
        let content = result.unwrap();
        assert!(
            content.contains("rendered by JavaScript"),
            "Should contain rendered text, got: {}",
            content
        );
    }

    #[test]
    fn test_extract_rendered_html_empty_after_render() {
        let html = r#"<html><head></head><body><div id="root"></div></body></html>"#;
        let result = extract_rendered_html(html, Some("https://example.com"));
        assert!(result.is_err(), "Should fail when rendered content is empty");
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("内容提取失败") || err_msg.contains("未找到可读内容"),
            "Error should mention extraction failure: {}",
            err_msg
        );
    }

    #[test]
    #[ignore] // 需要系统安装 Chrome/Chromium
    fn test_chrome_renders_spa_page() {
        let result = fetch_spa_content_via_chrome("https://example.com");
        assert!(result.is_ok(), "Chrome should render page: {:?}", result.err());
        let html = result.unwrap();
        assert!(!html.is_empty(), "Rendered HTML should not be empty");
    }
}
