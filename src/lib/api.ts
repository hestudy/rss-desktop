import { invoke } from '@tauri-apps/api/core'
import type {
  Feed,
  Article,
  FeedWithUnreadCount,
  GetArticlesParams,
  QueueStatusSnapshot,
  QueueTaskType,
} from '../types'

/**
 * RSS API 客户端
 *
 * Note: Tauri commands return data directly (not wrapped in ApiResponse)
 * when successful. Errors are thrown as exceptions.
 */
export class RssApi {
  /**
   * 添加 RSS 订阅
   */
  static async addFeed(url: string, useFullContent?: boolean, useAiSummary?: boolean, useAiTranslation?: boolean): Promise<Feed> {
    return await invoke<Feed>('add_feed', { url, useFullContent, useAiSummary, useAiTranslation })
  }

  /**
   * 获取所有订阅（包含未读计数）
   */
  static async getFeeds(): Promise<FeedWithUnreadCount[]> {
    return await invoke<FeedWithUnreadCount[]>('get_feeds')
  }

  /**
   * 删除订阅
   */
  static async removeFeed(id: string): Promise<void> {
    await invoke('remove_feed', { id })
  }

  /**
   * 刷新单个订阅
   */
  static async refreshFeed(id: string): Promise<FeedWithUnreadCount> {
    return await invoke<FeedWithUnreadCount>('refresh_feed', { id })
  }

  /**
   * 刷新所有订阅
   */
  static async refreshAllFeeds(): Promise<FeedWithUnreadCount[]> {
    return await invoke<FeedWithUnreadCount[]>('refresh_all_feeds')
  }

  /**
   * 获取文章列表
   */
  static async getArticles(params?: GetArticlesParams): Promise<Article[]> {
    return await invoke<Article[]>('get_articles', {
      feedId: params?.feed_id,
      limit: params?.limit,
      unreadOnly: params?.unread_only,
    })
  }

  /**
   * 标记文章为已读/未读
   */
  static async markArticleRead(id: string, read: boolean): Promise<void> {
    await invoke('mark_article_read', { id, read })
  }

  /**
   * 标记订阅下所有文章为已读
   */
  static async markAllRead(feedId: string): Promise<void> {
    await invoke('mark_all_read', { feedId })
  }

  /**
   * 获取未读文章数量
   */
  static async getUnreadCount(feedId?: string): Promise<number> {
    return await invoke<number>('get_unread_count', {
      feedId,
    })
  }

  /**
   * 在浏览器中打开链接
   */
  static async openLink(url: string): Promise<void> {
    await invoke('open_link', { url })
  }

  /**
   * 获取单个文章
   */
  static async getArticle(id: string): Promise<Article | null> {
    const result = await invoke<Article | null>('get_article', { id })
    return result
  }

  /**
   * 更新阅读进度 (0-100)
   */
  static async updateReadingProgress(id: string, progress: number): Promise<void> {
    await invoke('update_reading_progress', { id, progress })
  }

  /**
   * 收藏/取消收藏文章
   */
  static async setArticleFavorite(id: string, favorite: boolean): Promise<void> {
    await invoke('set_article_favorite', { id, favorite })
  }

  /**
   * 获取收藏的文章
   */
  static async getFavoriteArticles(limit?: number): Promise<Article[]> {
    return await invoke<Article[]>('get_favorite_articles', { limit })
  }

  static async updateFeed(
    id: string,
    title?: string,
    url?: string,
    useFullContent?: boolean,
    useAiSummary?: boolean,
    useAiTranslation?: boolean,
  ): Promise<FeedWithUnreadCount> {
    return await invoke<FeedWithUnreadCount>('update_feed_info', { id, title, url, useFullContent, useAiSummary, useAiTranslation })
  }

  static async fetchFullContent(id: string): Promise<Article> {
    return await invoke<Article>('fetch_full_content', { id })
  }

  static async generateSummary(id: string): Promise<Article> {
    return await invoke<Article>('generate_article_summary', { id })
  }

  static async translateArticle(id: string, targetLang?: string): Promise<Article> {
    return await invoke<Article>('translate_article', { id, targetLang })
  }

  static async queueAddTask(
    taskType: QueueTaskType,
    articleId: string,
    options?: { url?: string; targetLang?: string; priority?: 'high' | 'normal' },
  ): Promise<string> {
    return await invoke<string>('queue_add_task', {
      taskType,
      articleId,
      url: options?.url,
      targetLang: options?.targetLang,
      priority: options?.priority,
    })
  }

  static async queueGetStatus(): Promise<QueueStatusSnapshot> {
    return await invoke<QueueStatusSnapshot>('queue_get_status')
  }

  static async queueCancelTask(taskId: string): Promise<void> {
    await invoke('queue_cancel_task', { taskId })
  }

  static async queueClearCompleted(): Promise<number> {
    return await invoke<number>('queue_clear_completed')
  }
}
