use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// 轮询间隔配置
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PollInterval {
    /// 5 分钟
    #[serde(rename = "5m")]
    Minutes5,
    /// 15 分钟
    #[serde(rename = "15m")]
    Minutes15,
    /// 30 分钟
    #[serde(rename = "30m")]
    Minutes30,
    /// 1 小时
    #[serde(rename = "1h")]
    Hours1,
    /// 2 小时
    #[serde(rename = "2h")]
    Hours2,
    /// 6 小时
    #[serde(rename = "6h")]
    Hours6,
    /// 12 小时
    #[serde(rename = "12h")]
    Hours12,
    /// 24 小时
    #[serde(rename = "24h")]
    Hours24,
}

impl Default for PollInterval {
    fn default() -> Self {
        Self::Minutes30
    }
}

impl PollInterval {
    /// 转换为分钟数
    pub fn to_minutes(self) -> u64 {
        match self {
            Self::Minutes5 => 5,
            Self::Minutes15 => 15,
            Self::Minutes30 => 30,
            Self::Hours1 => 60,
            Self::Hours2 => 120,
            Self::Hours6 => 360,
            Self::Hours12 => 720,
            Self::Hours24 => 1440,
        }
    }

    /// 转换为秒数
    pub fn to_seconds(self) -> u64 {
        self.to_minutes() * 60
    }

    /// 转换为 Duration
    pub fn to_duration(self) -> std::time::Duration {
        std::time::Duration::from_secs(self.to_seconds())
    }
}

/// 通知类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    /// 系统通知
    System,
    /// 不通知
    None,
}

impl Default for NotificationType {
    fn default() -> Self {
        Self::System
    }
}

/// 应用设置
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    /// 轮询间隔
    #[serde(default)]
    pub poll_interval: PollInterval,

    /// 通知类型
    #[serde(default)]
    pub notification_type: NotificationType,

    /// 是否启用通知
    #[serde(default = "default_enable_notifications")]
    pub enable_notifications: bool,

    /// 每批次最大通知数量
    #[serde(default = "default_max_notifications")]
    pub max_notifications_per_batch: usize,

    /// 是否启用后台刷新
    #[serde(default)]
    pub enable_background_refresh: bool,
}

fn default_enable_notifications() -> bool {
    true
}

fn default_max_notifications() -> usize {
    5
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            poll_interval: PollInterval::default(),
            notification_type: NotificationType::default(),
            enable_notifications: default_enable_notifications(),
            max_notifications_per_batch: default_max_notifications(),
            enable_background_refresh: false,
        }
    }
}

/// 调度器状态
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct SchedulerState {
    /// 是否正在运行
    #[serde(default)]
    pub is_running: bool,

    /// 上次运行时间
    pub last_run_at: Option<DateTime<Utc>>,

    /// 下次运行时间
    pub next_run_at: Option<DateTime<Utc>>,

    /// 连续错误次数
    #[serde(default)]
    pub consecutive_errors: u32,
}

/// AI 摘要设置
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AiSettings {
    /// API 端点 (OpenAI 兼容格式)
    #[serde(default = "default_api_endpoint")]
    pub api_endpoint: String,

    /// API Key
    #[serde(default)]
    pub api_key: String,

    /// 模型名称
    #[serde(default = "default_model")]
    pub model: String,

    /// 最大 token 数
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,

    /// 自定义系统提示词
    #[serde(default = "default_prompt")]
    pub prompt: String,

    /// 是否启用自动摘要
    #[serde(default)]
    pub enable_auto_summary: bool,

    /// 摘要语言
    #[serde(default = "default_language")]
    pub language: String,

    #[serde(default = "default_max_concurrency")]
    pub max_concurrency: u32,

    /// 自定义 input 价格（$/M tokens），留空使用内置价格
    #[serde(default)]
    pub custom_input_price: Option<f64>,

    /// 自定义 output 价格（$/M tokens），留空使用内置价格
    #[serde(default)]
    pub custom_output_price: Option<f64>,
}

fn default_api_endpoint() -> String {
    "https://api.openai.com/v1".to_string()
}

fn default_model() -> String {
    "gpt-4o-mini".to_string()
}

fn default_max_tokens() -> u32 {
    300
}

fn default_prompt() -> String {
    "你是一个专业的文章摘要助手。请用简洁的语言总结以下文章的核心内容，包括主要观点和关键信息。"
        .to_string()
}

fn default_language() -> String {
    "zh-CN".to_string()
}

fn default_max_concurrency() -> u32 {
    3
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            api_endpoint: default_api_endpoint(),
            api_key: String::new(),
            model: default_model(),
            max_tokens: default_max_tokens(),
            prompt: default_prompt(),
            enable_auto_summary: false,
            language: default_language(),
            max_concurrency: default_max_concurrency(),
            custom_input_price: None,
            custom_output_price: None,
        }
    }
}

impl Default for SchedulerState {
    fn default() -> Self {
        Self {
            is_running: false,
            last_run_at: None,
            next_run_at: None,
            consecutive_errors: 0,
        }
    }
}

// ============= 测试模块 (TDD: 先写测试) =============
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    // 测试: PollInterval 默认值和序列化
    #[test]
    fn test_poll_interval_default_and_serialize() {
        let interval = PollInterval::default();
        assert_eq!(interval, PollInterval::Minutes30);

        // 测试序列化
        let json = serde_json::to_string(&interval).unwrap();
        assert_eq!(json, "\"30m\"");
    }

    // 测试: PollInterval 反序列化
    #[test]
    fn test_poll_interval_deserialize() {
        let cases = vec![
            ("5m", PollInterval::Minutes5),
            ("15m", PollInterval::Minutes15),
            ("30m", PollInterval::Minutes30),
            ("1h", PollInterval::Hours1),
            ("2h", PollInterval::Hours2),
            ("6h", PollInterval::Hours6),
            ("12h", PollInterval::Hours12),
            ("24h", PollInterval::Hours24),
        ];

        for (json_str, expected) in cases {
            let parsed: PollInterval = serde_json::from_str(&format!("\"{}\"", json_str)).unwrap();
            assert_eq!(parsed, expected, "Failed to parse {}", json_str);
        }
    }

    // 测试: PollInterval 转换为分钟数
    #[test]
    fn test_poll_interval_to_minutes() {
        assert_eq!(PollInterval::Minutes5.to_minutes(), 5);
        assert_eq!(PollInterval::Minutes15.to_minutes(), 15);
        assert_eq!(PollInterval::Minutes30.to_minutes(), 30);
        assert_eq!(PollInterval::Hours1.to_minutes(), 60);
        assert_eq!(PollInterval::Hours2.to_minutes(), 120);
        assert_eq!(PollInterval::Hours6.to_minutes(), 360);
        assert_eq!(PollInterval::Hours12.to_minutes(), 720);
        assert_eq!(PollInterval::Hours24.to_minutes(), 1440);
    }

    // 测试: PollInterval 反序列化失败处理
    #[test]
    fn test_poll_interval_invalid_deserialize() {
        let result: std::result::Result<PollInterval, _> = serde_json::from_str("\"invalid\"");
        assert!(result.is_err(), "Should fail to parse invalid interval");
    }

    // 测试: NotificationType 序列化
    #[test]
    fn test_notification_type_serialize() {
        assert_eq!(
            serde_json::to_string(&NotificationType::System).unwrap(),
            "\"system\""
        );
        assert_eq!(
            serde_json::to_string(&NotificationType::None).unwrap(),
            "\"none\""
        );
    }

    // 测试: NotificationType 反序列化
    #[test]
    fn test_notification_type_deserialize() {
        let sys: NotificationType = serde_json::from_str("\"system\"").unwrap();
        assert_eq!(sys, NotificationType::System);

        let none: NotificationType = serde_json::from_str("\"none\"").unwrap();
        assert_eq!(none, NotificationType::None);
    }

    // 测试: AppSettings 默认值
    #[test]
    fn test_app_settings_default() {
        let settings = AppSettings::default();

        assert_eq!(settings.poll_interval, PollInterval::Minutes30);
        assert_eq!(settings.notification_type, NotificationType::System);
        assert!(settings.enable_notifications);
        assert_eq!(settings.max_notifications_per_batch, 5);
        assert!(!settings.enable_background_refresh);
    }

    // 测试: AppSettings 序列化和反序列化
    #[test]
    fn test_app_settings_serialize_roundtrip() {
        let settings = AppSettings {
            poll_interval: PollInterval::Hours1,
            notification_type: NotificationType::System,
            enable_notifications: true,
            max_notifications_per_batch: 10,
            enable_background_refresh: true,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let parsed: AppSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.poll_interval, settings.poll_interval);
        assert_eq!(parsed.notification_type, settings.notification_type);
        assert_eq!(parsed.enable_notifications, settings.enable_notifications);
        assert_eq!(
            parsed.max_notifications_per_batch,
            settings.max_notifications_per_batch
        );
        assert_eq!(
            parsed.enable_background_refresh,
            settings.enable_background_refresh
        );
    }

    // 测试: AppSettings 缺失字段使用默认值
    #[test]
    fn test_app_settings_partial_deserialize() {
        let json = r#"{"poll_interval":"1h"}"#;
        let settings: AppSettings = serde_json::from_str(json).unwrap();

        assert_eq!(settings.poll_interval, PollInterval::Hours1);
        // 其他字段应使用默认值
        assert_eq!(settings.notification_type, NotificationType::System);
        assert!(settings.enable_notifications);
        assert_eq!(settings.max_notifications_per_batch, 5);
        assert!(!settings.enable_background_refresh);
    }

    // 测试: max_notifications_per_batch 边界值
    #[test]
    fn test_app_settings_max_notifications_bounds() {
        // 最小值
        let json = r#"{"max_notifications_per_batch":1}"#;
        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.max_notifications_per_batch, 1);

        // 较大值
        let json = r#"{"max_notifications_per_batch":100}"#;
        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.max_notifications_per_batch, 100);
    }

    // 测试: SchedulerState 序列化
    #[test]
    fn test_scheduler_state_serialize() {
        let state = SchedulerState {
            is_running: true,
            last_run_at: Some(DateTime::from_timestamp(1234567890, 0).unwrap()),
            next_run_at: Some(DateTime::from_timestamp(1234567900, 0).unwrap()),
            consecutive_errors: 3,
        };

        let json = serde_json::to_string(&state).unwrap();
        let parsed: SchedulerState = serde_json::from_str(&json).unwrap();

        assert!(parsed.is_running);
        assert_eq!(parsed.consecutive_errors, 3);
    }

    // 测试: SchedulerState 默认值
    #[test]
    fn test_scheduler_state_default() {
        let state = SchedulerState::default();

        assert!(!state.is_running);
        assert!(state.last_run_at.is_none());
        assert!(state.next_run_at.is_none());
        assert_eq!(state.consecutive_errors, 0);
    }

    // 测试: AiSettings 默认值
    #[test]
    fn test_ai_settings_default() {
        let settings = AiSettings::default();

        assert_eq!(settings.api_endpoint, "https://api.openai.com/v1");
        assert_eq!(settings.api_key, "");
        assert_eq!(settings.model, "gpt-4o-mini");
        assert_eq!(settings.max_tokens, 300);
        assert_eq!(
            settings.prompt,
            "你是一个专业的文章摘要助手。请用简洁的语言总结以下文章的核心内容，包括主要观点和关键信息。"
        );
        assert!(!settings.enable_auto_summary);
        assert_eq!(settings.language, "zh-CN");
    }

    // 测试: AiSettings 序列化和反序列化
    #[test]
    fn test_ai_settings_serialize_roundtrip() {
        let settings = AiSettings {
            api_endpoint: "https://example.com/v1".to_string(),
            api_key: "test-key".to_string(),
            model: "gpt-4.1-mini".to_string(),
            max_tokens: 512,
            prompt: "请简洁总结文章".to_string(),
            enable_auto_summary: true,
            language: "en-US".to_string(),
            max_concurrency: 5,
            custom_input_price: None,
            custom_output_price: None,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let parsed: AiSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed, settings);
    }

    // 测试: AiSettings 缺失字段使用默认值
    #[test]
    fn test_ai_settings_partial_deserialize() {
        let json = r#"{"apiKey":"k","enableAutoSummary":true}"#;
        let settings: AiSettings = serde_json::from_str(json).unwrap();

        assert_eq!(settings.api_endpoint, "https://api.openai.com/v1");
        assert_eq!(settings.api_key, "k");
        assert_eq!(settings.model, "gpt-4o-mini");
        assert_eq!(settings.max_tokens, 300);
        assert!(settings.enable_auto_summary);
        assert_eq!(settings.language, "zh-CN");
    }
}

/// 从 SqliteStorage KV 加载 AI 设置
pub fn load_ai_settings_from_storage(storage: &crate::storage_sqlite::SqliteStorage) -> AiSettings {
    match storage.get_kv("ai_settings") {
        Ok(Some(value)) => {
            serde_json::from_value(value).unwrap_or_default()
        }
        _ => AiSettings::default(),
    }
}

/// 从 SqliteStorage KV 加载应用设置
pub fn load_app_settings_from_storage(storage: &crate::storage_sqlite::SqliteStorage) -> AppSettings {
    match storage.get_kv("app_settings") {
        Ok(Some(value)) => {
            serde_json::from_value(value).unwrap_or_default()
        }
        _ => AppSettings::default(),
    }
}
