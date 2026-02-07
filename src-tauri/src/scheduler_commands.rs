use crate::settings::{AppSettings, SchedulerState, NotificationType};
use crate::commands::AppState;
use crate::commands::CommandResult;
use tauri::State;

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
        let json = r#"{"max_notifications_per_batch":0}"#;
        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.max_notifications_per_batch, 0);

        // 较大值
        let json = r#"{"max_notifications_per_batch":50}"#;
        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.max_notifications_per_batch, 50);
    }
}

// ============= 实现代码 =============

/// 获取应用设置
#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> CommandResult<AppSettings> {
    use crate::commands::get_store_value;

    // 从存储获取设置，如果没有则返回默认值
    let key = "app_settings".to_string();

    match get_store_value(key, state).await {
        Ok(Some(value)) => {
            serde_json::from_value(value)
                .map_err(|e| format!("Failed to parse settings: {}", e))
        }
        Ok(None) => Ok(AppSettings::default()),
        Err(e) => Err(e),
    }
}

/// 更新应用设置
#[tauri::command]
pub async fn update_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> CommandResult<AppSettings> {
    use crate::commands::set_store_value;

    let key = "app_settings".to_string();
    let value = serde_json::to_value(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    set_store_value(key, value, state).await?;
    Ok(settings)
}

/// 获取调度器状态
#[tauri::command]
pub async fn get_scheduler_state(state: State<'_, AppState>) -> CommandResult<SchedulerState> {
    use crate::commands::get_store_value;

    let key = "scheduler_state".to_string();

    match get_store_value(key, state).await {
        Ok(Some(value)) => {
            serde_json::from_value(value)
                .map_err(|e| format!("Failed to parse scheduler state: {}", e))
        }
        Ok(None) => Ok(SchedulerState::default()),
        Err(e) => Err(e),
    }
}

/// 设置调度器状态（内部使用）
#[tauri::command]
pub async fn set_scheduler_state(
    state_value: SchedulerState,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    use crate::commands::set_store_value;

    let key = "scheduler_state".to_string();
    let value = serde_json::to_value(&state_value)
        .map_err(|e| format!("Failed to serialize scheduler state: {}", e))?;

    set_store_value(key, value, state).await
}
