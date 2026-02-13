use crate::error::Result;
use crate::models::{Article, Feed, FeedLog};
use std::path::{Component, Path};

// 存储层实现 - 使用 JSON 文件存储 + 文件锁
use fs2::FileExt;
use std::fs::{self, File, OpenOptions};
use std::io::{BufReader, BufWriter, Write};
use std::sync::Mutex;

const FEEDS_FILE: &str = "feeds.json";
const ARTICLES_FILE: &str = "articles.json";
const FEED_LOGS_FILE: &str = "feed_logs.json";

/// 最大文章限制
pub const MAX_ARTICLES_LIMIT: usize = 1000;

/// 每个订阅最大日志条数
const MAX_LOGS_PER_FEED: usize = 100;

/// 验证路径是否安全，防止路径遍历攻击
fn validate_data_dir(path: &Path) -> Result<()> {
    // 检查路径是否包含父目录引用 (..)
    for component in path.components() {
        if matches!(component, Component::ParentDir) {
            return Err(crate::error::RssError::StorageError(
                "Path cannot contain parent directory references (..)".to_string(),
            ));
        }
    }

    // 规范化路径并验证
    match path.canonicalize() {
        Ok(canonical) => {
            // 再次检查规范化后的路径
            for component in canonical.components() {
                if matches!(component, Component::ParentDir) {
                    return Err(crate::error::RssError::StorageError(
                        "Path cannot contain parent directory references".to_string(),
                    ));
                }
            }
        }
        Err(_) => {
            // 路径不存在时，这是第一次创建，允许继续
        }
    }

    Ok(())
}

pub struct Storage {
    data_dir: std::path::PathBuf,
    write_lock: Mutex<()>,
}

impl Storage {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let data_dir = path.as_ref().to_path_buf();

        // 验证路径安全（防止路径遍历）
        validate_data_dir(&data_dir)?;

        fs::create_dir_all(&data_dir)?;

        // 初始化文件
        let feeds_path = data_dir.join(FEEDS_FILE);
        let articles_path = data_dir.join(ARTICLES_FILE);
        let feed_logs_path = data_dir.join(FEED_LOGS_FILE);

        if !feeds_path.exists() {
            fs::write(&feeds_path, "[]")?;
        }
        if !articles_path.exists() {
            fs::write(&articles_path, "[]")?;
        }
        if !feed_logs_path.exists() {
            fs::write(&feed_logs_path, "[]")?;
        }

        Ok(Self {
            data_dir,
            write_lock: Mutex::new(()),
        })
    }

    fn acquire_write_lock(&self) -> Result<std::sync::MutexGuard<'_, ()>> {
        self.write_lock
            .lock()
            .map_err(|e| crate::error::RssError::LockError(e.to_string()))
    }

    fn get_feeds_path(&self) -> std::path::PathBuf {
        self.data_dir.join(FEEDS_FILE)
    }

    fn get_articles_path(&self) -> std::path::PathBuf {
        self.data_dir.join(ARTICLES_FILE)
    }

    pub fn add_feed(&self, feed: &Feed) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut feeds = self.load_feeds()?;
        if feeds.iter().any(|f| f.url == feed.url) {
            return Err(crate::error::RssError::StorageError(
                "Feed with this URL already exists".to_string(),
            ));
        }
        feeds.push(feed.clone());
        self.save_feeds(&feeds)?;
        Ok(())
    }

    pub fn get_feed(&self, id: &str) -> Result<Option<Feed>> {
        let feeds = self.load_feeds()?;
        Ok(feeds.into_iter().find(|f| f.id == id))
    }

    pub fn get_all_feeds(&self) -> Result<Vec<Feed>> {
        self.load_feeds()
    }

    pub fn update_feed(&self, feed: &Feed) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut feeds = self.load_feeds()?;
        if let Some(existing) = feeds.iter_mut().find(|f| f.id == feed.id) {
            *existing = feed.clone();
            self.save_feeds(&feeds)?;
            Ok(())
        } else {
            Err(crate::error::RssError::FeedNotFound(feed.id.clone()))
        }
    }

    pub fn delete_feed(&self, id: &str) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut feeds = self.load_feeds()?;
        let original_len = feeds.len();
        feeds.retain(|f| f.id != id);
        if feeds.len() < original_len {
            self.save_feeds(&feeds)?;
            // 同时删除该订阅的所有文章
            let mut articles = self.load_articles()?;
            articles.retain(|a| a.feed_id != id);
            self.save_articles(&articles)?;
            // 同时删除该订阅的所有日志
            let mut logs = self.load_feed_logs()?;
            logs.retain(|l| l.feed_id != id);
            self.save_feed_logs(&logs)?;
            Ok(())
        } else {
            Err(crate::error::RssError::FeedNotFound(id.to_string()))
        }
    }

    pub fn add_article(&self, article: &Article) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        // 检查是否已存在（通过链接+订阅源去重）
        if !articles
            .iter()
            .any(|a| a.link == article.link && a.feed_id == article.feed_id)
        {
            articles.push(article.clone());
            self.save_articles(&articles)?;
        }
        Ok(())
    }

    pub fn get_articles(
        &self,
        feed_id: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<Article>> {
        let mut articles = self.load_articles()?;
        if let Some(feed_id) = feed_id {
            articles.retain(|a| a.feed_id == feed_id);
        }
        let is_all_feeds = feed_id.is_none();
        articles.sort_by(|a, b| {
            let a_time = a.published_at.unwrap_or(a.created_at);
            let b_time = b.published_at.unwrap_or(b.created_at);
            if is_all_feeds {
                a.read.cmp(&b.read).then_with(|| b_time.cmp(&a_time))
            } else {
                b_time.cmp(&a_time)
            }
        });
        if let Some(limit) = limit {
            articles.truncate(limit);
        }
        Ok(articles)
    }

    pub fn mark_article_read(&self, id: &str, read: bool) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
            article.read = read;
            self.save_articles(&articles)?;
            Ok(())
        } else {
            Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )))
        }
    }

    pub fn mark_all_read(&self, feed_id: &str) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        for article in articles.iter_mut() {
            if article.feed_id == feed_id {
                article.read = true;
            }
        }
        self.save_articles(&articles)?;
        Ok(())
    }

    pub fn get_unread_count(&self, feed_id: &str) -> Result<usize> {
        let articles = self.load_articles()?;
        Ok(articles
            .iter()
            .filter(|a| a.feed_id == feed_id && !a.read)
            .count())
    }

    /// 获取单个文章
    pub fn get_article(&self, id: &str) -> Result<Option<Article>> {
        let articles = self.load_articles()?;
        Ok(articles.into_iter().find(|a| a.id == id))
    }

    /// 更新阅读进度
    pub fn update_reading_progress(&self, id: &str, progress: f32) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let clamped_progress = progress.clamp(0.0, 100.0);
        let mut articles = self.load_articles()?;
        if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
            article.reading_progress = clamped_progress;
            self.save_articles(&articles)?;
            Ok(())
        } else {
            Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )))
        }
    }

    /// 收藏/取消收藏文章
    pub fn set_article_favorite(&self, id: &str, favorite: bool) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
            article.favorite = favorite;
            self.save_articles(&articles)?;
            Ok(())
        } else {
            Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )))
        }
    }

    pub fn update_article_content(&self, id: &str, content: &str) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
            article.content = Some(content.to_string());
            self.save_articles(&articles)?;
            Ok(())
        } else {
            Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )))
        }
    }

    pub fn update_article_full_content(&self, id: &str, full_content: &str) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
            article.full_content = Some(full_content.to_string());
            self.save_articles(&articles)?;
            Ok(())
        } else {
            Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )))
        }
    }

    pub fn update_article_ai_summary(&self, id: &str, ai_summary: &str) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
            article.ai_summary = Some(ai_summary.to_string());
            self.save_articles(&articles)?;
            Ok(())
        } else {
            Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )))
        }
    }

    pub fn update_article_ai_translation(
        &self,
        id: &str,
        ai_translation: &str,
        ai_translated_title: Option<&str>,
    ) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut articles = self.load_articles()?;
        if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
            article.ai_translation = Some(ai_translation.to_string());
            article.ai_translated_title = ai_translated_title.map(|s| s.to_string());
            self.save_articles(&articles)?;
            Ok(())
        } else {
            Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )))
        }
    }

    /// 获取收藏的文章
    pub fn get_favorite_articles(&self, limit: Option<usize>) -> Result<Vec<Article>> {
        let mut articles = self.load_articles()?;
        articles.retain(|a| a.favorite);
        // 按收藏时间（创建时间）倒序
        articles.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        if let Some(limit) = limit {
            articles.truncate(limit);
        }
        Ok(articles)
    }

    // 辅助函数 - 使用文件锁保护读写操作
    fn load_feeds(&self) -> Result<Vec<Feed>> {
        let path = self.get_feeds_path();

        // 使用文件锁读取
        let file = File::open(&path)?;
        file.lock_shared()?; // 共享锁（读取锁）

        let reader = BufReader::new(file);
        let feeds: Vec<Feed> = serde_json::from_reader(reader)?;
        // 锁在 file drop 时自动释放
        Ok(feeds)
    }

    fn save_feeds(&self, feeds: &[Feed]) -> Result<()> {
        let path = self.get_feeds_path();

        // 先写入临时文件，然后原子性重命名
        let temp_path = path.with_extension("tmp");

        // 使用文件锁写入
        {
            let file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(&temp_path)?;
            file.lock_exclusive()?; // 独占锁（写入锁）

            let json = serde_json::to_string_pretty(feeds)?;
            {
                let mut writer = BufWriter::new(&file);
                writer.write_all(json.as_bytes())?;
                writer.flush()?;
            }
            // 锁在 file drop 时自动释放
        }

        // 原子性重命名
        fs::rename(&temp_path, &path)?;
        Ok(())
    }

    fn load_articles(&self) -> Result<Vec<Article>> {
        let path = self.get_articles_path();

        let file = File::open(&path)?;
        file.lock_shared()?;

        let reader = BufReader::new(file);
        let articles: Vec<Article> = serde_json::from_reader(reader)?;
        Ok(articles)
    }

    fn save_articles(&self, articles: &[Article]) -> Result<()> {
        let path = self.get_articles_path();
        let temp_path = path.with_extension("tmp");

        {
            let file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(&temp_path)?;
            file.lock_exclusive()?;

            let json = serde_json::to_string_pretty(articles)?;
            {
                let mut writer = BufWriter::new(&file);
                writer.write_all(json.as_bytes())?;
                writer.flush()?;
            }
        }

        fs::rename(&temp_path, &path)?;
        Ok(())
    }

    // ============= 日志存储方法 =============

    fn get_feed_logs_path(&self) -> std::path::PathBuf {
        self.data_dir.join(FEED_LOGS_FILE)
    }

    fn load_feed_logs(&self) -> Result<Vec<FeedLog>> {
        let path = self.get_feed_logs_path();
        let file = File::open(&path)?;
        file.lock_shared()?;
        let reader = BufReader::new(file);
        let logs: Vec<FeedLog> = serde_json::from_reader(reader)?;
        Ok(logs)
    }

    fn save_feed_logs(&self, logs: &[FeedLog]) -> Result<()> {
        let path = self.get_feed_logs_path();
        let temp_path = path.with_extension("tmp");

        {
            let file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(&temp_path)?;
            file.lock_exclusive()?;

            let json = serde_json::to_string_pretty(logs)?;
            {
                let mut writer = BufWriter::new(&file);
                writer.write_all(json.as_bytes())?;
                writer.flush()?;
            }
        }

        fs::rename(&temp_path, &path)?;
        Ok(())
    }

    /// 添加一条刷新日志，自动清理超出限制的旧日志
    pub fn add_feed_log(&self, log: &FeedLog) -> Result<()> {
        let _lock = self.acquire_write_lock()?;
        let mut logs = self.load_feed_logs()?;
        logs.push(log.clone());

        // 清理该 feed 超出限制的旧日志
        let feed_id = &log.feed_id;
        let feed_log_count = logs.iter().filter(|l| l.feed_id == *feed_id).count();
        if feed_log_count > MAX_LOGS_PER_FEED {
            let to_remove = feed_log_count - MAX_LOGS_PER_FEED;
            let mut removed = 0;
            logs.retain(|l| {
                if l.feed_id == *feed_id && removed < to_remove {
                    removed += 1;
                    false
                } else {
                    true
                }
            });
        }

        self.save_feed_logs(&logs)?;
        Ok(())
    }

    /// 获取指定订阅的刷新日志（按时间倒序）
    pub fn get_feed_logs(&self, feed_id: &str, limit: Option<usize>) -> Result<Vec<FeedLog>> {
        let logs = self.load_feed_logs()?;
        let mut feed_logs: Vec<FeedLog> = logs.into_iter().filter(|l| l.feed_id == feed_id).collect();
        feed_logs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        if let Some(limit) = limit {
            feed_logs.truncate(limit);
        }
        Ok(feed_logs)
    }

    /// 获取所有订阅的刷新日志（按时间倒序）
    pub fn get_all_feed_logs(&self, limit: Option<usize>) -> Result<Vec<FeedLog>> {
        let mut logs = self.load_feed_logs()?;
        logs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        if let Some(limit) = limit {
            logs.truncate(limit);
        }
        Ok(logs)
    }
}

// ============= 测试 =============
#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::fs;
    use std::sync::Arc;
    use uuid::Uuid;

    #[test]
    fn test_validate_path_safe() {
        let temp_dir = std::env::temp_dir().join("rss-test-safe");
        let _ = fs::create_dir_all(&temp_dir);

        assert!(validate_data_dir(&temp_dir).is_ok());

        // 清理
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_validate_path_traversal_blocked() {
        let malicious = std::path::PathBuf::from("/etc/passwd/../../");
        assert!(validate_data_dir(&malicious).is_err());
    }

    #[test]
    fn test_validate_path_parent_dir_blocked() {
        let temp_dir = std::env::temp_dir();
        let malicious = temp_dir.join("../etc/passwd");
        assert!(validate_data_dir(&malicious).is_err());
    }

    fn create_test_feed() -> Feed {
        Feed {
            id: Uuid::new_v4().to_string(),
            url: "https://example.com/feed".to_string(),
            title: "Test Feed".to_string(),
            description: Some("Test Description".to_string()),
            icon_url: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            use_full_content: false,
            use_ai_summary: false,
            use_ai_translation: false,
        }
    }

    fn create_test_article(feed_id: &str) -> Article {
        Article {
            id: Uuid::new_v4().to_string(),
            feed_id: feed_id.to_string(),
            title: "Test Article".to_string(),
            link: format!("https://example.com/article/{}", Uuid::new_v4()),
            description: Some("Test Description".to_string()),
            content: Some("<p>Test Content</p>".to_string()),
            published_at: Some(Utc::now()),
            read: false,
            created_at: Utc::now(),
            reading_progress: 0.0,
            favorite: false,
            full_content: None,
            ai_summary: None,
            ai_translation: None,
            ai_translated_title: None,
        }
    }

    // 创建一个使用内存存储的测试存储
    struct TestStorage {
        feeds: Arc<Mutex<Vec<Feed>>>,
        articles: Arc<Mutex<Vec<Article>>>,
    }

    impl TestStorage {
        fn new() -> Self {
            Self {
                feeds: Arc::new(Mutex::new(Vec::new())),
                articles: Arc::new(Mutex::new(Vec::new())),
            }
        }

        fn add_feed(&self, feed: &Feed) -> Result<()> {
            let mut feeds = self.feeds.lock().unwrap();
            feeds.push(feed.clone());
            Ok(())
        }

        fn get_feed(&self, id: &str) -> Result<Option<Feed>> {
            let feeds = self.feeds.lock().unwrap();
            Ok(feeds.iter().find(|f| f.id == id).cloned())
        }

        fn get_all_feeds(&self) -> Result<Vec<Feed>> {
            let feeds = self.feeds.lock().unwrap();
            Ok(feeds.clone())
        }

        fn update_feed(&self, feed: &Feed) -> Result<()> {
            let mut feeds = self.feeds.lock().unwrap();
            if let Some(existing) = feeds.iter_mut().find(|f| f.id == feed.id) {
                *existing = feed.clone();
                Ok(())
            } else {
                Err(crate::error::RssError::FeedNotFound(feed.id.clone()))
            }
        }

        fn delete_feed(&self, id: &str) -> Result<()> {
            let mut feeds = self.feeds.lock().unwrap();
            let mut articles = self.articles.lock().unwrap();
            let original_len = feeds.len();
            feeds.retain(|f| f.id != id);
            articles.retain(|a| a.feed_id != id);
            if feeds.len() < original_len {
                Ok(())
            } else {
                Err(crate::error::RssError::FeedNotFound(id.to_string()))
            }
        }

        fn add_article(&self, article: &Article) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            // 检查是否已存在
            if !articles
                .iter()
                .any(|a| a.link == article.link && a.feed_id == article.feed_id)
            {
                articles.push(article.clone());
            }
            Ok(())
        }

        fn get_articles(
            &self,
            feed_id: Option<&str>,
            limit: Option<usize>,
        ) -> Result<Vec<Article>> {
            let articles = self.articles.lock().unwrap();
            let mut result: Vec<Article> = articles
                .iter()
                .filter(|a| feed_id.map_or(true, |fid| a.feed_id == fid))
                .cloned()
                .collect();
            let is_all_feeds = feed_id.is_none();
            result.sort_by(|a, b| {
                let a_time = a.published_at.unwrap_or(a.created_at);
                let b_time = b.published_at.unwrap_or(b.created_at);
                if is_all_feeds {
                    a.read.cmp(&b.read).then_with(|| b_time.cmp(&a_time))
                } else {
                    b_time.cmp(&a_time)
                }
            });
            if let Some(limit) = limit {
                result.truncate(limit);
            }
            Ok(result)
        }

        fn mark_article_read(&self, id: &str, read: bool) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
                article.read = read;
                Ok(())
            } else {
                Err(crate::error::RssError::StorageError(format!(
                    "Article not found: {}",
                    id
                )))
            }
        }

        fn mark_all_read(&self, feed_id: &str) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            for article in articles.iter_mut() {
                if article.feed_id == feed_id {
                    article.read = true;
                }
            }
            Ok(())
        }

        fn get_unread_count(&self, feed_id: &str) -> Result<usize> {
            let articles = self.articles.lock().unwrap();
            Ok(articles
                .iter()
                .filter(|a| a.feed_id == feed_id && !a.read)
                .count())
        }

        fn get_article(&self, id: &str) -> Result<Option<Article>> {
            let articles = self.articles.lock().unwrap();
            Ok(articles.iter().find(|a| a.id == id).cloned())
        }

        fn update_reading_progress(&self, id: &str, progress: f32) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            let clamped_progress = progress.clamp(0.0, 100.0);
            if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
                article.reading_progress = clamped_progress;
                Ok(())
            } else {
                Err(crate::error::RssError::StorageError(format!(
                    "Article not found: {}",
                    id
                )))
            }
        }

        fn set_article_favorite(&self, id: &str, favorite: bool) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
                article.favorite = favorite;
                Ok(())
            } else {
                Err(crate::error::RssError::StorageError(format!(
                    "Article not found: {}",
                    id
                )))
            }
        }

        fn update_article_content(&self, id: &str, content: &str) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
                article.content = Some(content.to_string());
                Ok(())
            } else {
                Err(crate::error::RssError::StorageError(format!(
                    "Article not found: {}",
                    id
                )))
            }
        }

        fn update_article_full_content(&self, id: &str, full_content: &str) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
                article.full_content = Some(full_content.to_string());
                Ok(())
            } else {
                Err(crate::error::RssError::StorageError(format!(
                    "Article not found: {}",
                    id
                )))
            }
        }

        fn update_article_ai_summary(&self, id: &str, ai_summary: &str) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
                article.ai_summary = Some(ai_summary.to_string());
                Ok(())
            } else {
                Err(crate::error::RssError::StorageError(format!(
                    "Article not found: {}",
                    id
                )))
            }
        }

        fn update_article_ai_translation(
            &self,
            id: &str,
            ai_translation: &str,
            ai_translated_title: Option<&str>,
        ) -> Result<()> {
            let mut articles = self.articles.lock().unwrap();
            if let Some(article) = articles.iter_mut().find(|a| a.id == id) {
                article.ai_translation = Some(ai_translation.to_string());
                article.ai_translated_title = ai_translated_title.map(|s| s.to_string());
                Ok(())
            } else {
                Err(crate::error::RssError::StorageError(format!(
                    "Article not found: {}",
                    id
                )))
            }
        }

        fn get_favorite_articles(&self, limit: Option<usize>) -> Result<Vec<Article>> {
            let articles = self.articles.lock().unwrap();
            let mut result: Vec<Article> =
                articles.iter().filter(|a| a.favorite).cloned().collect();
            result.sort_by(|a, b| b.created_at.cmp(&a.created_at));
            if let Some(limit) = limit {
                result.truncate(limit);
            }
            Ok(result)
        }
    }

    #[test]
    fn test_add_and_get_feed() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        storage.add_feed(&feed).expect("Failed to add feed");

        let retrieved = storage.get_feed(&feed.id).expect("Failed to get feed");
        assert!(retrieved.is_some(), "Feed should exist");
        let retrieved_feed = retrieved.unwrap();
        assert_eq!(retrieved_feed.id, feed.id);
        assert_eq!(retrieved_feed.title, feed.title);
        assert_eq!(retrieved_feed.url, feed.url);
    }

    #[test]
    fn test_get_all_feeds() {
        let storage = TestStorage::new();

        let feed1 = create_test_feed();
        let feed2 = create_test_feed();

        storage.add_feed(&feed1).expect("Failed to add feed1");
        storage.add_feed(&feed2).expect("Failed to add feed2");

        let feeds = storage.get_all_feeds().expect("Failed to get all feeds");
        assert_eq!(feeds.len(), 2, "Should have 2 feeds");
    }

    #[test]
    fn test_update_feed() {
        let storage = TestStorage::new();
        let mut feed = create_test_feed();

        storage.add_feed(&feed).expect("Failed to add feed");

        feed.title = "Updated Feed".to_string();
        storage.update_feed(&feed).expect("Failed to update feed");

        let retrieved = storage.get_feed(&feed.id).expect("Failed to get feed");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().title, "Updated Feed");
    }

    #[test]
    fn test_delete_feed() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .delete_feed(&feed.id)
            .expect("Failed to delete feed");

        let retrieved = storage.get_feed(&feed.id).expect("Failed to get feed");
        assert!(retrieved.is_none(), "Feed should be deleted");
    }

    #[test]
    fn test_add_and_get_articles() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        storage.add_feed(&feed).expect("Failed to add feed");

        let article1 = create_test_article(&feed.id);
        let article2 = create_test_article(&feed.id);

        storage
            .add_article(&article1)
            .expect("Failed to add article1");
        storage
            .add_article(&article2)
            .expect("Failed to add article2");

        let articles = storage
            .get_articles(Some(&feed.id), None)
            .expect("Failed to get articles");
        assert_eq!(articles.len(), 2, "Should have 2 articles");
    }

    #[test]
    fn test_mark_article_read() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        storage
            .mark_article_read(&article.id, true)
            .expect("Failed to mark as read");

        let articles = storage
            .get_articles(Some(&feed.id), None)
            .expect("Failed to get articles");
        assert_eq!(articles[0].read, true, "Article should be marked as read");
    }

    #[test]
    fn test_mark_all_read() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        let article1 = create_test_article(&feed.id);
        let article2 = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article1)
            .expect("Failed to add article1");
        storage
            .add_article(&article2)
            .expect("Failed to add article2");

        storage
            .mark_all_read(&feed.id)
            .expect("Failed to mark all as read");

        let articles = storage
            .get_articles(Some(&feed.id), None)
            .expect("Failed to get articles");
        assert!(
            articles.iter().all(|a| a.read),
            "All articles should be marked as read"
        );
    }

    #[test]
    fn test_get_unread_count() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        let article1 = create_test_article(&feed.id);
        let article2 = create_test_article(&feed.id);
        let article3 = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article1)
            .expect("Failed to add article1");
        storage
            .add_article(&article2)
            .expect("Failed to add article2");
        storage
            .add_article(&article3)
            .expect("Failed to add article3");

        // Mark one as read
        storage
            .mark_article_read(&article1.id, true)
            .expect("Failed to mark as read");

        let unread_count = storage
            .get_unread_count(&feed.id)
            .expect("Failed to get unread count");
        assert_eq!(unread_count, 2, "Should have 2 unread articles");
    }

    #[test]
    fn test_get_articles_limit() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        storage.add_feed(&feed).expect("Failed to add feed");

        for _ in 0..10 {
            let article = create_test_article(&feed.id);
            storage
                .add_article(&article)
                .expect("Failed to add article");
        }

        let articles = storage
            .get_articles(Some(&feed.id), Some(5))
            .expect("Failed to get articles");
        assert_eq!(articles.len(), 5, "Should return only 5 articles");
    }

    #[test]
    fn test_get_articles_from_all_feeds() {
        let storage = TestStorage::new();

        let feed1 = create_test_feed();
        let feed2 = create_test_feed();

        storage.add_feed(&feed1).expect("Failed to add feed1");
        storage.add_feed(&feed2).expect("Failed to add feed2");

        storage
            .add_article(&create_test_article(&feed1.id))
            .expect("Failed to add article");
        storage
            .add_article(&create_test_article(&feed1.id))
            .expect("Failed to add article");
        storage
            .add_article(&create_test_article(&feed2.id))
            .expect("Failed to add article");

        let articles = storage
            .get_articles(None, None)
            .expect("Failed to get articles");
        assert_eq!(articles.len(), 3, "Should have 3 articles from all feeds");
    }

    #[test]
    fn test_article_deduplication() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        let mut article = create_test_article(&feed.id);
        let link = article.link.clone();

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        // 尝试添加相同链接的文章
        article.id = Uuid::new_v4().to_string(); // 改变 ID
        storage
            .add_article(&article)
            .expect("Failed to add article");

        let articles = storage
            .get_articles(Some(&feed.id), None)
            .expect("Failed to get articles");
        assert_eq!(articles.len(), 1, "Should deduplicate articles by link");
        assert_eq!(articles[0].link, link);
    }

    // ============= 阅读器功能测试 =============

    #[test]
    fn test_get_article() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        assert!(retrieved.is_some(), "Article should exist");
        assert_eq!(retrieved.unwrap().id, article.id);
    }

    #[test]
    fn test_get_article_not_found() {
        let storage = TestStorage::new();
        let retrieved = storage.get_article("nonexistent").expect("Failed to query");
        assert!(
            retrieved.is_none(),
            "Non-existent article should return None"
        );
    }

    #[test]
    fn test_update_reading_progress() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        // 更新阅读进度
        storage
            .update_reading_progress(&article.id, 50.0)
            .expect("Failed to update reading progress");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        assert_eq!(
            retrieved.unwrap().reading_progress,
            50.0,
            "Reading progress should be 50%"
        );
    }

    #[test]
    fn test_reading_progress_clamping() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        // 测试超出范围的上限
        storage
            .update_reading_progress(&article.id, 150.0)
            .expect("Failed to update reading progress");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        assert_eq!(
            retrieved.unwrap().reading_progress,
            100.0,
            "Reading progress should be clamped to 100%"
        );

        // 测试超出范围的下限
        storage
            .update_reading_progress(&article.id, -10.0)
            .expect("Failed to update reading progress");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        assert_eq!(
            retrieved.unwrap().reading_progress,
            0.0,
            "Reading progress should be clamped to 0%"
        );
    }

    #[test]
    fn test_set_article_favorite() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        // 收藏文章
        storage
            .set_article_favorite(&article.id, true)
            .expect("Failed to favorite article");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        assert!(retrieved.unwrap().favorite, "Article should be favorited");

        // 取消收藏
        storage
            .set_article_favorite(&article.id, false)
            .expect("Failed to unfavorite article");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        assert!(
            !retrieved.unwrap().favorite,
            "Article should be unfavorited"
        );
    }

    #[test]
    fn test_get_favorite_articles() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        let article1 = create_test_article(&feed.id);
        let article2 = create_test_article(&feed.id);
        let article3 = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article1)
            .expect("Failed to add article1");
        storage
            .add_article(&article2)
            .expect("Failed to add article2");
        storage
            .add_article(&article3)
            .expect("Failed to add article3");

        // 收藏 article1 和 article3
        storage
            .set_article_favorite(&article1.id, true)
            .expect("Failed to favorite article1");
        storage
            .set_article_favorite(&article3.id, true)
            .expect("Failed to favorite article3");

        let favorites = storage
            .get_favorite_articles(None)
            .expect("Failed to get favorite articles");

        assert_eq!(favorites.len(), 2, "Should have 2 favorite articles");
        assert!(
            favorites.iter().all(|a| a.favorite),
            "All returned articles should be favorited"
        );
    }

    #[test]
    fn test_get_favorite_articles_with_limit() {
        let storage = TestStorage::new();
        let feed = create_test_feed();

        storage.add_feed(&feed).expect("Failed to add feed");

        for _ in 0..10 {
            let article = create_test_article(&feed.id);
            storage
                .add_article(&article)
                .expect("Failed to add article");
            storage
                .set_article_favorite(&article.id, true)
                .expect("Failed to favorite article");
        }

        let favorites = storage
            .get_favorite_articles(Some(5))
            .expect("Failed to get favorite articles");

        assert_eq!(favorites.len(), 5, "Should return only 5 favorite articles");
    }

    #[test]
    fn test_update_progress_nonexistent_article() {
        let storage = TestStorage::new();
        let result = storage.update_reading_progress("nonexistent", 50.0);
        assert!(
            result.is_err(),
            "Should return error for non-existent article"
        );
    }

    #[test]
    fn test_set_favorite_nonexistent_article() {
        let storage = TestStorage::new();
        let result = storage.set_article_favorite("nonexistent", true);
        assert!(
            result.is_err(),
            "Should return error for non-existent article"
        );
    }

    #[test]
    fn test_update_article_content() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        let new_content = "<p>Full article content fetched from web</p>";
        storage
            .update_article_content(&article.id, new_content)
            .expect("Failed to update article content");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        assert_eq!(
            retrieved.unwrap().content,
            Some(new_content.to_string()),
            "Article content should be updated"
        );
    }

    #[test]
    fn test_update_content_nonexistent_article() {
        let storage = TestStorage::new();
        let result = storage.update_article_content("nonexistent", "content");
        assert!(
            result.is_err(),
            "Should return error for non-existent article"
        );
    }

    #[test]
    fn test_update_article_full_content() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).expect("Failed to add feed");
        storage
            .add_article(&article)
            .expect("Failed to add article");

        let full_content = "<p>Full article content fetched from web</p>";
        storage
            .update_article_full_content(&article.id, full_content)
            .expect("Failed to update article full content");

        let retrieved = storage
            .get_article(&article.id)
            .expect("Failed to get article");
        let retrieved = retrieved.unwrap();
        assert_eq!(
            retrieved.full_content,
            Some(full_content.to_string()),
            "Article full_content should be updated"
        );
        assert_eq!(
            retrieved.content,
            Some("<p>Test Content</p>".to_string()),
            "Original content should be preserved"
        );
    }

    #[test]
    fn test_update_full_content_nonexistent_article() {
        let storage = TestStorage::new();
        let result = storage.update_article_full_content("nonexistent", "content");
        assert!(
            result.is_err(),
            "Should return error for non-existent article"
        );
    }

    #[test]
    fn test_all_articles_unread_first_then_time_desc() {
        use chrono::Duration;

        let storage = TestStorage::new();
        let feed1 = create_test_feed();
        let feed2 = create_test_feed();
        storage.add_feed(&feed1).unwrap();
        storage.add_feed(&feed2).unwrap();

        let now = Utc::now();

        // 创建文章：混合已读/未读，不同时间
        // 已读文章 - 最新
        let mut a_read_new = create_test_article(&feed1.id);
        a_read_new.published_at = Some(now);
        a_read_new.read = true;
        storage.add_article(&a_read_new).unwrap();

        // 未读文章 - 较旧
        let mut a_unread_old = create_test_article(&feed2.id);
        a_unread_old.published_at = Some(now - Duration::hours(5));
        a_unread_old.read = false;
        storage.add_article(&a_unread_old).unwrap();

        // 未读文章 - 最新
        let mut a_unread_new = create_test_article(&feed1.id);
        a_unread_new.published_at = Some(now - Duration::hours(1));
        a_unread_new.read = false;
        storage.add_article(&a_unread_new).unwrap();

        // 已读文章 - 较旧
        let mut a_read_old = create_test_article(&feed2.id);
        a_read_old.published_at = Some(now - Duration::hours(10));
        a_read_old.read = true;
        storage.add_article(&a_read_old).unwrap();

        // feed_id=None → 全部文章，期望：未读优先 + 各组内时间倒序
        let articles = storage.get_articles(None, None).unwrap();
        assert_eq!(articles.len(), 4);

        // 前两篇应为未读，按时间倒序
        assert!(!articles[0].read, "First article should be unread");
        assert!(!articles[1].read, "Second article should be unread");
        assert_eq!(articles[0].id, a_unread_new.id, "Newest unread first");
        assert_eq!(articles[1].id, a_unread_old.id, "Older unread second");

        // 后两篇应为已读，按时间倒序
        assert!(articles[2].read, "Third article should be read");
        assert!(articles[3].read, "Fourth article should be read");
        assert_eq!(articles[2].id, a_read_new.id, "Newest read third");
        assert_eq!(articles[3].id, a_read_old.id, "Oldest read last");
    }

    #[test]
    fn test_single_feed_keeps_pure_time_order() {
        use chrono::Duration;

        let storage = TestStorage::new();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let now = Utc::now();

        // 已读 - 最新
        let mut a_read = create_test_article(&feed.id);
        a_read.published_at = Some(now);
        a_read.read = true;
        storage.add_article(&a_read).unwrap();

        // 未读 - 较旧
        let mut a_unread = create_test_article(&feed.id);
        a_unread.published_at = Some(now - Duration::hours(2));
        a_unread.read = false;
        storage.add_article(&a_unread).unwrap();

        // feed_id=Some → 单个 feed，期望：纯时间倒序（不区分已读/未读）
        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert_eq!(articles.len(), 2);
        assert_eq!(
            articles[0].id, a_read.id,
            "Newest article first regardless of read status"
        );
        assert_eq!(articles[1].id, a_unread.id, "Older article second");
    }

    #[test]
    fn test_update_article_ai_translation() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        let translation = "This is the translated content";
        storage
            .update_article_ai_translation(&article.id, translation, None)
            .expect("Failed to update ai_translation");

        let retrieved = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(retrieved.ai_translation, Some(translation.to_string()),);
        assert_eq!(retrieved.ai_translated_title, None);
    }

    #[test]
    fn test_update_ai_translation_with_title() {
        let storage = TestStorage::new();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);

        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        let translation = "翻译后的内容";
        let translated_title = "翻译后的标题";
        storage
            .update_article_ai_translation(&article.id, translation, Some(translated_title))
            .expect("Failed to update ai_translation with title");

        let retrieved = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(retrieved.ai_translation, Some(translation.to_string()));
        assert_eq!(
            retrieved.ai_translated_title,
            Some(translated_title.to_string())
        );
    }

    #[test]
    fn test_update_ai_translation_nonexistent_article() {
        let storage = TestStorage::new();
        let result = storage.update_article_ai_translation("nonexistent", "content", None);
        assert!(result.is_err());
    }
}
