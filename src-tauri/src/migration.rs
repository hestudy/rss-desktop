use crate::error::Result;
use crate::models::{AiUsageRecord, Article, Feed, FeedLog};
use crate::storage_sqlite::SqliteStorage;
use log::{info, warn};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

const FEEDS_FILE: &str = "feeds.json";
const ARTICLES_FILE: &str = "articles.json";
const FEED_LOGS_FILE: &str = "feed_logs.json";
const AI_USAGE_FILE: &str = "ai_usage.json";
const STORE_FILE: &str = "store.json";

/// 检查是否需要从 JSON 迁移到 SQLite
pub fn needs_migration(data_dir: &Path) -> bool {
    data_dir.join(FEEDS_FILE).exists()
        || data_dir.join(STORE_FILE).exists()
}

/// 执行从 JSON 文件到 SQLite 的数据迁移
/// 仅在至少有部分数据成功迁移（或无数据需要迁移）时才备份原始文件
pub fn migrate_json_to_sqlite(data_dir: &Path, storage: &SqliteStorage) -> Result<()> {
    info!("[migration] Starting JSON to SQLite migration...");

    let (fs, ff) = migrate_feeds(data_dir, storage);
    let (as_, af) = migrate_articles(data_dir, storage);
    let (ls, lf) = migrate_feed_logs(data_dir, storage);
    let (us, uf) = migrate_ai_usage(data_dir, storage);
    let (ks, kf) = migrate_kv_store(data_dir, storage);

    let total_success = fs + as_ + ls + us + ks;
    let total_failed = ff + af + lf + uf + kf;

    info!(
        "[migration] Migration stats: {} succeeded, {} failed",
        total_success, total_failed
    );

    // 仅在有数据成功迁移或无数据需要迁移时才备份
    // 如果全部失败（有数据但 0 成功），不备份以保留原始文件
    if total_failed > 0 && total_success == 0 {
        warn!("[migration] All records failed to migrate, keeping original files for retry");
        return Err(crate::error::RssError::StorageError(
            "Migration failed: no data migrated successfully".to_string(),
        ));
    }

    backup_old_files(data_dir);

    info!("[migration] Migration completed successfully");
    Ok(())
}

fn migrate_feeds(data_dir: &Path, storage: &SqliteStorage) -> (usize, usize) {
    let path = data_dir.join(FEEDS_FILE);
    if !path.exists() { return (0, 0); }
    let Ok(content) = fs::read_to_string(&path) else { return (0, 0); };
    let feeds: Vec<Feed> = serde_json::from_str(&content).unwrap_or_default();
    info!("[migration] Migrating {} feeds", feeds.len());
    let mut success = 0;
    let mut failed = 0;
    for feed in &feeds {
        match storage.add_feed(feed) {
            Ok(_) => success += 1,
            Err(e) => { failed += 1; info!("[migration] Skip feed {}: {}", feed.id, e); }
        }
    }
    (success, failed)
}

fn migrate_articles(data_dir: &Path, storage: &SqliteStorage) -> (usize, usize) {
    let path = data_dir.join(ARTICLES_FILE);
    if !path.exists() { return (0, 0); }
    let Ok(content) = fs::read_to_string(&path) else { return (0, 0); };
    let articles: Vec<Article> = serde_json::from_str(&content).unwrap_or_default();
    info!("[migration] Migrating {} articles", articles.len());
    let mut success = 0;
    let mut failed = 0;
    for article in &articles {
        match storage.add_article(article) {
            Ok(_) => success += 1,
            Err(e) => { failed += 1; info!("[migration] Skip article {}: {}", article.id, e); }
        }
    }
    (success, failed)
}

fn migrate_feed_logs(data_dir: &Path, storage: &SqliteStorage) -> (usize, usize) {
    let path = data_dir.join(FEED_LOGS_FILE);
    if !path.exists() { return (0, 0); }
    let Ok(content) = fs::read_to_string(&path) else { return (0, 0); };
    let logs: Vec<FeedLog> = serde_json::from_str(&content).unwrap_or_default();
    info!("[migration] Migrating {} feed logs", logs.len());
    let mut success = 0;
    let mut failed = 0;
    for log in &logs {
        match storage.add_feed_log(log) {
            Ok(_) => success += 1,
            Err(e) => { failed += 1; info!("[migration] Skip feed log {}: {}", log.id, e); }
        }
    }
    (success, failed)
}

fn migrate_ai_usage(data_dir: &Path, storage: &SqliteStorage) -> (usize, usize) {
    let path = data_dir.join(AI_USAGE_FILE);
    if !path.exists() { return (0, 0); }
    let Ok(content) = fs::read_to_string(&path) else { return (0, 0); };
    let records: Vec<AiUsageRecord> = serde_json::from_str(&content).unwrap_or_default();
    info!("[migration] Migrating {} AI usage records", records.len());
    let mut success = 0;
    let mut failed = 0;
    for record in &records {
        match storage.add_ai_usage_record(record) {
            Ok(_) => success += 1,
            Err(e) => { failed += 1; info!("[migration] Skip AI usage record {}: {}", record.id, e); }
        }
    }
    (success, failed)
}

fn migrate_kv_store(data_dir: &Path, storage: &SqliteStorage) -> (usize, usize) {
    let path = data_dir.join(STORE_FILE);
    if !path.exists() { return (0, 0); }
    let Ok(content) = fs::read_to_string(&path) else { return (0, 0); };
    let store: HashMap<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();
    info!("[migration] Migrating {} KV entries", store.len());
    let mut success = 0;
    let mut failed = 0;
    for (key, value) in &store {
        match storage.set_kv(key, value) {
            Ok(_) => success += 1,
            Err(e) => { failed += 1; info!("[migration] Skip KV {}: {}", key, e); }
        }
    }
    (success, failed)
}

fn backup_old_files(data_dir: &Path) {
    for file in &[FEEDS_FILE, ARTICLES_FILE, FEED_LOGS_FILE, AI_USAGE_FILE, STORE_FILE] {
        let path = data_dir.join(file);
        if path.exists() {
            let bak_path = path.with_extension("json.bak");
            if let Err(e) = fs::rename(&path, &bak_path) {
                info!("[migration] Failed to backup {}: {}", file, e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use crate::models::LogArticleSummary;
    use chrono::Utc;
    use std::sync::Arc;

    fn setup_test() -> (tempfile::TempDir, SqliteStorage) {
        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(Database::new_in_memory().unwrap());
        (tmp, SqliteStorage::new(db))
    }

    #[test]
    fn test_needs_migration_no_files() {
        let tmp = tempfile::tempdir().unwrap();
        assert!(!needs_migration(tmp.path()));
    }

    #[test]
    fn test_needs_migration_with_feeds() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("feeds.json"), "[]").unwrap();
        assert!(needs_migration(tmp.path()));
    }

    #[test]
    fn test_needs_migration_with_store() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("store.json"), "{}").unwrap();
        assert!(needs_migration(tmp.path()));
    }

    #[test]
    fn test_migrate_empty_files() {
        let (tmp, storage) = setup_test();
        fs::write(tmp.path().join("feeds.json"), "[]").unwrap();
        fs::write(tmp.path().join("articles.json"), "[]").unwrap();
        fs::write(tmp.path().join("store.json"), "{}").unwrap();

        migrate_json_to_sqlite(tmp.path(), &storage).unwrap();
        assert_eq!(storage.get_all_feeds().unwrap().len(), 0);
        assert!(!tmp.path().join("feeds.json").exists());
        assert!(tmp.path().join("feeds.json.bak").exists());
    }

    #[test]
    fn test_migrate_feeds_and_articles() {
        let (tmp, storage) = setup_test();

        let feed = Feed {
            id: "feed-1".to_string(),
            url: "https://example.com/feed".to_string(),
            title: "Test Feed".to_string(),
            description: None, icon_url: None,
            created_at: Utc::now(), updated_at: Utc::now(),
            use_full_content: false, use_ai_summary: true, use_ai_translation: false,
        };
        fs::write(tmp.path().join("feeds.json"), serde_json::to_string(&vec![&feed]).unwrap()).unwrap();

        let article = Article {
            id: "a-1".to_string(), feed_id: "feed-1".to_string(),
            title: "Test Article".to_string(),
            link: "https://example.com/a/1".to_string(),
            description: Some("Desc".to_string()),
            content: Some("<p>Content</p>".to_string()),
            published_at: Some(Utc::now()), read: true, created_at: Utc::now(),
            reading_progress: 50.0, favorite: true,
            full_content: Some("Full".to_string()),
            ai_summary: Some("Summary".to_string()),
            ai_translation: Some("Trans".to_string()),
            ai_translated_title: Some("翻译标题".to_string()),
            guid: Some("guid-1".to_string()),
        };
        fs::write(tmp.path().join("articles.json"), serde_json::to_string(&vec![&article]).unwrap()).unwrap();

        migrate_json_to_sqlite(tmp.path(), &storage).unwrap();

        assert_eq!(storage.get_all_feeds().unwrap().len(), 1);
        let a = storage.get_article("a-1").unwrap().unwrap();
        assert!(a.read);
        assert_eq!(a.reading_progress, 50.0);
        assert!(a.favorite);
        assert_eq!(a.ai_summary, Some("Summary".to_string()));
    }

    #[test]
    fn test_migrate_kv_store() {
        let (tmp, storage) = setup_test();
        let mut store = HashMap::new();
        store.insert("app_settings".to_string(), serde_json::json!({"poll_interval": "1h"}));
        fs::write(tmp.path().join("store.json"), serde_json::to_string(&store).unwrap()).unwrap();

        migrate_json_to_sqlite(tmp.path(), &storage).unwrap();
        let v = storage.get_kv("app_settings").unwrap().unwrap();
        assert_eq!(v["poll_interval"], "1h");
    }

    #[test]
    fn test_migrate_feed_logs() {
        let (tmp, storage) = setup_test();
        let feed = Feed {
            id: "feed-1".to_string(), url: "https://example.com/feed".to_string(),
            title: "Test".to_string(), description: None, icon_url: None,
            created_at: Utc::now(), updated_at: Utc::now(),
            use_full_content: false, use_ai_summary: false, use_ai_translation: false,
        };
        fs::write(tmp.path().join("feeds.json"), serde_json::to_string(&vec![&feed]).unwrap()).unwrap();

        let log = FeedLog::success("feed-1".to_string(), "Test".to_string(),
            vec![LogArticleSummary { title: "New".to_string(), link: "https://x.com".to_string() }], 150);
        fs::write(tmp.path().join("feed_logs.json"), serde_json::to_string(&vec![&log]).unwrap()).unwrap();

        migrate_json_to_sqlite(tmp.path(), &storage).unwrap();
        let logs = storage.get_feed_logs("feed-1", None).unwrap();
        assert_eq!(logs.len(), 1);
    }

    #[test]
    fn test_migrate_idempotent() {
        let (tmp, storage) = setup_test();
        let feed = Feed {
            id: "feed-1".to_string(), url: "https://example.com/feed".to_string(),
            title: "Test".to_string(), description: None, icon_url: None,
            created_at: Utc::now(), updated_at: Utc::now(),
            use_full_content: false, use_ai_summary: false, use_ai_translation: false,
        };
        fs::write(tmp.path().join("feeds.json"), serde_json::to_string(&vec![&feed]).unwrap()).unwrap();

        migrate_json_to_sqlite(tmp.path(), &storage).unwrap();
        assert_eq!(storage.get_all_feeds().unwrap().len(), 1);
        assert!(!needs_migration(tmp.path()));
    }
}
