use crate::database::Database;
use crate::error::Result;
use crate::models::{AiUsageRecord, AiUsageSummary, Article, DailyUsageStats, Feed, FeedLog};
use chrono::{DateTime, Utc};
use rusqlite::params;
use std::sync::Arc;

/// 最大文章限制
pub const MAX_ARTICLES_LIMIT: usize = 1000;

/// 每个订阅最大日志条数
const MAX_LOGS_PER_FEED: usize = 100;

/// 最大 AI 使用记录数
const MAX_AI_USAGE_RECORDS: usize = 10000;

pub struct SqliteStorage {
    db: Arc<Database>,
}

impl SqliteStorage {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    fn lock_conn(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>> {
        self.db.conn.lock().map_err(|e| {
            crate::error::RssError::StorageError(format!("Lock error: {}", e))
        })
    }

    // ============= Feed 方法 =============

    pub fn add_feed(&self, feed: &Feed) -> Result<()> {
        let conn = self.lock_conn()?;
        conn.execute(
            "INSERT INTO feeds (id, url, title, description, icon_url, created_at, updated_at, use_full_content, use_ai_summary, use_ai_translation)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                feed.id,
                feed.url,
                feed.title,
                feed.description,
                feed.icon_url,
                feed.created_at.to_rfc3339(),
                feed.updated_at.to_rfc3339(),
                feed.use_full_content as i32,
                feed.use_ai_summary as i32,
                feed.use_ai_translation as i32,
            ],
        ).map_err(|e| match e {
            rusqlite::Error::SqliteFailure(err, _)
                if err.code == rusqlite::ErrorCode::ConstraintViolation =>
            {
                crate::error::RssError::StorageError(
                    "Feed with this URL already exists".to_string(),
                )
            }
            other => crate::error::RssError::DatabaseError(other),
        })?;
        Ok(())
    }

    pub fn get_feed(&self, id: &str) -> Result<Option<Feed>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, url, title, description, icon_url, created_at, updated_at, use_full_content, use_ai_summary, use_ai_translation FROM feeds WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| Self::row_to_feed(row))?;
        match rows.next() {
            Some(Ok(feed)) => Ok(Some(feed)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    pub fn get_all_feeds(&self) -> Result<Vec<Feed>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, url, title, description, icon_url, created_at, updated_at, use_full_content, use_ai_summary, use_ai_translation FROM feeds",
        )?;
        let feeds = stmt
            .query_map([], |row| Self::row_to_feed(row))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(feeds)
    }

    pub fn update_feed(&self, feed: &Feed) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE feeds SET url = ?2, title = ?3, description = ?4, icon_url = ?5, created_at = ?6, updated_at = ?7, use_full_content = ?8, use_ai_summary = ?9, use_ai_translation = ?10 WHERE id = ?1",
            params![
                feed.id,
                feed.url,
                feed.title,
                feed.description,
                feed.icon_url,
                feed.created_at.to_rfc3339(),
                feed.updated_at.to_rfc3339(),
                feed.use_full_content as i32,
                feed.use_ai_summary as i32,
                feed.use_ai_translation as i32,
            ],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::FeedNotFound(feed.id.clone()));
        }
        Ok(())
    }

    pub fn delete_feed(&self, id: &str) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute("DELETE FROM feeds WHERE id = ?1", params![id])?;
        if changed == 0 {
            return Err(crate::error::RssError::FeedNotFound(id.to_string()));
        }
        // articles 和 feed_logs 通过 ON DELETE CASCADE 自动删除
        Ok(())
    }

    fn row_to_feed(row: &rusqlite::Row) -> rusqlite::Result<Feed> {
        let created_at_str: String = row.get(5)?;
        let updated_at_str: String = row.get(6)?;
        let use_full_content: i32 = row.get(7)?;
        let use_ai_summary: i32 = row.get(8)?;
        let use_ai_translation: i32 = row.get(9)?;

        Ok(Feed {
            id: row.get(0)?,
            url: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            icon_url: row.get(4)?,
            created_at: DateTime::parse_from_rfc3339(&created_at_str)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            use_full_content: use_full_content != 0,
            use_ai_summary: use_ai_summary != 0,
            use_ai_translation: use_ai_translation != 0,
        })
    }

    // ============= Article 方法 =============

    pub fn add_article(&self, article: &Article) -> Result<()> {
        let conn = self.lock_conn()?;
        // 去重逻辑与 Article::is_duplicate_of 一致：
        // 只有当新文章和已有文章都有非空 guid 时才按 guid 去重，否则按 link 去重
        let has_valid_guid = article
            .guid
            .as_ref()
            .map_or(false, |g| !g.is_empty());

        let is_dup = if has_valid_guid {
            // 先检查是否有同 feed 同 guid 的文章
            let guid_match: i64 = conn.query_row(
                "SELECT COUNT(*) FROM articles WHERE feed_id = ?1 AND guid = ?2 AND guid != ''",
                params![article.feed_id, article.guid.as_ref().unwrap()],
                |row| row.get(0),
            )?;
            if guid_match > 0 {
                true
            } else {
                // guid 没匹配到，还需要检查 link（对方可能没有 guid 或 guid 为空）
                conn.query_row(
                    "SELECT COUNT(*) FROM articles WHERE feed_id = ?1 AND link = ?2",
                    params![article.feed_id, article.link],
                    |row| row.get::<_, i64>(0),
                )? > 0
            }
        } else {
            // 没有有效 guid，按 link 去重
            conn.query_row(
                "SELECT COUNT(*) FROM articles WHERE feed_id = ?1 AND link = ?2",
                params![article.feed_id, article.link],
                |row| row.get::<_, i64>(0),
            )? > 0
        };

        if is_dup {
            return Ok(());
        }

        conn.execute(
            "INSERT INTO articles (id, feed_id, title, link, description, content, published_at, read, created_at, reading_progress, favorite, full_content, ai_summary, ai_translation, ai_translated_title, guid, thumbnail_url)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                article.id,
                article.feed_id,
                article.title,
                article.link,
                article.description,
                article.content,
                article.published_at.map(|dt| dt.to_rfc3339()),
                article.read as i32,
                article.created_at.to_rfc3339(),
                article.reading_progress as f64,
                article.favorite as i32,
                article.full_content,
                article.ai_summary,
                article.ai_translation,
                article.ai_translated_title,
                article.guid,
                article.thumbnail_url,
            ],
        )?;
        Ok(())
    }

    pub fn get_articles(
        &self,
        feed_id: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<Article>> {
        let conn = self.lock_conn()?;
        let is_all_feeds = feed_id.is_none();

        let sql = if is_all_feeds {
            // 全部 feed：未读优先 + 时间倒序
            format!(
                "SELECT id, feed_id, title, link, description, content, published_at, read, created_at, reading_progress, favorite, full_content, ai_summary, ai_translation, ai_translated_title, guid, thumbnail_url
                 FROM articles
                 ORDER BY read ASC, COALESCE(published_at, created_at) DESC
                 {}",
                limit.map_or(String::new(), |l| format!("LIMIT {}", l))
            )
        } else {
            // 单个 feed：纯时间倒序
            format!(
                "SELECT id, feed_id, title, link, description, content, published_at, read, created_at, reading_progress, favorite, full_content, ai_summary, ai_translation, ai_translated_title, guid, thumbnail_url
                 FROM articles
                 WHERE feed_id = ?1
                 ORDER BY COALESCE(published_at, created_at) DESC
                 {}",
                limit.map_or(String::new(), |l| format!("LIMIT {}", l))
            )
        };

        let mut stmt = conn.prepare(&sql)?;
        let articles = if is_all_feeds {
            stmt.query_map([], |row| Self::row_to_article(row))?
                .collect::<std::result::Result<Vec<_>, _>>()?
        } else {
            stmt.query_map(params![feed_id.unwrap()], |row| {
                Self::row_to_article(row)
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?
        };
        Ok(articles)
    }

    pub fn mark_article_read(&self, id: &str, read: bool) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE articles SET read = ?2 WHERE id = ?1",
            params![id, read as i32],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )));
        }
        Ok(())
    }

    pub fn mark_all_read(&self, feed_id: &str) -> Result<()> {
        let conn = self.lock_conn()?;
        conn.execute(
            "UPDATE articles SET read = 1 WHERE feed_id = ?1",
            params![feed_id],
        )?;
        Ok(())
    }

    pub fn get_unread_count(&self, feed_id: &str) -> Result<usize> {
        let conn = self.lock_conn()?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM articles WHERE feed_id = ?1 AND read = 0",
            params![feed_id],
            |row| row.get(0),
        )?;
        Ok(count as usize)
    }

    pub fn get_article(&self, id: &str) -> Result<Option<Article>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, feed_id, title, link, description, content, published_at, read, created_at, reading_progress, favorite, full_content, ai_summary, ai_translation, ai_translated_title, guid, thumbnail_url FROM articles WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| Self::row_to_article(row))?;
        match rows.next() {
            Some(Ok(article)) => Ok(Some(article)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    pub fn update_reading_progress(&self, id: &str, progress: f32) -> Result<()> {
        let clamped = progress.clamp(0.0, 100.0);
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE articles SET reading_progress = ?2 WHERE id = ?1",
            params![id, clamped as f64],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )));
        }
        Ok(())
    }

    pub fn set_article_favorite(&self, id: &str, favorite: bool) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE articles SET favorite = ?2 WHERE id = ?1",
            params![id, favorite as i32],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )));
        }
        Ok(())
    }

    pub fn get_favorite_articles(&self, limit: Option<usize>) -> Result<Vec<Article>> {
        let conn = self.lock_conn()?;
        let sql = format!(
            "SELECT id, feed_id, title, link, description, content, published_at, read, created_at, reading_progress, favorite, full_content, ai_summary, ai_translation, ai_translated_title, guid, thumbnail_url
             FROM articles WHERE favorite = 1
             ORDER BY created_at DESC
             {}",
            limit.map_or(String::new(), |l| format!("LIMIT {}", l))
        );
        let mut stmt = conn.prepare(&sql)?;
        let articles = stmt
            .query_map([], |row| Self::row_to_article(row))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(articles)
    }

    pub fn update_article_content(&self, id: &str, content: &str) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE articles SET content = ?2 WHERE id = ?1",
            params![id, content],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )));
        }
        Ok(())
    }

    pub fn update_article_full_content(&self, id: &str, full_content: &str) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE articles SET full_content = ?2 WHERE id = ?1",
            params![id, full_content],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )));
        }
        Ok(())
    }

    pub fn update_article_ai_summary(&self, id: &str, ai_summary: &str) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE articles SET ai_summary = ?2 WHERE id = ?1",
            params![id, ai_summary],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )));
        }
        Ok(())
    }

    pub fn update_article_ai_translation(
        &self,
        id: &str,
        ai_translation: &str,
        ai_translated_title: Option<&str>,
    ) -> Result<()> {
        let conn = self.lock_conn()?;
        let changed = conn.execute(
            "UPDATE articles SET ai_translation = ?2, ai_translated_title = ?3 WHERE id = ?1",
            params![id, ai_translation, ai_translated_title],
        )?;
        if changed == 0 {
            return Err(crate::error::RssError::StorageError(format!(
                "Article not found: {}",
                id
            )));
        }
        Ok(())
    }

    fn row_to_article(row: &rusqlite::Row) -> rusqlite::Result<Article> {
        let published_at_str: Option<String> = row.get(6)?;
        let read_int: i32 = row.get(7)?;
        let created_at_str: String = row.get(8)?;
        let reading_progress: f64 = row.get(9)?;
        let favorite_int: i32 = row.get(10)?;

        Ok(Article {
            id: row.get(0)?,
            feed_id: row.get(1)?,
            title: row.get(2)?,
            link: row.get(3)?,
            description: row.get(4)?,
            content: row.get(5)?,
            published_at: published_at_str.and_then(|s| {
                DateTime::parse_from_rfc3339(&s)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            }),
            read: read_int != 0,
            created_at: DateTime::parse_from_rfc3339(&created_at_str)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            reading_progress: reading_progress as f32,
            favorite: favorite_int != 0,
            full_content: row.get(11)?,
            ai_summary: row.get(12)?,
            ai_translation: row.get(13)?,
            ai_translated_title: row.get(14)?,
            guid: row.get(15)?,
            thumbnail_url: row.get(16)?,
        })
    }

    // ============= FeedLog 方法 =============

    pub fn add_feed_log(&self, log: &FeedLog) -> Result<()> {
        let conn = self.lock_conn()?;
        let new_articles_json = serde_json::to_string(&log.new_articles).unwrap_or_default();
        conn.execute(
            "INSERT INTO feed_logs (id, feed_id, feed_title, timestamp, success, new_article_count, new_articles, error, duration_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                log.id,
                log.feed_id,
                log.feed_title,
                log.timestamp.to_rfc3339(),
                log.success as i32,
                log.new_article_count as i64,
                new_articles_json,
                log.error,
                log.duration_ms as i64,
            ],
        )?;

        // 清理超出限制的旧日志
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM feed_logs WHERE feed_id = ?1",
            params![log.feed_id],
            |row| row.get(0),
        )?;
        if count as usize > MAX_LOGS_PER_FEED {
            conn.execute(
                "DELETE FROM feed_logs WHERE id IN (
                    SELECT id FROM feed_logs WHERE feed_id = ?1
                    ORDER BY timestamp ASC
                    LIMIT ?2
                )",
                params![log.feed_id, count as usize - MAX_LOGS_PER_FEED],
            )?;
        }

        Ok(())
    }

    pub fn get_feed_logs(&self, feed_id: &str, limit: Option<usize>) -> Result<Vec<FeedLog>> {
        let conn = self.lock_conn()?;
        let sql = format!(
            "SELECT id, feed_id, feed_title, timestamp, success, new_article_count, new_articles, error, duration_ms
             FROM feed_logs WHERE feed_id = ?1
             ORDER BY timestamp DESC
             {}",
            limit.map_or(String::new(), |l| format!("LIMIT {}", l))
        );
        let mut stmt = conn.prepare(&sql)?;
        let logs = stmt
            .query_map(params![feed_id], |row| Self::row_to_feed_log(row))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    pub fn get_all_feed_logs(&self, limit: Option<usize>) -> Result<Vec<FeedLog>> {
        let conn = self.lock_conn()?;
        let sql = format!(
            "SELECT id, feed_id, feed_title, timestamp, success, new_article_count, new_articles, error, duration_ms
             FROM feed_logs
             ORDER BY timestamp DESC
             {}",
            limit.map_or(String::new(), |l| format!("LIMIT {}", l))
        );
        let mut stmt = conn.prepare(&sql)?;
        let logs = stmt
            .query_map([], |row| Self::row_to_feed_log(row))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    fn row_to_feed_log(row: &rusqlite::Row) -> rusqlite::Result<FeedLog> {
        let timestamp_str: String = row.get(3)?;
        let success_int: i32 = row.get(4)?;
        let new_article_count: i64 = row.get(5)?;
        let new_articles_json: Option<String> = row.get(6)?;
        let duration_ms: i64 = row.get(8)?;

        let new_articles = new_articles_json
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        Ok(FeedLog {
            id: row.get(0)?,
            feed_id: row.get(1)?,
            feed_title: row.get(2)?,
            timestamp: DateTime::parse_from_rfc3339(&timestamp_str)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            success: success_int != 0,
            new_article_count: new_article_count as usize,
            new_articles,
            error: row.get(7)?,
            duration_ms: duration_ms as u64,
        })
    }

    // ============= AI Usage 方法 =============

    pub fn add_ai_usage_record(&self, record: &AiUsageRecord) -> Result<()> {
        let conn = self.lock_conn()?;
        conn.execute(
            "INSERT INTO ai_usage_records (id, timestamp, operation_type, model, prompt_tokens, completion_tokens, total_tokens, article_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                record.id,
                record.timestamp.to_rfc3339(),
                record.operation_type,
                record.model,
                record.prompt_tokens as i64,
                record.completion_tokens as i64,
                record.total_tokens as i64,
                record.article_id,
            ],
        )?;

        // 超出限制时删除最旧的记录
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ai_usage_records",
            [],
            |row| row.get(0),
        )?;
        if count as usize > MAX_AI_USAGE_RECORDS {
            conn.execute(
                "DELETE FROM ai_usage_records WHERE id IN (
                    SELECT id FROM ai_usage_records ORDER BY timestamp ASC LIMIT ?1
                )",
                params![count as usize - MAX_AI_USAGE_RECORDS],
            )?;
        }

        Ok(())
    }

    pub fn get_ai_usage_records(&self) -> Result<Vec<AiUsageRecord>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, timestamp, operation_type, model, prompt_tokens, completion_tokens, total_tokens, article_id FROM ai_usage_records ORDER BY timestamp ASC",
        )?;
        let records = stmt
            .query_map([], |row| Self::row_to_ai_usage(row))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(records)
    }

    pub fn get_ai_usage_summary(
        &self,
        custom_input_price: Option<f64>,
        custom_output_price: Option<f64>,
    ) -> Result<AiUsageSummary> {
        let records = self.get_ai_usage_records()?;

        let mut total_prompt: u64 = 0;
        let mut total_completion: u64 = 0;
        let mut total_cost: f64 = 0.0;
        let mut summary_tokens: u64 = 0;
        let mut summary_cost: f64 = 0.0;
        let mut summary_calls: u64 = 0;
        let mut translation_tokens: u64 = 0;
        let mut translation_cost: f64 = 0.0;
        let mut translation_calls: u64 = 0;

        let mut daily_map: std::collections::BTreeMap<String, (u64, u64, u64, f64, u64)> =
            std::collections::BTreeMap::new();

        for record in &records {
            let cost = crate::ai_pricing::calculate_cost(
                &record.model,
                record.prompt_tokens,
                record.completion_tokens,
                custom_input_price,
                custom_output_price,
            );

            total_prompt += record.prompt_tokens as u64;
            total_completion += record.completion_tokens as u64;
            total_cost += cost;

            match record.operation_type.as_str() {
                "summary" => {
                    summary_tokens += record.total_tokens as u64;
                    summary_cost += cost;
                    summary_calls += 1;
                }
                "translation" => {
                    translation_tokens += record.total_tokens as u64;
                    translation_cost += cost;
                    translation_calls += 1;
                }
                _ => {}
            }

            let date = record.timestamp.format("%Y-%m-%d").to_string();
            let entry = daily_map.entry(date).or_insert((0, 0, 0, 0.0, 0));
            entry.0 += record.prompt_tokens as u64;
            entry.1 += record.completion_tokens as u64;
            entry.2 += record.total_tokens as u64;
            entry.3 += cost;
            entry.4 += 1;
        }

        let daily_stats: Vec<DailyUsageStats> = daily_map
            .into_iter()
            .map(|(date, (pt, ct, tt, cost, calls))| DailyUsageStats {
                date,
                prompt_tokens: pt,
                completion_tokens: ct,
                total_tokens: tt,
                cost,
                calls,
            })
            .collect();

        Ok(AiUsageSummary {
            total_prompt_tokens: total_prompt,
            total_completion_tokens: total_completion,
            total_tokens: total_prompt + total_completion,
            total_cost,
            total_calls: summary_calls + translation_calls,
            summary_tokens,
            summary_cost,
            summary_calls,
            translation_tokens,
            translation_cost,
            translation_calls,
            daily_stats,
        })
    }

    pub fn clear_ai_usage_records(&self) -> Result<()> {
        let conn = self.lock_conn()?;
        conn.execute("DELETE FROM ai_usage_records", [])?;
        Ok(())
    }

    fn row_to_ai_usage(row: &rusqlite::Row) -> rusqlite::Result<AiUsageRecord> {
        let timestamp_str: String = row.get(1)?;
        let prompt_tokens: i64 = row.get(4)?;
        let completion_tokens: i64 = row.get(5)?;
        let total_tokens: i64 = row.get(6)?;

        Ok(AiUsageRecord {
            id: row.get(0)?,
            timestamp: DateTime::parse_from_rfc3339(&timestamp_str)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            operation_type: row.get(2)?,
            model: row.get(3)?,
            prompt_tokens: prompt_tokens as u32,
            completion_tokens: completion_tokens as u32,
            total_tokens: total_tokens as u32,
            article_id: row.get(7)?,
        })
    }

    // ============= KV Store 方法 =============

    pub fn set_kv(&self, key: &str, value: &serde_json::Value) -> Result<()> {
        let conn = self.lock_conn()?;
        let json = serde_json::to_string(value)
            .map_err(|e| crate::error::RssError::StorageError(format!("JSON error: {}", e)))?;
        conn.execute(
            "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?1, ?2)",
            params![key, json],
        )?;
        Ok(())
    }

    pub fn get_kv(&self, key: &str) -> Result<Option<serde_json::Value>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare("SELECT value FROM kv_store WHERE key = ?1")?;
        let mut rows = stmt.query_map(params![key], |row| {
            let json_str: String = row.get(0)?;
            Ok(json_str)
        })?;
        match rows.next() {
            Some(Ok(json_str)) => {
                let value: serde_json::Value = serde_json::from_str(&json_str)
                    .map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?;
                Ok(Some(value))
            }
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use crate::models::LogArticleSummary;
    use chrono::Utc;
    use uuid::Uuid;

    fn create_storage() -> SqliteStorage {
        let db = Arc::new(Database::new_in_memory().expect("Failed to create test db"));
        SqliteStorage::new(db)
    }

    fn create_test_feed() -> Feed {
        Feed {
            id: Uuid::new_v4().to_string(),
            url: format!("https://example.com/feed/{}", Uuid::new_v4()),
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
            guid: None,
            thumbnail_url: None,
        }
    }

    // ============= Feed 测试 =============

    #[test]
    fn test_add_and_get_feed() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let retrieved = storage.get_feed(&feed.id).unwrap();
        assert!(retrieved.is_some());
        let r = retrieved.unwrap();
        assert_eq!(r.id, feed.id);
        assert_eq!(r.title, feed.title);
        assert_eq!(r.url, feed.url);
    }

    #[test]
    fn test_add_duplicate_feed_url() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let mut feed2 = create_test_feed();
        feed2.url = feed.url.clone();
        assert!(storage.add_feed(&feed2).is_err());
    }

    #[test]
    fn test_get_all_feeds() {
        let storage = create_storage();
        storage.add_feed(&create_test_feed()).unwrap();
        storage.add_feed(&create_test_feed()).unwrap();

        let feeds = storage.get_all_feeds().unwrap();
        assert_eq!(feeds.len(), 2);
    }

    #[test]
    fn test_update_feed() {
        let storage = create_storage();
        let mut feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        feed.title = "Updated Feed".to_string();
        storage.update_feed(&feed).unwrap();

        let r = storage.get_feed(&feed.id).unwrap().unwrap();
        assert_eq!(r.title, "Updated Feed");
    }

    #[test]
    fn test_delete_feed() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();
        storage.delete_feed(&feed.id).unwrap();

        assert!(storage.get_feed(&feed.id).unwrap().is_none());
    }

    #[test]
    fn test_delete_feed_cascades_articles() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();
        storage.add_article(&create_test_article(&feed.id)).unwrap();
        storage.add_article(&create_test_article(&feed.id)).unwrap();

        storage.delete_feed(&feed.id).unwrap();
        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert_eq!(articles.len(), 0);
    }

    // ============= Article 测试 =============

    #[test]
    fn test_add_and_get_articles() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        storage.add_article(&create_test_article(&feed.id)).unwrap();
        storage.add_article(&create_test_article(&feed.id)).unwrap();

        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert_eq!(articles.len(), 2);
    }

    #[test]
    fn test_article_deduplication_by_link() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let mut a1 = create_test_article(&feed.id);
        a1.link = "https://example.com/same-link".to_string();
        storage.add_article(&a1).unwrap();

        let mut a2 = create_test_article(&feed.id);
        a2.link = "https://example.com/same-link".to_string();
        storage.add_article(&a2).unwrap();

        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert_eq!(articles.len(), 1);
    }

    #[test]
    fn test_article_deduplication_by_guid() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let mut a1 = create_test_article(&feed.id);
        a1.guid = Some("unique-guid-123".to_string());
        storage.add_article(&a1).unwrap();

        let mut a2 = create_test_article(&feed.id);
        a2.guid = Some("unique-guid-123".to_string());
        a2.link = "https://example.com/different-link".to_string();
        storage.add_article(&a2).unwrap();

        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert_eq!(articles.len(), 1);
    }

    #[test]
    fn test_article_deduplication_guid_different_feeds() {
        let storage = create_storage();
        let feed1 = create_test_feed();
        let feed2 = create_test_feed();
        storage.add_feed(&feed1).unwrap();
        storage.add_feed(&feed2).unwrap();

        let mut a1 = create_test_article(&feed1.id);
        a1.guid = Some("same-guid".to_string());
        storage.add_article(&a1).unwrap();

        let mut a2 = create_test_article(&feed2.id);
        a2.guid = Some("same-guid".to_string());
        storage.add_article(&a2).unwrap();

        let all = storage.get_articles(None, None).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_article_deduplication_empty_guid_falls_back_to_link() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let mut a1 = create_test_article(&feed.id);
        a1.guid = Some("".to_string());
        a1.link = "https://example.com/same-link".to_string();
        storage.add_article(&a1).unwrap();

        let mut a2 = create_test_article(&feed.id);
        a2.guid = Some("valid-guid".to_string());
        a2.link = "https://example.com/same-link".to_string();
        storage.add_article(&a2).unwrap();

        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert_eq!(articles.len(), 1);
    }

    #[test]
    fn test_mark_article_read() {
        let storage = create_storage();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);
        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        storage.mark_article_read(&article.id, true).unwrap();
        let r = storage.get_article(&article.id).unwrap().unwrap();
        assert!(r.read);
    }

    #[test]
    fn test_mark_all_read() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let a1 = create_test_article(&feed.id);
        let a2 = create_test_article(&feed.id);
        storage.add_article(&a1).unwrap();
        storage.add_article(&a2).unwrap();

        storage.mark_all_read(&feed.id).unwrap();
        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert!(articles.iter().all(|a| a.read));
    }

    #[test]
    fn test_get_unread_count() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let a1 = create_test_article(&feed.id);
        let a2 = create_test_article(&feed.id);
        let a3 = create_test_article(&feed.id);
        storage.add_article(&a1).unwrap();
        storage.add_article(&a2).unwrap();
        storage.add_article(&a3).unwrap();

        storage.mark_article_read(&a1.id, true).unwrap();
        assert_eq!(storage.get_unread_count(&feed.id).unwrap(), 2);
    }

    #[test]
    fn test_get_articles_limit() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        for _ in 0..10 {
            storage.add_article(&create_test_article(&feed.id)).unwrap();
        }

        let articles = storage.get_articles(Some(&feed.id), Some(5)).unwrap();
        assert_eq!(articles.len(), 5);
    }

    #[test]
    fn test_all_articles_unread_first_then_time_desc() {
        use chrono::Duration;
        let storage = create_storage();
        let feed1 = create_test_feed();
        let feed2 = create_test_feed();
        storage.add_feed(&feed1).unwrap();
        storage.add_feed(&feed2).unwrap();

        let now = Utc::now();

        let mut a_read_new = create_test_article(&feed1.id);
        a_read_new.published_at = Some(now);
        a_read_new.read = true;
        storage.add_article(&a_read_new).unwrap();
        // 手动标记已读（因为 add_article 不会设置 read=true）
        storage.mark_article_read(&a_read_new.id, true).unwrap();

        let mut a_unread_old = create_test_article(&feed2.id);
        a_unread_old.published_at = Some(now - Duration::hours(5));
        storage.add_article(&a_unread_old).unwrap();

        let mut a_unread_new = create_test_article(&feed1.id);
        a_unread_new.published_at = Some(now - Duration::hours(1));
        storage.add_article(&a_unread_new).unwrap();

        let mut a_read_old = create_test_article(&feed2.id);
        a_read_old.published_at = Some(now - Duration::hours(10));
        a_read_old.read = true;
        storage.add_article(&a_read_old).unwrap();
        storage.mark_article_read(&a_read_old.id, true).unwrap();

        let articles = storage.get_articles(None, None).unwrap();
        assert_eq!(articles.len(), 4);

        // 前两篇应为未读
        assert!(!articles[0].read);
        assert!(!articles[1].read);
        assert_eq!(articles[0].id, a_unread_new.id);
        assert_eq!(articles[1].id, a_unread_old.id);

        // 后两篇应为已读
        assert!(articles[2].read);
        assert!(articles[3].read);
        assert_eq!(articles[2].id, a_read_new.id);
        assert_eq!(articles[3].id, a_read_old.id);
    }

    #[test]
    fn test_single_feed_keeps_pure_time_order() {
        use chrono::Duration;
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let now = Utc::now();

        let mut a_read = create_test_article(&feed.id);
        a_read.published_at = Some(now);
        a_read.read = true;
        storage.add_article(&a_read).unwrap();
        storage.mark_article_read(&a_read.id, true).unwrap();

        let mut a_unread = create_test_article(&feed.id);
        a_unread.published_at = Some(now - Duration::hours(2));
        storage.add_article(&a_unread).unwrap();

        let articles = storage.get_articles(Some(&feed.id), None).unwrap();
        assert_eq!(articles.len(), 2);
        assert_eq!(articles[0].id, a_read.id);
        assert_eq!(articles[1].id, a_unread.id);
    }

    #[test]
    fn test_update_reading_progress() {
        let storage = create_storage();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);
        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        storage.update_reading_progress(&article.id, 50.0).unwrap();
        let r = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(r.reading_progress, 50.0);
    }

    #[test]
    fn test_reading_progress_clamping() {
        let storage = create_storage();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);
        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        storage.update_reading_progress(&article.id, 150.0).unwrap();
        let r = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(r.reading_progress, 100.0);

        storage.update_reading_progress(&article.id, -10.0).unwrap();
        let r = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(r.reading_progress, 0.0);
    }

    #[test]
    fn test_set_article_favorite() {
        let storage = create_storage();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);
        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        storage.set_article_favorite(&article.id, true).unwrap();
        assert!(storage.get_article(&article.id).unwrap().unwrap().favorite);

        storage.set_article_favorite(&article.id, false).unwrap();
        assert!(!storage.get_article(&article.id).unwrap().unwrap().favorite);
    }

    #[test]
    fn test_get_favorite_articles() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let a1 = create_test_article(&feed.id);
        let a2 = create_test_article(&feed.id);
        let a3 = create_test_article(&feed.id);
        storage.add_article(&a1).unwrap();
        storage.add_article(&a2).unwrap();
        storage.add_article(&a3).unwrap();

        storage.set_article_favorite(&a1.id, true).unwrap();
        storage.set_article_favorite(&a3.id, true).unwrap();

        let favorites = storage.get_favorite_articles(None).unwrap();
        assert_eq!(favorites.len(), 2);
        assert!(favorites.iter().all(|a| a.favorite));
    }

    #[test]
    fn test_update_article_content() {
        let storage = create_storage();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);
        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        storage.update_article_content(&article.id, "<p>New content</p>").unwrap();
        let r = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(r.content, Some("<p>New content</p>".to_string()));
    }

    #[test]
    fn test_update_article_full_content() {
        let storage = create_storage();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);
        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        storage.update_article_full_content(&article.id, "<p>Full content</p>").unwrap();
        let r = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(r.full_content, Some("<p>Full content</p>".to_string()));
        assert_eq!(r.content, Some("<p>Test Content</p>".to_string()));
    }

    #[test]
    fn test_update_article_ai_translation() {
        let storage = create_storage();
        let feed = create_test_feed();
        let article = create_test_article(&feed.id);
        storage.add_feed(&feed).unwrap();
        storage.add_article(&article).unwrap();

        storage.update_article_ai_translation(&article.id, "Translated", Some("翻译标题")).unwrap();
        let r = storage.get_article(&article.id).unwrap().unwrap();
        assert_eq!(r.ai_translation, Some("Translated".to_string()));
        assert_eq!(r.ai_translated_title, Some("翻译标题".to_string()));
    }

    #[test]
    fn test_nonexistent_article_errors() {
        let storage = create_storage();
        assert!(storage.mark_article_read("nope", true).is_err());
        assert!(storage.update_reading_progress("nope", 50.0).is_err());
        assert!(storage.set_article_favorite("nope", true).is_err());
        assert!(storage.update_article_content("nope", "x").is_err());
        assert!(storage.update_article_full_content("nope", "x").is_err());
        assert!(storage.update_article_ai_summary("nope", "x").is_err());
        assert!(storage.update_article_ai_translation("nope", "x", None).is_err());
    }

    // ============= FeedLog 测试 =============

    #[test]
    fn test_add_and_get_feed_logs() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let log = FeedLog::success(feed.id.clone(), feed.title.clone(), vec![], 100);
        storage.add_feed_log(&log).unwrap();

        let logs = storage.get_feed_logs(&feed.id, None).unwrap();
        assert_eq!(logs.len(), 1);
        assert!(logs[0].success);
    }

    #[test]
    fn test_get_all_feed_logs() {
        let storage = create_storage();
        let feed1 = create_test_feed();
        let feed2 = create_test_feed();
        storage.add_feed(&feed1).unwrap();
        storage.add_feed(&feed2).unwrap();

        storage.add_feed_log(&FeedLog::success(feed1.id.clone(), feed1.title.clone(), vec![], 100)).unwrap();
        storage.add_feed_log(&FeedLog::success(feed2.id.clone(), feed2.title.clone(), vec![], 200)).unwrap();

        let logs = storage.get_all_feed_logs(None).unwrap();
        assert_eq!(logs.len(), 2);
    }

    #[test]
    fn test_feed_log_with_articles() {
        let storage = create_storage();
        let feed = create_test_feed();
        storage.add_feed(&feed).unwrap();

        let summaries = vec![
            LogArticleSummary { title: "Article 1".to_string(), link: "https://example.com/1".to_string() },
            LogArticleSummary { title: "Article 2".to_string(), link: "https://example.com/2".to_string() },
        ];
        let log = FeedLog::success(feed.id.clone(), feed.title.clone(), summaries, 150);
        storage.add_feed_log(&log).unwrap();

        let logs = storage.get_feed_logs(&feed.id, None).unwrap();
        assert_eq!(logs[0].new_articles.len(), 2);
        assert_eq!(logs[0].new_articles[0].title, "Article 1");
    }

    // ============= KV Store 测试 =============

    #[test]
    fn test_kv_store_set_and_get() {
        let storage = create_storage();
        let value = serde_json::json!({"key": "value", "num": 42});
        storage.set_kv("test_key", &value).unwrap();

        let retrieved = storage.get_kv("test_key").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), value);
    }

    #[test]
    fn test_kv_store_get_nonexistent() {
        let storage = create_storage();
        let result = storage.get_kv("nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_kv_store_overwrite() {
        let storage = create_storage();
        storage.set_kv("key", &serde_json::json!("old")).unwrap();
        storage.set_kv("key", &serde_json::json!("new")).unwrap();

        let r = storage.get_kv("key").unwrap().unwrap();
        assert_eq!(r, serde_json::json!("new"));
    }
}