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
  use_full_content?: boolean
  use_ai_summary?: boolean
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
  /** 全文抓取的内容 */
  full_content?: string
  /** AI 生成的摘要 */
  ai_summary?: string
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

/**
 * 轮询间隔配置
 */
export type PollInterval = '5m' | '15m' | '30m' | '1h' | '2h' | '6h' | '12h' | '24h'

/**
 * 通知类型
 */
export type NotificationType = 'system' | 'none'

/**
 * 应用设置
 */
export interface AppSettings {
  /** 轮询间隔 */
  pollInterval: PollInterval
  /** 通知类型 */
  notificationType: NotificationType
  /** 是否启用通知 */
  enableNotifications: boolean
  /** 每批次最大通知数量 */
  maxNotificationsPerBatch: number
  /** 是否启用后台刷新 */
  enableBackgroundRefresh: boolean
}

/**
 * 调度器状态
 */
export interface SchedulerState {
  /** 是否正在运行 */
  isRunning: boolean
  /** 上次运行时间 (ISO 字符串或 null) */
  lastRunAt: string | null
  /** 下次运行时间 (ISO 字符串或 null) */
  nextRunAt: string | null
  /** 连续错误次数 */
  consecutiveErrors: number
}
