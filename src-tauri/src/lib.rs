// 模块声明
mod models;
mod error;
mod storage;
mod fetcher;
mod commands;

// 导出常用类型
pub use models::{Feed, Article, AddFeedRequest, UpdateFeedRequest, GetArticlesRequest, ApiResponse, FeedWithUnreadCount};
pub use error::{RssError, Result};
pub use commands::AppState;

use std::path::PathBuf;
use tauri::Manager;

// 初始化数据目录
fn get_data_dir() -> PathBuf {
    // 获取应用数据目录
    let mut data_dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    data_dir.push("rss-desktop");
    data_dir
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = get_data_dir();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            // 创建数据目录
            std::fs::create_dir_all(&data_dir)?;

            // 设置应用状态
            app.manage(commands::AppState {
                data_dir: data_dir.clone(),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_feed,
            commands::get_feeds,
            commands::remove_feed,
            commands::refresh_feed,
            commands::refresh_all_feeds,
            commands::get_articles,
            commands::mark_article_read,
            commands::mark_all_read,
            commands::get_unread_count,
            commands::open_link,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ============= 测试 =============
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_data_dir() {
        let dir = get_data_dir();
        assert!(dir.ends_with("rss-desktop"));
    }
}
