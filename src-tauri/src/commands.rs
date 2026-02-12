use crate::models::{Feed, Article, FeedWithUnreadCount};
use crate::fetcher::fetch_feed;
use crate::content_extractor::fetch_and_extract_content;
use crate::ai_summarizer;
use crate::settings::AiSettings;
use crate::storage::{Storage, MAX_ARTICLES_LIMIT};
use tauri::State;
use std::path::PathBuf;
use std::sync::Arc;
use fs2::FileExt;
use log::warn;

const MAX_FULL_CONTENT_PER_BATCH: usize = 5;

fn try_fetch_full_content(storage: &Storage, article_id: &str, link: &str) {
    match fetch_and_extract_content(link) {
        Ok(content) => {
            let _ = storage.update_article_full_content(article_id, &content);
        }
        Err(e) => {
            warn!("Failed to fetch full content for {}: {}", link, e);
        }
    }
}

/// 应用状态，包含存储实例
#[derive(Clone)]
pub struct AppState {
    pub data_dir: PathBuf,
}

/// 错误类型用于 Tauri 命令
pub type CommandResult<T> = std::result::Result<T, String>;

/// 添加 RSS 订阅
#[tauri::command]
pub async fn add_feed(url: String, use_full_content: Option<bool>, storage: State<'_, Arc<Storage>>) -> CommandResult<Feed> {
    let (mut feed, articles) = fetch_feed(&url)
        .map_err(|e| format!("Failed to fetch feed: {}", e))?;

    feed.use_full_content = use_full_content.unwrap_or(false);

    storage.add_feed(&feed)
        .map_err(|e| format!("Failed to save feed: {}", e))?;

    for article in &articles {
        let mut article = article.clone();
        article.feed_id = feed.id.clone();
        storage.add_article(&article)
            .map_err(|e| format!("Failed to save article: {}", e))?;
    }

    if feed.use_full_content {
        for article in articles.iter().take(MAX_FULL_CONTENT_PER_BATCH) {
            try_fetch_full_content(&storage, &article.id, &article.link);
        }
    }

    Ok(feed)
}

/// 获取所有订阅（包含未读计数）
#[tauri::command]
pub async fn get_feeds(storage: State<'_, Arc<Storage>>) -> CommandResult<Vec<FeedWithUnreadCount>> {
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
pub async fn remove_feed(id: String, storage: State<'_, Arc<Storage>>) -> CommandResult<()> {
    storage.delete_feed(&id)
        .map_err(|e| format!("Failed to delete feed: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn refresh_feed(id: String, storage: State<'_, Arc<Storage>>) -> CommandResult<FeedWithUnreadCount> {
    let existing_feed = storage.get_feed(&id)
        .map_err(|e| format!("Failed to get feed: {}", e))?
        .ok_or_else(|| "Feed not found".to_string())?;

    let existing_links: Vec<String> = storage.get_articles(Some(&id), None)
        .unwrap_or_default()
        .into_iter()
        .map(|a| a.link)
        .collect();

    let (_feed, articles) = fetch_feed(&existing_feed.url)
        .map_err(|e| format!("Failed to fetch feed: {}", e))?;

    for article in &articles {
        let mut article = article.clone();
        article.feed_id = id.clone();
        let is_new = !existing_links.contains(&article.link);
        storage.add_article(&article)
            .map_err(|e| format!("Failed to save article: {}", e))?;

        if is_new && existing_feed.use_full_content {
            try_fetch_full_content(&storage, &article.id, &article.link);
        }
    }

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

#[tauri::command]
pub async fn refresh_all_feeds(storage: State<'_, Arc<Storage>>) -> CommandResult<Vec<FeedWithUnreadCount>> {
    let feeds = storage.get_all_feeds()
        .map_err(|e| format!("Failed to get feeds: {}", e))?;

    let mut result = Vec::new();

    for feed in feeds {
        let feed_id = feed.id.clone();
        let feed_url = feed.url.clone();

        if let Ok((_feed, articles)) = fetch_feed(&feed_url) {
            let existing_links: Vec<String> = storage.get_articles(Some(&feed_id), None)
                .unwrap_or_default()
                .into_iter()
                .map(|a| a.link)
                .collect();

            for article in &articles {
                let mut article = article.clone();
                article.feed_id = feed_id.clone();
                let is_new = !existing_links.contains(&article.link);
                let _ = storage.add_article(&article);

                if is_new && feed.use_full_content {
                    try_fetch_full_content(&storage, &article.id, &article.link);
                }
            }
        }

        let mut updated_feed = feed.clone();
        updated_feed.updated_at = chrono::Utc::now();
        if storage.update_feed(&updated_feed).is_err() {
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
    storage: State<'_, Arc<Storage>>,
) -> CommandResult<Vec<Article>> {
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
pub async fn mark_article_read(id: String, read: bool, storage: State<'_, Arc<Storage>>) -> CommandResult<()> {
    storage.mark_article_read(&id, read)
        .map_err(|e| format!("Failed to mark article: {}", e))?;

    Ok(())
}

/// 标记订阅下所有文章为已读
#[tauri::command]
pub async fn mark_all_read(feed_id: String, storage: State<'_, Arc<Storage>>) -> CommandResult<()> {
    storage.mark_all_read(&feed_id)
        .map_err(|e| format!("Failed to mark all read: {}", e))?;

    Ok(())
}

/// 获取未读文章数量
#[tauri::command]
pub async fn get_unread_count(feed_id: Option<String>, storage: State<'_, Arc<Storage>>) -> CommandResult<usize> {
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

/// 获取单个文章
#[tauri::command]
pub async fn get_article(id: String, storage: State<'_, Arc<Storage>>) -> CommandResult<Option<Article>> {
    storage.get_article(&id)
        .map_err(|e| format!("Failed to get article: {}", e))
}

/// 更新阅读进度
#[tauri::command]
pub async fn update_reading_progress(id: String, progress: f32, storage: State<'_, Arc<Storage>>) -> CommandResult<()> {
    storage.update_reading_progress(&id, progress)
        .map_err(|e| format!("Failed to update reading progress: {}", e))
}

/// 收藏/取消收藏文章
#[tauri::command]
pub async fn set_article_favorite(id: String, favorite: bool, storage: State<'_, Arc<Storage>>) -> CommandResult<()> {
    storage.set_article_favorite(&id, favorite)
        .map_err(|e| format!("Failed to set article favorite: {}", e))
}

/// 获取收藏的文章
#[tauri::command]
pub async fn get_favorite_articles(limit: Option<usize>, storage: State<'_, Arc<Storage>>) -> CommandResult<Vec<Article>> {
    storage.get_favorite_articles(limit)
        .map_err(|e| format!("Failed to get favorite articles: {}", e))
}

/// 更新订阅信息（标题、URL）
#[tauri::command]
pub async fn update_feed_info(
    id: String,
    title: Option<String>,
    url: Option<String>,
    use_full_content: Option<bool>,
    storage: State<'_, Arc<Storage>>,
) -> CommandResult<FeedWithUnreadCount> {
    let mut feed = storage.get_feed(&id)
        .map_err(|e| format!("Failed to get feed: {}", e))?
        .ok_or_else(|| "Feed not found".to_string())?;

    if let Some(ref new_url) = url {
        if new_url.trim().is_empty() {
            return Err("URL cannot be empty".to_string());
        }
        if url::Url::parse(new_url).is_err() {
            return Err("Invalid URL format".to_string());
        }
        let all_feeds = storage.get_all_feeds()
            .map_err(|e| format!("Failed to get feeds: {}", e))?;
        if all_feeds.iter().any(|f| f.url == *new_url && f.id != id) {
            return Err("Another feed with this URL already exists".to_string());
        }
        feed.url = new_url.clone();
    }

    if let Some(ref new_title) = title {
        if new_title.trim().is_empty() {
            return Err("Title cannot be empty".to_string());
        }
        feed.title = new_title.clone();
    }

    if let Some(ufc) = use_full_content {
        feed.use_full_content = ufc;
    }

    feed.updated_at = chrono::Utc::now();

    storage.update_feed(&feed)
        .map_err(|e| format!("Failed to update feed: {}", e))?;

    let unread_count = storage.get_unread_count(&id).unwrap_or(0);

    Ok(FeedWithUnreadCount {
        feed,
        unread_count,
    })
}

#[tauri::command]
pub async fn fetch_full_content(id: String, storage: State<'_, Arc<Storage>>) -> CommandResult<Article> {
    let article = storage.get_article(&id)
        .map_err(|e| format!("Failed to get article: {}", e))?
        .ok_or_else(|| "Article not found".to_string())?;

    let content = fetch_and_extract_content(&article.link)
        .map_err(|e| e.to_string())?;

    storage.update_article_full_content(&id, &content)
        .map_err(|e| format!("Failed to save content: {}", e))?;

    storage.get_article(&id)
        .map_err(|e| format!("Failed to get updated article: {}", e))?
        .ok_or_else(|| "Article not found after update".to_string())
}

#[tauri::command]
pub async fn generate_article_summary(
    id: String,
    storage: State<'_, Arc<Storage>>,
    app_state: State<'_, AppState>,
) -> CommandResult<Article> {
    let article = storage
        .get_article(&id)
        .map_err(|e| format!("Failed to get article: {}", e))?
        .ok_or_else(|| "Article not found".to_string())?;

    let settings = match get_store_value("ai_settings".to_string(), app_state).await {
        Ok(Some(value)) => serde_json::from_value::<AiSettings>(value)
            .map_err(|e| format!("Failed to parse AI settings: {}", e))?,
        Ok(None) => AiSettings::default(),
        Err(e) => return Err(e),
    };

    let content = article
        .full_content
        .as_deref()
        .or(article.content.as_deref())
        .or(article.description.as_deref())
        .ok_or_else(|| "Article content is empty".to_string())?
        .to_string();

    let settings_for_task = settings.clone();
    let summary = tauri::async_runtime::spawn_blocking(move || {
        ai_summarizer::generate_summary(&content, &settings_for_task)
    })
    .await
    .map_err(|e| format!("AI summary task join error: {}", e))??;

    storage
        .update_article_ai_summary(&id, &summary)
        .map_err(|e| format!("Failed to save AI summary: {}", e))?;

    storage
        .get_article(&id)
        .map_err(|e| format!("Failed to get updated article: {}", e))?
        .ok_or_else(|| "Article not found after summary update".to_string())
}
