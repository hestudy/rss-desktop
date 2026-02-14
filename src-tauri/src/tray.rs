/// 创建系统托盘图标和菜单
#[cfg(not(test))]
pub fn create_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    use tauri::{
        menu::{Menu, MenuItem, PredefinedMenuItem},
        tray::TrayIconBuilder,
    };
    #[cfg(not(target_os = "macos"))]
    use tauri::{
        Manager,
        tray::{MouseButton, MouseButtonState, TrayIconEvent},
    };

    let show_i = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &separator, &quit_i])?;

    #[allow(unused_mut)]
    let mut builder = TrayIconBuilder::with_id("main-tray")
        .icon(
            app.default_window_icon()
                .ok_or_else(|| tauri::Error::AssetNotFound("default window icon".into()))?
                .clone(),
        )
        .menu(&menu)
        .tooltip("RSS Desktop")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                show_main_window(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        });

    // macOS: 左键点击显示菜单 + 图标适配系统主题色
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .show_menu_on_left_click(true)
            .icon_as_template(true);
    }

    // 非 macOS: 左键点击切换窗口显示/隐藏（右键弹出菜单）
    #[cfg(not(target_os = "macos"))]
    {
        builder = builder
            .show_menu_on_left_click(false)
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            show_main_window(app);
                        }
                    }
                }
            });
    }

    builder.build(app)?;

    Ok(())
}

/// 显示并聚焦主窗口
pub fn show_main_window(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

// ============= 测试模块 =============
#[cfg(test)]
mod tests {
    #[test]
    fn test_show_main_window_is_defined() {
        // show_main_window 需要 AppHandle，无法在单元测试中直接调用
        // 此测试仅验证模块编译正确
    }
}
