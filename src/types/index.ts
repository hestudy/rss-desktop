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
  use_ai_translation?: boolean
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
  /** AI 翻译的内容 */
  ai_translation?: string
  /** AI 翻译的标题 */
  ai_translated_title?: string
}

/**
 * 带未读计数的订阅源
 */
export interface FeedWithUnreadCount {
  feed: Feed
  unread_count: number
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

export type QueueTaskType = 'fetch_full_content' | 'ai_summary' | 'ai_translation'
export type QueueTaskPriority = 'high' | 'normal'

export interface QueueTask {
  id: string
  task_type: {
    type: QueueTaskType
    article_id: string
    url?: string
    target_lang?: string
  }
  priority: QueueTaskPriority
  status:
    | { status: 'pending' }
    | { status: 'running' }
    | { status: 'completed' }
    | { status: 'failed'; error: string; retries: number }
    | { status: 'cancelled' }
  created_at: string
  started_at: string | null
  completed_at: string | null
  retries: number
}

export interface QueueStatusSnapshot {
  pending_count: number
  running_count: number
  completed_count: number
  failed_count: number
  tasks: QueueTask[]
}

export interface TaskProgressEvent {
  task_id: string
  article_id: string
  task_type: string
  status: string
  error: string | null
}

export interface FeedRefreshedEvent {
  feed: FeedWithUnreadCount
  new_article_count: number
}

export interface FeedRefreshProgressEvent {
  feed_id: string
  feed_title: string
  status: 'started' | 'completed' | 'failed'
  current: number
  total: number
  error: string | null
}

export interface LogArticleSummary {
  title: string
  link: string
}

export interface FeedLog {
  id: string
  feed_id: string
  feed_title: string
  timestamp: string
  success: boolean
  new_article_count: number
  new_articles: LogArticleSummary[]
  error: string | null
  duration_ms: number
}

export interface RefreshProgress {
  isRefreshing: boolean
  current: number
  total: number
  currentFeedTitle: string
}
