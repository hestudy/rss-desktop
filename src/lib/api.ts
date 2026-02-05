import { invoke } from '@tauri-apps/api/core'
import type {
  Feed,
  Article,
  FeedWithUnreadCount,
  GetArticlesParams,
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
  static async addFeed(url: string): Promise<Feed> {
    return await invoke<Feed>('add_feed', { url })
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
}
