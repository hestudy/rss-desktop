use crate::models::{Feed, Article, FeedWithUnreadCount};
use crate::fetcher::fetch_feed;
use crate::storage::MAX_ARTICLES_LIMIT;
use tauri::State;
use std::path::PathBuf;
use fs2::FileExt;

/// 应用状态，包含存储实例
#[derive(Clone)]
pub struct AppState {
    pub data_dir: PathBuf,
}

/// 错误类型用于 Tauri 命令
pub type CommandResult<T> = std::result::Result<T, String>;

/// 添加 RSS 订阅
#[tauri::command]
pub async fn add_feed(url: String, state: State<'_, AppState>) -> CommandResult<Feed> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    // 检查是否已存在相同 URL 的订阅
    let existing_feeds = storage.get_all_feeds()
        .map_err(|e| format!("Failed to check existing feeds: {}", e))?;

    if existing_feeds.iter().any(|f| f.url == url) {
        return Err("Feed with this URL already exists".to_string());
    }

    // 获取并解析 Feed
    let (feed, articles) = fetch_feed(&url)
        .map_err(|e| format!("Failed to fetch feed: {}", e))?;

    // 保存 Feed
    storage.add_feed(&feed)
        .map_err(|e| format!("Failed to save feed: {}", e))?;

    // 保存文章 - 现在正确处理错误
    for article in &articles {
        storage.add_article(article)
            .map_err(|e| format!("Failed to save article: {}", e))?;
    }

    Ok(feed)
}

/// 获取所有订阅（包含未读计数）
#[tauri::command]
pub async fn get_feeds(state: State<'_, AppState>) -> CommandResult<Vec<FeedWithUnreadCount>> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    let feeds = storage.get_all_feeds()
        .map_err(|e| format!("Failed to get feeds: {}", e))?;

    let mut result = Vec::new();
    for feed in feeds {
        let unread_count = storage.get_unread_count(&feed.id).unwrap_or(0);
        result.push(FeedWithUnreadCount { feed, unread_count });
    }

    Ok(result)
}

/// 删除订阅
#[tauri::command]
pub async fn remove_feed(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    storage.delete_feed(&id)
        .map_err(|e| format!("Failed to delete feed: {}", e))?;

    Ok(())
}

/// 刷新单个订阅
#[tauri::command]
pub async fn refresh_feed(id: String, state: State<'_, AppState>) -> CommandResult<FeedWithUnreadCount> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    // 获取现有订阅
    let existing_feed = storage.get_feed(&id)
        .map_err(|e| format!("Failed to get feed: {}", e))?
        .ok_or_else(|| "Feed not found".to_string())?;

    // 获取最新内容
    let (_feed, articles) = fetch_feed(&existing_feed.url)
        .map_err(|e| format!("Failed to fetch feed: {}", e))?;

    // 保存新文章 - 正确处理错误
    for article in &articles {
        storage.add_article(article)
            .map_err(|e| format!("Failed to save article: {}", e))?;
    }

    // 更新订阅时间 - 现在正确处理错误
    let mut updated_feed = existing_feed.clone();
    updated_feed.updated_at = chrono::Utc::now();
    storage.update_feed(&updated_feed)
        .map_err(|e| format!("Failed to update feed: {}", e))?;

    let unread_count = storage.get_unread_count(&id).unwrap_or(0);

    Ok(FeedWithUnreadCount {
        feed: updated_feed,
        unread_count,
    })
}

/// 刷新所有订阅
#[tauri::command]
pub async fn refresh_all_feeds(state: State<'_, AppState>) -> CommandResult<Vec<FeedWithUnreadCount>> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    let feeds = storage.get_all_feeds()
        .map_err(|e| format!("Failed to get feeds: {}", e))?;

    let mut result = Vec::new();

    for feed in feeds {
        let feed_id = feed.id.clone();
        let feed_url = feed.url.clone();

        // 获取最新内容
        if let Ok((_feed, articles)) = fetch_feed(&feed_url) {
            // 保存新文章
            for article in &articles {
                let _ = storage.add_article(article);
            }
        }

        // 更新订阅时间 - 现在正确处理错误
        let mut updated_feed = feed.clone();
        updated_feed.updated_at = chrono::Utc::now();
        if let Err(_) = storage.update_feed(&updated_feed) {
            // 更新失败时使用原始 feed
            updated_feed = feed.clone();
        }

        let unread_count = storage.get_unread_count(&feed_id).unwrap_or(0);
        result.push(FeedWithUnreadCount {
            feed: updated_feed,
            unread_count,
        });
    }

    Ok(result)
}

/// 获取文章列表
#[tauri::command]
pub async fn get_articles(
    feed_id: Option<String>,
    limit: Option<usize>,
    unread_only: Option<bool>,
    state: State<'_, AppState>,
) -> CommandResult<Vec<Article>> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    // 验证并限制 limit 参数，防止 DOS
    let limit = limit.unwrap_or(100).min(MAX_ARTICLES_LIMIT);

    let mut articles = storage.get_articles(feed_id.as_deref(), Some(limit))
        .map_err(|e| format!("Failed to get articles: {}", e))?;

    // 过滤未读
    if unread_only.unwrap_or(false) {
        articles.retain(|a| !a.read);
    }

    Ok(articles)
}

/// 标记文章为已读/未读
#[tauri::command]
pub async fn mark_article_read(id: String, read: bool, state: State<'_, AppState>) -> CommandResult<()> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    storage.mark_article_read(&id, read)
        .map_err(|e| format!("Failed to mark article: {}", e))?;

    Ok(())
}

/// 标记订阅下所有文章为已读
#[tauri::command]
pub async fn mark_all_read(feed_id: String, state: State<'_, AppState>) -> CommandResult<()> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    storage.mark_all_read(&feed_id)
        .map_err(|e| format!("Failed to mark all read: {}", e))?;

    Ok(())
}

/// 获取未读文章数量
#[tauri::command]
pub async fn get_unread_count(feed_id: Option<String>, state: State<'_, AppState>) -> CommandResult<usize> {
    use crate::storage::Storage;

    let storage = Storage::new(&state.data_dir)
        .map_err(|e| format!("Failed to initialize storage: {}", e))?;

    let count = if let Some(fid) = feed_id {
        storage.get_unread_count(&fid).unwrap_or(0)
    } else {
        // 获取所有订阅的未读总数
        let feeds = storage.get_all_feeds().unwrap_or_default();
        feeds
            .iter()
            .map(|f| storage.get_unread_count(&f.id).unwrap_or(0))
            .sum()
    };

    Ok(count)
}

/// 在浏览器中打开链接
#[tauri::command]
pub async fn open_link(url: String) -> CommandResult<()> {
    tauri_plugin_opener::open_url(&url, None::<&str>)
        .map_err(|e| format!("Failed to open URL: {}", e))?;
    Ok(())
}

/// 存储键值对
///
/// 使用文件锁确保并发安全
#[tauri::command]
pub async fn set_store_value(key: String, value: serde_json::Value, state: State<'_, AppState>) -> CommandResult<()> {
    use std::collections::HashMap;
    use std::fs::{self, File, OpenOptions};
    use std::io::{BufReader, BufWriter, Write};

    let store_path = state.data_dir.join("store.json");
    let temp_path = store_path.with_extension("tmp");

    // 读取现有存储（使用文件锁）
    let mut store: HashMap<String, serde_json::Value> = if store_path.exists() {
        let file = File::open(&store_path)
            .map_err(|e| format!("Failed to open store file: {}", e))?;
        file.lock_shared()
            .map_err(|e| format!("Failed to lock store file for reading: {}", e))?;

        let reader = BufReader::new(file);
        let store_result: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_reader(reader);
        // 锁在文件 drop 时自动释放
        store_result.unwrap_or_default()
    } else {
        HashMap::new()
    };

    // 设置值
    store.insert(key, value);

    // 写入临时文件（使用独占锁）
    {
        let file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&temp_path)
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.lock_exclusive()
            .map_err(|e| format!("Failed to lock temp file for writing: {}", e))?;

        let json = serde_json::to_string_pretty(&store)
            .map_err(|e| format!("Failed to serialize store: {}", e))?;

        {
            let mut writer = BufWriter::new(&file);
            writer.write_all(json.as_bytes())
                .map_err(|e| format!("Failed to write store: {}", e))?;
            writer.flush()
                .map_err(|e| format!("Failed to flush store: {}", e))?;
        }
        // 锁在文件 drop 时自动释放
    }

    // 原子性重命名
    fs::rename(&temp_path, &store_path)
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// 获取键值对
///
/// 使用文件锁确保读取一致性
#[tauri::command]
pub async fn get_store_value(key: String, state: State<'_, AppState>) -> CommandResult<Option<serde_json::Value>> {
    use std::collections::HashMap;
    use std::fs::File;
    use std::io::BufReader;

    let store_path = state.data_dir.join("store.json");

    if !store_path.exists() {
        return Ok(None);
    }

    let file = File::open(&store_path)
        .map_err(|e| format!("Failed to open store file: {}", e))?;
    file.lock_shared()
        .map_err(|e| format!("Failed to lock store file for reading: {}", e))?;

    let reader = BufReader::new(file);
    let store: HashMap<String, serde_json::Value> = serde_json::from_reader(reader)
        .map_err(|e| format!("Failed to parse store: {}", e))?;
    // 锁在文件 drop 时自动释放

    Ok(store.get(&key).cloned())
}
