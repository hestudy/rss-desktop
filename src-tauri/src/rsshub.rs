//! RSSHub 集成模块
//!
//! 提供与 RSSHub 服务交互的功能：
//! - 获取 Radar 规则
//! - 从 URL 检测可用的 RSSHub 订阅
//! - 搜索 RSSHub 支持的路由

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 默认 RSSHub 实例 URL
pub const DEFAULT_RSSHUB_INSTANCE: &str = "https://rsshub.app";

/// Radar 规则缓存过期时间（秒）
const RADAR_CACHE_TTL: u64 = 3600; // 1 小时

/// User-Agent 用于 HTTP 请求
const USER_AGENT: &str = "RSS-Desktop/1.0 (RSS Reader)";

/// 获取内置的 Radar 规则（作为 fallback）
fn get_builtin_radar_rules() -> RadarRules {
    let mut rules: RadarRules = HashMap::new();

    // Bilibili
    rules.insert(
        "bilibili".to_string(),
        vec![
            RadarRule {
                title: "UP 主视频".to_string(),
                docs: Some("https://docs.rsshub.app/routes/bilibili#up-zhu-shi-pin".to_string()),
                source: r"/space\.bilibili\.com/(\d+)".to_string(),
                target: "/bilibili/user/video/:uid".to_string(),
                required: None,
            },
            RadarRule {
                title: "UP 主动态".to_string(),
                docs: Some("https://docs.rsshub.app/routes/bilibili#up-zhu-dong-tai".to_string()),
                source: r"/space\.bilibili\.com/(\d+)".to_string(),
                target: "/bilibili/user/dynamic/:uid".to_string(),
                required: None,
            },
            RadarRule {
                title: "番剧".to_string(),
                docs: Some("https://docs.rsshub.app/routes/bilibili#fan-ju".to_string()),
                source: r"/bilibili\.com/bangumi/media/md(\d+)".to_string(),
                target: "/bilibili/bangumi/media/:mediaId".to_string(),
                required: None,
            },
        ],
    );

    // YouTube
    rules.insert(
        "youtube".to_string(),
        vec![
            RadarRule {
                title: "用户视频".to_string(),
                docs: Some("https://docs.rsshub.app/routes/youtube#yong-hu".to_string()),
                source: r"/youtube\.com/@([^/]+)".to_string(),
                target: "/youtube/user/:username".to_string(),
                required: None,
            },
            RadarRule {
                title: "频道".to_string(),
                docs: Some("https://docs.rsshub.app/routes/youtube#pin-dao".to_string()),
                source: r"/youtube\.com/channel/([^/]+)".to_string(),
                target: "/youtube/channel/:channelId".to_string(),
                required: None,
            },
        ],
    );

    // Twitter/X
    rules.insert(
        "twitter".to_string(),
        vec![
            RadarRule {
                title: "用户时间线".to_string(),
                docs: Some("https://docs.rsshub.app/routes/twitter#yong-hu".to_string()),
                source: r"/(twitter|x)\.com/([^/]+)".to_string(),
                target: "/twitter/user/:id".to_string(),
                required: None,
            },
        ],
    );

    // 微博
    rules.insert(
        "weibo".to_string(),
        vec![
            RadarRule {
                title: "用户微博".to_string(),
                docs: Some("https://docs.rsshub.app/routes/weibo#yong-hu".to_string()),
                source: r"/weibo\.com/u/(\d+)".to_string(),
                target: "/weibo/user/:uid".to_string(),
                required: None,
            },
        ],
    );

    // 知乎
    rules.insert(
        "zhihu".to_string(),
        vec![
            RadarRule {
                title: "用户动态".to_string(),
                docs: Some("https://docs.rsshub.app/routes/zhihu#yong-hu".to_string()),
                source: r"/zhihu\.com/people/([^/]+)".to_string(),
                target: "/zhihu/people/activities/:id".to_string(),
                required: None,
            },
        ],
    );

    // GitHub
    rules.insert(
        "github".to_string(),
        vec![
            RadarRule {
                title: "仓库 Issues".to_string(),
                docs: Some("https://docs.rsshub.app/routes/github#issues".to_string()),
                source: r"/github\.com/([^/]+)/([^/]+)".to_string(),
                target: "/github/issue/:owner/:repo".to_string(),
                required: None,
            },
            RadarRule {
                title: "仓库 Releases".to_string(),
                docs: Some("https://docs.rsshub.app/routes/github#releases".to_string()),
                source: r"/github\.com/([^/]+)/([^/]+)".to_string(),
                target: "/github/release/:owner/:repo".to_string(),
                required: None,
            },
        ],
    );

    rules
}

/// RSSHub Radar 规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RadarRule {
    /// 规则标题
    pub title: String,
    /// 文档链接
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<String>,
    /// 源 URL 正则模式
    pub source: String,
    /// 目标 RSSHub 路由模板
    pub target: String,
    /// 需要的参数说明
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<Vec<String>>,
}

/// Radar 规则集合（按 namespace 分组）
pub type RadarRules = HashMap<String, Vec<RadarRule>>;

/// 检测到的 RSSHub 订阅
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedFeed {
    /// 平台/namespace 名称
    pub namespace: String,
    /// 规则标题
    pub title: String,
    /// 生成的 RSSHub RSS URL
    pub rss_url: String,
    /// 文档链接
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<String>,
    /// 源网站 URL
    pub source_url: String,
    /// 是否需要额外参数
    pub requires_params: bool,
    /// 需要的参数列表
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required_params: Option<Vec<String>>,
}

/// RSSHub 路由信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteInfo {
    /// 路由路径
    pub path: String,
    /// 平台/namespace
    pub namespace: String,
    /// 路由标题
    pub title: String,
    /// 描述
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// 文档链接
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<String>,
    /// 需要的参数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<Vec<String>>,
}

/// RSSHub 客户端
pub struct RSSHubClient {
    instance_url: String,
    client: ureq::Agent,
}

impl Default for RSSHubClient {
    fn default() -> Self {
        Self::new(DEFAULT_RSSHUB_INSTANCE.to_string())
    }
}

impl RSSHubClient {
    /// 创建新的 RSSHub 客户端
    pub fn new(instance_url: String) -> Self {
        let client = ureq::AgentBuilder::new()
            .user_agent(USER_AGENT)
            .build();
        Self {
            instance_url,
            client,
        }
    }

    /// 获取 Radar 规则
    /// 优先从 API 获取，失败时使用内置规则
    pub fn get_radar_rules(&self) -> Result<RadarRules, String> {
        let url = format!("{}/api/radar/rules", self.instance_url);

        // 尝试从 API 获取
        match self
            .client
            .get(&url)
            .set("Accept", "application/json")
            .call()
        {
            Ok(response) => {
                if response.status() == 200 {
                    match response.into_json::<RadarRules>() {
                        Ok(rules) => return Ok(rules),
                        Err(e) => {
                            log::warn!("Failed to parse radar rules: {}, using builtin rules", e);
                        }
                    }
                } else {
                    log::warn!(
                        "Radar API returned status {}, using builtin rules",
                        response.status()
                    );
                }
            }
            Err(e) => {
                log::warn!("Failed to fetch radar rules: {}, using builtin rules", e);
            }
        }

        // API 失败时使用内置规则
        Ok(get_builtin_radar_rules())
    }

    /// 从 URL 检测可用的 RSSHub 订阅
    pub fn detect_feeds(&self, url: &str) -> Result<Vec<DetectedFeed>, String> {
        let rules = self.get_radar_rules()?;
        let mut detected = Vec::new();

        for (namespace, namespace_rules) in rules.iter() {
            for rule in namespace_rules {
                if let Some(feed) = self.match_rule(namespace, rule, url) {
                    detected.push(feed);
                }
            }
        }

        Ok(detected)
    }

    /// 匹配规则并生成检测到的订阅
    fn match_rule(&self, namespace: &str, rule: &RadarRule, url: &str) -> Option<DetectedFeed> {
        // 尝试匹配并提取参数
        if let Some(resolved_path) = self.match_and_extract(url, &rule.source, &rule.target) {
            let rss_url = self.build_rss_url(&resolved_path);
            Some(DetectedFeed {
                namespace: namespace.to_string(),
                title: rule.title.clone(),
                rss_url,
                docs: rule.docs.clone(),
                source_url: url.to_string(),
                requires_params: rule.required.is_some(),
                required_params: rule.required.clone(),
            })
        } else {
            None
        }
    }

    /// 匹配 URL 并提取参数填充到目标路径
    fn match_and_extract(&self, url: &str, source_pattern: &str, target_template: &str) -> Option<String> {
        // 将 source 模式转换为正则表达式
        // source 格式如: /space\.bilibili\.com/(\d+)
        // 需要处理转义字符并构建完整的 URL 正则
        let regex_pattern = self.build_regex_from_source(source_pattern);

        match regex::RegexBuilder::new(&regex_pattern)
            .case_insensitive(true)
            .build()
        {
            Ok(re) => {
                if let Some(caps) = re.captures(url) {
                    // 提取捕获组并填充到目标模板
                    let mut resolved = target_template.to_string();

                    // 遍历捕获组（跳过第一个完整匹配）
                    for cap in caps.iter().skip(1) {
                        if let Some(value) = cap {
                            // 查找目标模板中的参数占位符 :param
                            // 按顺序替换
                            if let Some(param_start) = resolved.find(':') {
                                let param_end = resolved[param_start..]
                                    .find('/')
                                    .unwrap_or(resolved[param_start..].len());
                                let placeholder = &resolved[param_start..param_start + param_end];
                                resolved = resolved.replacen(placeholder, value.as_str(), 1);
                            }
                        }
                    }

                    // 检查是否还有未填充的参数
                    if resolved.contains(':') {
                        // 仍有未填充的参数，返回 None
                        None
                    } else {
                        Some(resolved)
                    }
                } else {
                    None
                }
            }
            Err(_) => {
                // 正则编译失败，使用简单的包含匹配
                if url.contains(&source_pattern.replace('\\', "").replace('.', "")) {
                    Some(target_template.to_string())
                } else {
                    None
                }
            }
        }
    }

    /// 从 source 模式构建正则表达式
    fn build_regex_from_source(&self, source: &str) -> String {
        // source 格式: /space\.bilibili\.com/(\d+)
        // 转换为: https?://[^/]*space\.bilibili\.com/(\d+)

        let mut pattern = String::new();

        // 添加协议前缀
        pattern.push_str("https?://[^/]*");

        // 处理 source 模式
        // 移除开头的斜杠，并确保正确转义
        let source = source.trim_start_matches('/');

        pattern.push_str(source);

        // 允许 URL 后面有其他内容
        pattern.push_str(".*");

        pattern
    }

    /// 构建 RSSHub RSS URL
    pub fn build_rss_url(&self, path: &str) -> String {
        let base = self.instance_url.trim_end_matches('/');
        let path = if path.starts_with('/') {
            path
        } else {
            &format!("/{}", path)
        };
        format!("{}{}", base, path)
    }

    /// 测试连接
    pub fn test_connection(&self) -> Result<bool, String> {
        let url = format!("{}/", self.instance_url);

        match self.client.get(&url).set("Accept", "*/*").call() {
            Ok(response) => Ok(response.status() == 200),
            Err(_) => Ok(false),
        }
    }

    /// 搜索路由
    pub fn search_routes(&self, query: &str) -> Result<Vec<RouteInfo>, String> {
        let rules = self.get_radar_rules()?;
        let query_lower = query.to_lowercase();
        let mut routes = Vec::new();

        for (namespace, namespace_rules) in rules.iter() {
            for rule in namespace_rules {
                // 搜索匹配：namespace、标题
                if namespace.to_lowercase().contains(&query_lower)
                    || rule.title.to_lowercase().contains(&query_lower)
                {
                    routes.push(RouteInfo {
                        path: rule.target.clone(),
                        namespace: namespace.clone(),
                        title: rule.title.clone(),
                        description: None,
                        docs: rule.docs.clone(),
                        required: rule.required.clone(),
                    });
                }
            }
        }

        Ok(routes)
    }
}

/// 缓存的 Radar 规则
pub struct CachedRadarRules {
    rules: Option<RadarRules>,
    fetched_at: Option<std::time::Instant>,
    cache_ttl: u64,
}

impl Default for CachedRadarRules {
    fn default() -> Self {
        Self::new()
    }
}

impl CachedRadarRules {
    pub fn new() -> Self {
        Self {
            rules: None,
            fetched_at: None,
            cache_ttl: RADAR_CACHE_TTL,
        }
    }

    /// 检查缓存是否有效
    pub fn is_valid(&self) -> bool {
        match (&self.rules, self.fetched_at) {
            (Some(_), Some(fetched_at)) => {
                let now = std::time::Instant::now();
                now.duration_since(fetched_at).as_secs() < self.cache_ttl
            }
            _ => false,
        }
    }

    /// 获取规则（使用缓存）
    pub fn get(&mut self, client: &RSSHubClient) -> Result<&RadarRules, String> {
        // 如果缓存有效，直接返回
        if self.is_valid() {
            return Ok(self.rules.as_ref().unwrap());
        }

        // 缓存无效，获取新规则
        let rules = client.get_radar_rules()?;
        self.rules = Some(rules);
        self.fetched_at = Some(std::time::Instant::now());

        Ok(self.rules.as_ref().unwrap())
    }

    /// 清除缓存
    pub fn clear(&mut self) {
        self.rules = None;
        self.fetched_at = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_rss_url() {
        let client = RSSHubClient::default();

        // 测试正常路径
        assert_eq!(
            client.build_rss_url("/bilibili/user/video/123456"),
            "https://rsshub.app/bilibili/user/video/123456"
        );

        // 测试无前缀斜杠
        assert_eq!(
            client.build_rss_url("bilibili/user/video/123456"),
            "https://rsshub.app/bilibili/user/video/123456"
        );
    }

    #[test]
    fn test_build_rss_url_custom_instance() {
        let client = RSSHubClient::new("https://my-rsshub.com".to_string());

        assert_eq!(
            client.build_rss_url("/bilibili/user/video/123456"),
            "https://my-rsshub.com/bilibili/user/video/123456"
        );
    }

    #[test]
    fn test_build_rss_url_trailing_slash() {
        let client = RSSHubClient::new("https://my-rsshub.com/".to_string());

        assert_eq!(
            client.build_rss_url("/bilibili/user/video/123456"),
            "https://my-rsshub.com/bilibili/user/video/123456"
        );
    }

    #[test]
    fn test_detect_feeds_structure() {
        let rule = RadarRule {
            title: "UP 主视频".to_string(),
            docs: Some("https://docs.rsshub.app/bilibili".to_string()),
            source: "/space.bilibili.com/(\\d+)".to_string(),
            target: "/bilibili/user/video/:uid".to_string(),
            required: None,
        };

        assert_eq!(rule.title, "UP 主视频");
        assert!(rule.docs.is_some());
    }

    #[test]
    fn test_detected_feed_serialization() {
        let feed = DetectedFeed {
            namespace: "bilibili".to_string(),
            title: "UP 主视频".to_string(),
            rss_url: "https://rsshub.app/bilibili/user/video/123456".to_string(),
            docs: Some("https://docs.rsshub.app/bilibili".to_string()),
            source_url: "https://space.bilibili.com/123456".to_string(),
            requires_params: false,
            required_params: None,
        };

        let json = serde_json::to_string(&feed).unwrap();
        assert!(json.contains("bilibili"));
        assert!(json.contains("UP 主视频"));
    }

    #[test]
    fn test_cached_radar_rules_new() {
        let cache = CachedRadarRules::new();
        assert!(cache.rules.is_none());
        assert!(cache.fetched_at.is_none());
    }

    #[test]
    fn test_cached_radar_rules_clear() {
        let mut cache = CachedRadarRules::new();
        cache.rules = Some(HashMap::new());
        cache.fetched_at = Some(std::time::Instant::now());

        cache.clear();

        assert!(cache.rules.is_none());
        assert!(cache.fetched_at.is_none());
    }

    #[test]
    fn test_cached_radar_rules_get_returns_cached_data() {
        let mut cache = CachedRadarRules::new();
        let client = RSSHubClient::default();

        // 首次获取
        let rules1 = cache.get(&client).unwrap();
        assert!(!rules1.is_empty());

        // 再次获取应该返回缓存的数据
        let rules2 = cache.get(&client).unwrap();
        assert!(!rules2.is_empty());
    }

    #[test]
    fn test_cached_radar_rules_is_valid() {
        let mut cache = CachedRadarRules::new();
        assert!(!cache.is_valid());

        // 获取规则后缓存应该有效
        let client = RSSHubClient::default();
        let _ = cache.get(&client);
        assert!(cache.is_valid());
    }

    #[test]
    fn test_url_match_and_extract_bilibili() {
        let client = RSSHubClient::default();
        let feeds = client.detect_feeds("https://space.bilibili.com/123456").unwrap();

        // 应该检测到至少一个 bilibili 订阅
        assert!(!feeds.is_empty());
        assert!(feeds.iter().any(|f| f.namespace == "bilibili"));

        // 检查 RSS URL 中包含提取的 UID
        let video_feed = feeds.iter().find(|f| f.title == "UP 主视频");
        assert!(video_feed.is_some());
        let feed = video_feed.unwrap();
        assert!(feed.rss_url.contains("123456"));
    }

    #[test]
    fn test_url_match_and_extract_youtube() {
        let client = RSSHubClient::default();
        let feeds = client.detect_feeds("https://www.youtube.com/@testuser").unwrap();

        // 应该检测到 YouTube 订阅
        assert!(!feeds.is_empty());
        assert!(feeds.iter().any(|f| f.namespace == "youtube"));
    }

    #[test]
    fn test_url_match_and_extract_github() {
        let client = RSSHubClient::default();
        let feeds = client.detect_feeds("https://github.com/owner/repo").unwrap();

        // 应该检测到 GitHub 订阅
        assert!(!feeds.is_empty());
        assert!(feeds.iter().any(|f| f.namespace == "github"));

        // 检查参数提取
        let issue_feed = feeds.iter().find(|f| f.title.contains("Issues"));
        assert!(issue_feed.is_some());
        let feed = issue_feed.unwrap();
        assert!(feed.rss_url.contains("owner"));
        assert!(feed.rss_url.contains("repo"));
    }

    #[test]
    fn test_url_no_match_returns_empty() {
        let client = RSSHubClient::default();
        let feeds = client.detect_feeds("https://example.com/unknown/path").unwrap();

        // 不应该检测到任何订阅
        assert!(feeds.is_empty());
    }

    #[test]
    fn test_route_info_creation() {
        let route = RouteInfo {
            path: "/bilibili/user/video/:uid".to_string(),
            namespace: "bilibili".to_string(),
            title: "UP 主视频".to_string(),
            description: Some("获取 UP 主的视频列表".to_string()),
            docs: Some("https://docs.rsshub.app/bilibili".to_string()),
            required: Some(vec!["uid".to_string()]),
        };

        assert_eq!(route.namespace, "bilibili");
        assert!(route.required.is_some());
    }
}
