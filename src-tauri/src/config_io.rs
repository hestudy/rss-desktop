use serde::{Deserialize, Serialize};
use crate::settings::{AiSettings, AppSettings};
use crate::models::Feed;

/// 当前配置版本
pub const CURRENT_CONFIG_VERSION: &str = "1.0";

/// Feed 导出数据结构 (不包含 id 和时间戳)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedExport {
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    #[serde(default)]
    pub use_full_content: bool,
    #[serde(default)]
    pub use_ai_summary: bool,
    #[serde(default)]
    pub use_ai_translation: bool,
}

impl From<&Feed> for FeedExport {
    fn from(feed: &Feed) -> Self {
        Self {
            url: feed.url.clone(),
            title: feed.title.clone(),
            description: feed.description.clone(),
            icon_url: feed.icon_url.clone(),
            use_full_content: feed.use_full_content,
            use_ai_summary: feed.use_ai_summary,
            use_ai_translation: feed.use_ai_translation,
        }
    }
}

/// AI 设置导出数据结构 (不包含敏感的 apiKey)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AiSettingsExport {
    pub api_endpoint: String,
    pub model: String,
    pub max_tokens: u32,
    pub prompt: String,
    pub enable_auto_summary: bool,
    pub language: String,
    pub max_concurrency: u32,
    pub custom_input_price: Option<f64>,
    pub custom_output_price: Option<f64>,
}

impl From<&AiSettings> for AiSettingsExport {
    fn from(settings: &AiSettings) -> Self {
        Self {
            api_endpoint: settings.api_endpoint.clone(),
            model: settings.model.clone(),
            max_tokens: settings.max_tokens,
            prompt: settings.prompt.clone(),
            enable_auto_summary: settings.enable_auto_summary,
            language: settings.language.clone(),
            max_concurrency: settings.max_concurrency,
            custom_input_price: settings.custom_input_price,
            custom_output_price: settings.custom_output_price,
            // Note: apiKey is intentionally NOT included
        }
    }
}

/// 应用设置导出数据结构
pub type AppSettingsExport = AppSettings;

/// 完整的导出配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedConfig {
    /// 配置版本号
    pub version: String,
    /// 导出时间 (ISO 字符串)
    pub exported_at: String,
    /// Feed 列表
    pub feeds: Vec<FeedExport>,
    /// AI 设置 (可选)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_settings: Option<AiSettingsExport>,
    /// 应用设置 (可选)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_settings: Option<AppSettingsExport>,
}

/// 导入结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    /// 是否成功
    pub success: bool,
    /// 导入的 Feed 数量
    pub feeds_imported: usize,
    /// 跳过的 Feed 数量 (重复或无效)
    pub feeds_skipped: usize,
    /// 是否导入了应用设置
    pub settings_imported: bool,
    /// 是否导入了 AI 设置
    pub ai_settings_imported: bool,
    /// 错误信息 (仅在失败时)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ImportResult {
    pub fn success(
        feeds_imported: usize,
        feeds_skipped: usize,
        settings_imported: bool,
        ai_settings_imported: bool,
    ) -> Self {
        Self {
            success: true,
            feeds_imported,
            feeds_skipped,
            settings_imported,
            ai_settings_imported,
            error: None,
        }
    }

    pub fn failure(error: impl Into<String>) -> Self {
        Self {
            success: false,
            feeds_imported: 0,
            feeds_skipped: 0,
            settings_imported: false,
            ai_settings_imported: false,
            error: Some(error.into()),
        }
    }
}

// ============= Tauri 命令 =============

use crate::storage_sqlite::SqliteStorage;
use crate::settings::{load_ai_settings_from_storage, load_app_settings_from_storage};
use std::sync::Arc;
use tauri::State;
use chrono::Utc;

/// 导出配置
#[tauri::command]
pub async fn export_config(
    storage: State<'_, Arc<SqliteStorage>>,
) -> Result<ExportedConfig, String> {
    // 获取所有 feeds
    let feeds = storage.get_all_feeds()
        .map_err(|e| format!("Failed to get feeds: {}", e))?;

    // 获取 AI 设置
    let ai_settings = load_ai_settings_from_storage(&storage);

    // 获取应用设置
    let app_settings = load_app_settings_from_storage(&storage);

    // 构建导出配置
    let config = ExportedConfig {
        version: CURRENT_CONFIG_VERSION.to_string(),
        exported_at: Utc::now().to_rfc3339(),
        feeds: feeds.iter().map(FeedExport::from).collect(),
        ai_settings: Some(AiSettingsExport::from(&ai_settings)),
        app_settings: Some(app_settings),
    };

    Ok(config)
}

/// 导入配置
#[tauri::command]
pub async fn import_config(
    config: ExportedConfig,
    storage: State<'_, Arc<SqliteStorage>>,
) -> Result<ImportResult, String> {
    // 验证版本
    if config.version != CURRENT_CONFIG_VERSION {
        return Ok(ImportResult::failure(format!(
            "Unsupported config version: {}. Expected: {}",
            config.version, CURRENT_CONFIG_VERSION
        )));
    }

    let mut feeds_imported = 0;
    let mut feeds_skipped = 0;

    // 获取现有 feeds 的 URL 集合
    let existing_feeds = storage.get_all_feeds()
        .map_err(|e| format!("Failed to get existing feeds: {}", e))?;
    let existing_urls: std::collections::HashSet<String> = existing_feeds
        .iter()
        .map(|f| f.url.clone())
        .collect();

    // 导入 feeds
    for feed_export in &config.feeds {
        // 跳过重复的 URL
        if existing_urls.contains(&feed_export.url) {
            feeds_skipped += 1;
            continue;
        }

        // 创建新的 Feed
        let feed = Feed {
            id: uuid::Uuid::new_v4().to_string(),
            url: feed_export.url.clone(),
            title: feed_export.title.clone(),
            description: feed_export.description.clone(),
            icon_url: feed_export.icon_url.clone(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            use_full_content: feed_export.use_full_content,
            use_ai_summary: feed_export.use_ai_summary,
            use_ai_translation: feed_export.use_ai_translation,
        };

        match storage.add_feed(&feed) {
            Ok(_) => feeds_imported += 1,
            Err(e) => {
                log::warn!("Failed to import feed '{}': {}", feed.title, e);
                feeds_skipped += 1;
            }
        }
    }

    // 导入应用设置 (如果存在)
    let settings_imported = if let Some(ref app_settings) = config.app_settings {
        match storage.set_kv("app_settings", &serde_json::to_value(app_settings).unwrap()) {
            Ok(_) => true,
            Err(e) => {
                log::warn!("Failed to import app settings: {}", e);
                false
            }
        }
    } else {
        false
    };

    // 导入 AI 设置 (如果存在，但不导入 apiKey)
    let ai_settings_imported = if let Some(ref ai_export) = config.ai_settings {
        // 获取当前的 AI 设置以保留 apiKey
        let current_ai = load_ai_settings_from_storage(&storage);

        // 合并设置 (保留当前 apiKey)
        let merged = AiSettings {
            api_endpoint: ai_export.api_endpoint.clone(),
            api_key: current_ai.api_key, // 保留现有 apiKey
            model: ai_export.model.clone(),
            max_tokens: ai_export.max_tokens,
            prompt: ai_export.prompt.clone(),
            enable_auto_summary: ai_export.enable_auto_summary,
            language: ai_export.language.clone(),
            max_concurrency: ai_export.max_concurrency,
            custom_input_price: ai_export.custom_input_price,
            custom_output_price: ai_export.custom_output_price,
        };

        // 保存到存储 (apiKey 不会被序列化，需要单独保存)
        let ai_value = serde_json::to_value(&merged).map_err(|e| format!("Failed to serialize AI settings: {}", e))?;
        match storage.set_kv("ai_settings", &ai_value) {
            Ok(_) => true,
            Err(e) => {
                log::warn!("Failed to import AI settings: {}", e);
                false
            }
        }
    } else {
        false
    };

    Ok(ImportResult::success(
        feeds_imported,
        feeds_skipped,
        settings_imported,
        ai_settings_imported,
    ))
}

// ============= 测试 =============
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_feed_export_from_feed() {
        let feed = Feed {
            id: "test-id".to_string(),
            url: "https://example.com/feed.xml".to_string(),
            title: "Test Feed".to_string(),
            description: Some("A test feed".to_string()),
            icon_url: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            use_full_content: true,
            use_ai_summary: false,
            use_ai_translation: false,
        };

        let export = FeedExport::from(&feed);

        assert_eq!(export.url, feed.url);
        assert_eq!(export.title, feed.title);
        assert_eq!(export.description, feed.description);
        assert!(export.use_full_content);
        assert!(!export.use_ai_summary);
        assert!(!export.use_ai_translation);
    }

    #[test]
    fn test_ai_settings_export_excludes_api_key() {
        let settings = AiSettings {
            api_endpoint: "https://api.openai.com/v1".to_string(),
            api_key: "secret-key-12345".to_string(),
            model: "gpt-4o-mini".to_string(),
            max_tokens: 300,
            prompt: "Test prompt".to_string(),
            enable_auto_summary: true,
            language: "zh-CN".to_string(),
            max_concurrency: 3,
            custom_input_price: None,
            custom_output_price: None,
        };

        let export = AiSettingsExport::from(&settings);

        // Verify apiKey is not in export
        let json = serde_json::to_string(&export).unwrap();
        assert!(!json.contains("secret-key-12345"));
        assert!(!json.contains("apiKey"));

        // Verify other fields are present
        assert_eq!(export.api_endpoint, settings.api_endpoint);
        assert_eq!(export.model, settings.model);
    }

    #[test]
    fn test_exported_config_serialization() {
        let config = ExportedConfig {
            version: "1.0".to_string(),
            exported_at: "2024-01-15T10:30:00Z".to_string(),
            feeds: vec![FeedExport {
                url: "https://example.com/feed.xml".to_string(),
                title: "Test Feed".to_string(),
                description: None,
                icon_url: None,
                use_full_content: false,
                use_ai_summary: false,
                use_ai_translation: false,
            }],
            ai_settings: Some(AiSettingsExport::default()),
            app_settings: Some(AppSettings::default()),
        };

        let json = serde_json::to_string(&config).unwrap();
        let parsed: ExportedConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.version, "1.0");
        assert_eq!(parsed.feeds.len(), 1);
    }

    #[test]
    fn test_import_result_success() {
        let result = ImportResult::success(5, 2, true, false);

        assert!(result.success);
        assert_eq!(result.feeds_imported, 5);
        assert_eq!(result.feeds_skipped, 2);
        assert!(result.settings_imported);
        assert!(!result.ai_settings_imported);
        assert!(result.error.is_none());
    }

    #[test]
    fn test_import_result_failure() {
        let result = ImportResult::failure("Test error");

        assert!(!result.success);
        assert_eq!(result.error, Some("Test error".to_string()));
    }

    #[test]
    fn test_exported_config_deserialization() {
        let json = r#"{
            "version": "1.0",
            "exportedAt": "2024-01-15T10:30:00Z",
            "feeds": [
                {
                    "url": "https://example.com/feed.xml",
                    "title": "Test Feed",
                    "useFullContent": true,
                    "useAiSummary": false,
                    "useAiTranslation": false
                }
            ],
            "aiSettings": {
                "apiEndpoint": "https://api.openai.com/v1",
                "model": "gpt-4o-mini",
                "maxTokens": 300,
                "prompt": "Test",
                "enableAutoSummary": false,
                "language": "zh-CN",
                "maxConcurrency": 3
            },
            "appSettings": {
                "pollInterval": "30m",
                "notificationType": "system",
                "enableNotifications": true,
                "maxNotificationsPerBatch": 5,
                "enableBackgroundRefresh": true,
                "closeToTray": true
            }
        }"#;

        let config: ExportedConfig = serde_json::from_str(json).unwrap();

        assert_eq!(config.version, "1.0");
        assert_eq!(config.feeds.len(), 1);
        assert!(config.ai_settings.is_some());
        assert!(config.app_settings.is_some());
    }

    #[test]
    fn test_exported_config_minimal() {
        let json = r#"{
            "version": "1.0",
            "exportedAt": "2024-01-15T10:30:00Z",
            "feeds": []
        }"#;

        let config: ExportedConfig = serde_json::from_str(json).unwrap();

        assert_eq!(config.version, "1.0");
        assert_eq!(config.feeds.len(), 0);
        assert!(config.ai_settings.is_none());
        assert!(config.app_settings.is_none());
    }

    #[test]
    fn test_feed_export_default_values() {
        let json = r#"{
            "url": "https://example.com/feed.xml",
            "title": "Test Feed"
        }"#;

        let feed: FeedExport = serde_json::from_str(json).unwrap();

        assert!(!feed.use_full_content);
        assert!(!feed.use_ai_summary);
        assert!(!feed.use_ai_translation);
    }

    #[test]
    fn test_version_constant() {
        assert_eq!(CURRENT_CONFIG_VERSION, "1.0");
    }
}
