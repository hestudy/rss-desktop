import { z } from 'zod'

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
  /** 阅读进度 0-100 */
  reading_progress?: number
  /** 是否收藏 */
  favorite?: boolean
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
  favorites_only?: boolean
}

/**
 * 阅读器设置
 */
export interface ReaderSettings {
  /** 字体大小 12-24px */
  fontSize: number
  /** 行间距 1.0-2.5 */
  lineHeight: number
  /** 字间距 0-5px */
  letterSpacing: number
  /** 文本对齐 */
  textAlign: 'left' | 'center' | 'justify'
  /** 内容最大宽度 (ch) */
  maxWidth: number
  /** 是否显示阅读进度 */
  showProgress: boolean
}

/**
 * Zod schema for ReaderSettings validation
 */
export const ReaderSettingsSchema = z.object({
  fontSize: z.number().min(12).max(24).default(16),
  lineHeight: z.number().min(1).max(2.5).default(1.8),
  letterSpacing: z.number().min(0).max(5).default(0),
  textAlign: z.enum(['left', 'center', 'justify']).default('left'),
  maxWidth: z.number().min(50).max(120).default(80),
  showProgress: z.boolean().default(true),
})

/**
 * 默认阅读器设置
 */
export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  textAlign: 'left',
  maxWidth: 80,
  showProgress: true,
}
