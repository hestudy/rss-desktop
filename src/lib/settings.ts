import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'

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
  /** 关闭窗口时最小化到托盘 */
  closeToTray: boolean
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

/**
 * AppSettings 的部分更新类型
 */
export type PartialAppSettings = Partial<Omit<AppSettings, 'pollInterval'>> & {
  pollInterval?: PollInterval
}

/**
 * Zod schema for AppSettings validation
 */
export const AppSettingsSchema = z.object({
  pollInterval: z.enum(['5m', '15m', '30m', '1h', '2h', '6h', '12h', '24h']).default('30m'),
  notificationType: z.enum(['system', 'none']).default('system'),
  enableNotifications: z.boolean().default(true),
  maxNotificationsPerBatch: z.number().int().min(0).max(100).default(5),
  enableBackgroundRefresh: z.boolean().default(false),
  closeToTray: z.boolean().default(true),
})

/**
 * AI 设置
 */
export interface AiSettings {
  apiEndpoint: string
  apiKey: string
  model: string
  maxTokens: number
  prompt: string
  enableAutoSummary: boolean
  language: string
  maxConcurrency: number
  customInputPrice?: number | null
  customOutputPrice?: number | null
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  maxTokens: 300,
  prompt: '你是一个专业的文章摘要助手。请用简洁的语言总结以下文章的核心内容，包括主要观点和关键信息。',
  enableAutoSummary: false,
  language: 'zh-CN',
  maxConcurrency: 3,
  customInputPrice: null,
  customOutputPrice: null,
}

export const AiSettingsSchema = z.object({
  apiEndpoint: z.string().default('https://api.openai.com/v1'),
  apiKey: z.string().default(''),
  model: z.string().default('gpt-4o-mini'),
  maxTokens: z.number().int().min(50).max(2000).default(300),
  prompt: z.string().default(DEFAULT_AI_SETTINGS.prompt),
  enableAutoSummary: z.boolean().default(false),
  language: z.string().default('zh-CN'),
  maxConcurrency: z.number().int().min(1).max(10).default(3),
  customInputPrice: z.number().min(0).nullable().optional().default(null),
  customOutputPrice: z.number().min(0).nullable().optional().default(null),
})

/**
 * Zod schema for SchedulerState validation
 */
export const SchedulerStateSchema = z.object({
  isRunning: z.boolean().default(false),
  lastRunAt: z.string().nullable().default(null),
  nextRunAt: z.string().nullable().default(null),
  consecutiveErrors: z.number().int().min(0).default(0),
})

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: AppSettings = {
  pollInterval: '30m',
  notificationType: 'system',
  enableNotifications: true,
  maxNotificationsPerBatch: 5,
  enableBackgroundRefresh: false,
  closeToTray: true,
}

// ============= API 函数 =============

/**
 * 获取应用设置
 */
export async function getSettings(): Promise<AppSettings> {
  const result = await invoke<AppSettings>('get_settings')
  return AppSettingsSchema.parse(result)
}

/**
 * 更新应用设置
 *
 * @param settings - 要更新的设置（支持部分更新）
 */
export async function updateSettings(
  settings: PartialAppSettings
): Promise<AppSettings> {
  // 先获取当前设置
  const current = await getSettings()

  // 合并设置
  const merged: AppSettings = {
    ...current,
    ...settings,
  }

  // 验证
  const validated = AppSettingsSchema.parse(merged)

  // 发送到后端
  const result = await invoke<AppSettings>('update_settings', {
    settings: validated,
  })

  return AppSettingsSchema.parse(result)
}

/**
 * 获取调度器状态
 */
export async function getSchedulerState(): Promise<SchedulerState> {
  const result = await invoke<SchedulerState>('get_scheduler_state')
  return SchedulerStateSchema.parse(result)
}

/**
 * 获取 AI 设置
 */
export async function getAiSettings(): Promise<AiSettings> {
  const result = await invoke<AiSettings>('get_ai_settings')
  return AiSettingsSchema.parse(result)
}

/**
 * 更新 AI 设置
 */
export async function updateAiSettings(settings: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getAiSettings()
  const merged = { ...current, ...settings }
  const validated = AiSettingsSchema.parse(merged)
  const result = await invoke<AiSettings>('update_ai_settings', { settings: validated })
  return AiSettingsSchema.parse(result)
}

/**
 * 获取可用的轮询间隔选项
 */
export const POLL_INTERVAL_OPTIONS: { value: PollInterval; label: string }[] = [
  { value: '5m', label: '5 分钟' },
  { value: '15m', label: '15 分钟' },
  { value: '30m', label: '30 分钟' },
  { value: '1h', label: '1 小时' },
  { value: '2h', label: '2 小时' },
  { value: '6h', label: '6 小时' },
  { value: '12h', label: '12 小时' },
  { value: '24h', label: '24 小时' },
]

/**
 * 获取可用的通知类型选项
 */
export const NOTIFICATION_TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: 'system', label: '系统通知' },
  { value: 'none', label: '不通知' },
]
