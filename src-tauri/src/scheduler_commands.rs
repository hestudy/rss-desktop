use crate::settings::{AiSettings, AiSettingsResponse, AppSettings, SchedulerState};
use crate::storage_sqlite::SqliteStorage;
use crate::commands::CommandResult;
use tauri::State;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

// ============= 测试模块 (TDD: 先写测试) =============
#[cfg(test)]
mod tests {
    use super::*;

    // 测试: 获取默认设置
    #[test]
    fn test_get_settings_returns_default() {
        // 命令测试需要实际的 Tauri State，这里先测试序列化/反序列化
        let settings = AppSettings::default();
        let json = serde_json::to_string(&settings).unwrap();
        let parsed: AppSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed, settings);
    }

    // 测试: 更新设置
    #[test]
    fn test_update_settings_serialization() {
        let settings = AppSettings {
            poll_interval: crate::settings::PollInterval::Hours1,
            enable_background_refresh: true,
            ..Default::default()
        };

        let json = serde_json::to_string(&settings).unwrap();
        let parsed: AppSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.poll_interval, crate::settings::PollInterval::Hours1);
        assert!(parsed.enable_background_refresh);
    }

    // 测试: 获取调度器状态
    #[test]
    fn test_get_scheduler_state() {
        let state = SchedulerState {
            is_running: true,
            consecutive_errors: 2,
            ..Default::default()
        };

        let json = serde_json::to_string(&state).unwrap();
        let parsed: SchedulerState = serde_json::from_str(&json).unwrap();

        assert!(parsed.is_running);
        assert_eq!(parsed.consecutive_errors, 2);
    }

    // 测试: 设置轮询间隔的有效值
    #[test]
    fn test_set_poll_interval_valid_values() {
        let intervals = vec![
            "5m", "15m", "30m", "1h", "2h", "6h", "12h", "24h"
        ];

        for interval_str in intervals {
            let parsed: crate::settings::PollInterval =
                serde_json::from_str(&format!("\"{}\"", interval_str)).unwrap();
            // 成功解析即为通过
            assert!(parsed.to_minutes() > 0);
        }
    }

    // 测试: 设置轮询间隔的无效值
    #[test]
    fn test_set_poll_interval_invalid_values() {
        let invalid_values = vec!["0m", "3m", "25h", "invalid", "1"];

        for invalid_str in invalid_values {
            let result: std::result::Result<crate::settings::PollInterval, _> =
                serde_json::from_str(&format!("\"{}\"", invalid_str));
            assert!(result.is_err(), "Should fail for invalid interval: {}", invalid_str);
        }
    }

    // 测试: max_notifications_per_batch 边界验证
    #[test]
    fn test_max_notifications_boundary() {
        // 最小边界
        let json = r#"{"maxNotificationsPerBatch":0}"#;
        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.max_notifications_per_batch, 0);

        // 较大值
        let json = r#"{"maxNotificationsPerBatch":50}"#;
        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.max_notifications_per_batch, 50);
    }
}

// ============= 实现代码 =============

/// 获取应用设置
#[tauri::command]
pub async fn get_settings(storage: State<'_, Arc<SqliteStorage>>) -> CommandResult<AppSettings> {
    match storage.get_kv("app_settings") {
        Ok(Some(value)) => serde_json::from_value(value)
            .map_err(|e| format!("Failed to parse settings: {}", e)),
        Ok(None) => Ok(AppSettings::default()),
        Err(e) => Err(format!("Failed to get settings: {}", e)),
    }
}

/// 更新应用设置
#[tauri::command]
pub async fn update_settings(
    settings: AppSettings,
    storage: State<'_, Arc<SqliteStorage>>,
    close_to_tray: State<'_, Arc<AtomicBool>>,
) -> CommandResult<AppSettings> {
    let value = serde_json::to_value(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    storage.set_kv("app_settings", &value)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    // 同步更新 close_to_tray 缓存
    close_to_tray.store(settings.close_to_tray, Ordering::SeqCst);

    Ok(settings)
}

#[tauri::command]
pub async fn get_ai_settings(storage: State<'_, Arc<SqliteStorage>>) -> CommandResult<AiSettingsResponse> {
    let mut settings: AiSettings = match storage.get_kv("ai_settings") {
        Ok(Some(value)) => serde_json::from_value(value)
            .map_err(|e| format!("Failed to parse AI settings: {}", e))?,
        Ok(None) => AiSettings::default(),
        Err(e) => return Err(format!("Failed to get AI settings: {}", e)),
    };
    // 从系统密钥管理服务加载 API Key（仅桌面端）
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    if let Some(key) = crate::keyring_helper::load_api_key() {
        settings.api_key = key;
    }
    Ok(AiSettingsResponse::from(settings))
}

#[tauri::command]
pub async fn update_ai_settings(
    settings: AiSettings,
    storage: State<'_, Arc<SqliteStorage>>,
) -> CommandResult<AiSettings> {
    log::info!("update_ai_settings called, api_key length: {}", settings.api_key.len());

    // 校验 API endpoint 防止 SSRF 和 Key 窃取
    if !settings.api_endpoint.trim().is_empty() {
        crate::fetcher::validate_api_endpoint(&settings.api_endpoint)?;
    }
    // 将 API Key 存入系统密钥管理服务（不写入数据库）- 仅桌面端
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        crate::keyring_helper::store_api_key(&settings.api_key)?;
        log::info!("API key saved to keyring successfully");
    }
    // 移动端：API Key 直接存储在数据库中（安全性较低但可用）
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        log::warn!("Mobile platform: API key will be stored in database (less secure)");
    }

    // 序列化时 api_key 在桌面端会被 skip_serializing 跳过，移动端会正常序列化
    let value = serde_json::to_value(&settings)
        .map_err(|e| format!("Failed to serialize AI settings: {}", e))?;
    storage.set_kv("ai_settings", &value)
        .map_err(|e| format!("Failed to save AI settings: {}", e))?;
    log::info!("AI settings saved to database");
    Ok(settings)
}

/// 获取调度器状态
#[tauri::command]
pub async fn get_scheduler_state(storage: State<'_, Arc<SqliteStorage>>) -> CommandResult<SchedulerState> {
    match storage.get_kv("scheduler_state") {
        Ok(Some(value)) => serde_json::from_value(value)
            .map_err(|e| format!("Failed to parse scheduler state: {}", e)),
        Ok(None) => Ok(SchedulerState::default()),
        Err(e) => Err(format!("Failed to get scheduler state: {}", e)),
    }
}

/// 设置调度器状态
#[tauri::command]
pub async fn set_scheduler_state(
    state_value: SchedulerState,
    storage: State<'_, Arc<SqliteStorage>>,
) -> CommandResult<()> {
    let value = serde_json::to_value(&state_value)
        .map_err(|e| format!("Failed to serialize scheduler state: {}", e))?;
    storage.set_kv("scheduler_state", &value)
        .map_err(|e| format!("Failed to save scheduler state: {}", e))
}
