/**
 * RSS 订阅源
 */
export interface Feed {
  id: string
  url: string
  title: string
  description?: string
  icon_url?: string
  created_at: string
  updated_at: string
}

/**
 * RSS 文章
 */
export interface Article {
  id: string
  feed_id: string
  title: string
  link: string
  description?: string
  content?: string
  published_at?: string
  read: boolean
  created_at: string
}

/**
 * 带未读计数的订阅源
 */
export interface FeedWithUnreadCount {
  feed: Feed
  unread_count: number
}

/**
 * API 响应包装
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 获取文章参数
 */
export interface GetArticlesParams {
  feed_id?: string
  limit?: number
  unread_only?: boolean
}
