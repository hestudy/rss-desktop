import { invoke } from '@tauri-apps/api/core'
import type {
  Feed,
  Article,
  FeedWithUnreadCount,
  ApiResponse,
  GetArticlesParams,
} from '../types'

/**
 * RSS API 客户端
 */
export class RssApi {
  /**
   * 添加 RSS 订阅
   */
  static async addFeed(url: string): Promise<Feed> {
    const result: ApiResponse<Feed> = await invoke('add_feed', { url })
    if (result.success && result.data) {
      return result.data
    }
    throw new Error(result.error || 'Failed to add feed')
  }

  /**
   * 获取所有订阅（包含未读计数）
   */
  static async getFeeds(): Promise<FeedWithUnreadCount[]> {
    const result: ApiResponse<FeedWithUnreadCount[]> = await invoke('get_feeds')
    if (result.success && result.data) {
      return result.data
    }
    throw new Error(result.error || 'Failed to get feeds')
  }

  /**
   * 删除订阅
   */
  static async removeFeed(id: string): Promise<void> {
    const result: ApiResponse<void> = await invoke('remove_feed', { id })
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove feed')
    }
  }

  /**
   * 刷新单个订阅
   */
  static async refreshFeed(id: string): Promise<FeedWithUnreadCount> {
    const result: ApiResponse<FeedWithUnreadCount> = await invoke('refresh_feed', { id })
    if (result.success && result.data) {
      return result.data
    }
    throw new Error(result.error || 'Failed to refresh feed')
  }

  /**
   * 刷新所有订阅
   */
  static async refreshAllFeeds(): Promise<FeedWithUnreadCount[]> {
    const result: ApiResponse<FeedWithUnreadCount[]> = await invoke('refresh_all_feeds')
    if (result.success && result.data) {
      return result.data
    }
    throw new Error(result.error || 'Failed to refresh all feeds')
  }

  /**
   * 获取文章列表
   */
  static async getArticles(params?: GetArticlesParams): Promise<Article[]> {
    const result: ApiResponse<Article[]> = await invoke('get_articles', {
      feedId: params?.feed_id,
      limit: params?.limit,
      unreadOnly: params?.unread_only,
    })
    if (result.success && result.data) {
      return result.data
    }
    throw new Error(result.error || 'Failed to get articles')
  }

  /**
   * 标记文章为已读/未读
   */
  static async markArticleRead(id: string, read: boolean): Promise<void> {
    const result: ApiResponse<void> = await invoke('mark_article_read', { id, read })
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark article')
    }
  }

  /**
   * 标记订阅下所有文章为已读
   */
  static async markAllRead(feedId: string): Promise<void> {
    const result: ApiResponse<void> = await invoke('mark_all_read', { feedId })
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark all read')
    }
  }

  /**
   * 获取未读文章数量
   */
  static async getUnreadCount(feedId?: string): Promise<number> {
    const result: ApiResponse<number> = await invoke('get_unread_count', {
      feedId,
    })
    if (result.success && result.data !== undefined) {
      return result.data
    }
    throw new Error(result.error || 'Failed to get unread count')
  }

  /**
   * 在浏览器中打开链接
   */
  static async openLink(url: string): Promise<void> {
    const result: ApiResponse<void> = await invoke('open_link', { url })
    if (!result.success) {
      throw new Error(result.error || 'Failed to open link')
    }
  }
}
