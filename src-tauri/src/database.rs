use crate::error::Result;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

const CURRENT_SCHEMA_VERSION: u32 = 2;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// 创建新的数据库连接（文件模式）
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Result<Self> {
        let db_path = data_dir.as_ref().join("rss.db");
        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init()?;
        Ok(db)
    }

    /// 创建内存数据库（用于测试）
    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init()?;
        Ok(db)
    }

    /// 初始化数据库：设置 PRAGMA 并创建表
    fn init(&self) -> Result<()> {
        let conn = self.conn.lock().map_err(|e| {
            crate::error::RssError::StorageError(format!("Lock error: {}", e))
        })?;

        // 启用 WAL 模式和外键约束
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA busy_timeout = 5000;",
        )?;

        self.create_tables(&conn)?;
        self.migrate(&conn)?;

        Ok(())
    }

    fn create_tables(&self, conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS feeds (
                id TEXT PRIMARY KEY NOT NULL,
                url TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                description TEXT,
                icon_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                use_full_content INTEGER NOT NULL DEFAULT 0,
                use_ai_summary INTEGER NOT NULL DEFAULT 0,
                use_ai_translation INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY NOT NULL,
                feed_id TEXT NOT NULL,
                title TEXT NOT NULL,
                link TEXT NOT NULL,
                description TEXT,
                content TEXT,
                published_at TEXT,
                read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                reading_progress REAL NOT NULL DEFAULT 0.0,
                favorite INTEGER NOT NULL DEFAULT 0,
                full_content TEXT,
                ai_summary TEXT,
                ai_translation TEXT,
                ai_translated_title TEXT,
                guid TEXT,
                FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
            CREATE INDEX IF NOT EXISTS idx_articles_read ON articles(read);
            CREATE INDEX IF NOT EXISTS idx_articles_favorite ON articles(favorite);
            CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
            CREATE INDEX IF NOT EXISTS idx_articles_guid ON articles(feed_id, guid);
            CREATE INDEX IF NOT EXISTS idx_articles_link ON articles(feed_id, link);

            CREATE TABLE IF NOT EXISTS feed_logs (
                id TEXT PRIMARY KEY NOT NULL,
                feed_id TEXT NOT NULL,
                feed_title TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                success INTEGER NOT NULL,
                new_article_count INTEGER NOT NULL DEFAULT 0,
                new_articles TEXT,
                error TEXT,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_feed_logs_feed_id ON feed_logs(feed_id);
            CREATE INDEX IF NOT EXISTS idx_feed_logs_timestamp ON feed_logs(timestamp);

            CREATE TABLE IF NOT EXISTS ai_usage_records (
                id TEXT PRIMARY KEY NOT NULL,
                timestamp TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL,
                completion_tokens INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                article_id TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_ai_usage_timestamp ON ai_usage_records(timestamp);
            CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage_records(operation_type);

            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL
            );"
        )?;

        Ok(())
    }

    fn migrate(&self, conn: &Connection) -> Result<()> {
        let version: u32 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // Migration v1 -> v2: Add thumbnail_url column to articles
        if version < 2 {
            conn.execute(
                "ALTER TABLE articles ADD COLUMN thumbnail_url TEXT",
                [],
            )?;
        }

        if version < CURRENT_SCHEMA_VERSION {
            conn.execute(
                "INSERT OR REPLACE INTO schema_version (version) VALUES (?1)",
                [CURRENT_SCHEMA_VERSION],
            )?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_in_memory_database() {
        let db = Database::new_in_memory().expect("Failed to create in-memory database");
        let conn = db.conn.lock().unwrap();

        // 验证表已创建
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"feeds".to_string()));
        assert!(tables.contains(&"articles".to_string()));
        assert!(tables.contains(&"feed_logs".to_string()));
        assert!(tables.contains(&"ai_usage_records".to_string()));
        assert!(tables.contains(&"kv_store".to_string()));
        assert!(tables.contains(&"schema_version".to_string()));
    }

    #[test]
    fn test_schema_version_set() {
        let db = Database::new_in_memory().expect("Failed to create database");
        let conn = db.conn.lock().unwrap();

        let version: u32 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
                row.get(0)
            })
            .unwrap();

        assert_eq!(version, CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let db = Database::new_in_memory().expect("Failed to create database");
        let conn = db.conn.lock().unwrap();

        let fk_enabled: i32 = conn
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();

        assert_eq!(fk_enabled, 1);
    }

    #[test]
    fn test_wal_mode() {
        let db = Database::new_in_memory().expect("Failed to create database");
        let conn = db.conn.lock().unwrap();

        // 内存数据库的 journal_mode 是 memory，不是 wal
        // 这里只验证 PRAGMA 不报错
        let mode: String = conn
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .unwrap();

        // 内存数据库返回 "memory"
        assert!(!mode.is_empty());
    }

    #[test]
    fn test_indexes_created() {
        let db = Database::new_in_memory().expect("Failed to create database");
        let conn = db.conn.lock().unwrap();

        let indexes: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(indexes.contains(&"idx_articles_feed_id".to_string()));
        assert!(indexes.contains(&"idx_articles_read".to_string()));
        assert!(indexes.contains(&"idx_articles_favorite".to_string()));
        assert!(indexes.contains(&"idx_articles_published_at".to_string()));
        assert!(indexes.contains(&"idx_articles_guid".to_string()));
        assert!(indexes.contains(&"idx_articles_link".to_string()));
        assert!(indexes.contains(&"idx_feed_logs_feed_id".to_string()));
        assert!(indexes.contains(&"idx_feed_logs_timestamp".to_string()));
        assert!(indexes.contains(&"idx_ai_usage_timestamp".to_string()));
        assert!(indexes.contains(&"idx_ai_usage_operation".to_string()));
    }
}
