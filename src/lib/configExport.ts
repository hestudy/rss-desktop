import { z } from 'zod'
import type { Feed } from '../types'
import type { AiSettings, AppSettings } from './settings'

/**
 * 当前配置版本
 */
export const CURRENT_CONFIG_VERSION = '1.0'

/**
 * Feed 导出数据结构 (不包含 id 和时间戳)
 */
export interface FeedExport {
  url: string
  title: string
  description?: string
  icon_url?: string
  use_full_content?: boolean
  use_ai_summary?: boolean
  use_ai_translation?: boolean
}

/**
 * Feed 导出 Zod Schema
 */
export const FeedExportSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  icon_url: z.string().optional(),
  use_full_content: z.boolean().default(false),
  use_ai_summary: z.boolean().default(false),
  use_ai_translation: z.boolean().default(false),
})

/**
 * AI 设置导出数据结构 (不包含敏感的 apiKey)
 */
export interface AiSettingsExport {
  apiEndpoint: string
  model: string
  maxTokens: number
  prompt: string
  enableAutoSummary: boolean
  language: string
  maxConcurrency: number
  customInputPrice?: number | null
  customOutputPrice?: number | null
}

/**
 * AI 设置导出 Zod Schema (不包含 apiKey)
 */
export const AiSettingsExportSchema = z.object({
  apiEndpoint: z.string().default('https://api.openai.com/v1'),
  model: z.string().default('gpt-4o-mini'),
  maxTokens: z.number().int().min(50).max(2000).default(300),
  prompt: z.string().default(''),
  enableAutoSummary: z.boolean().default(false),
  language: z.string().default('zh-CN'),
  maxConcurrency: z.number().int().min(1).max(10).default(3),
  customInputPrice: z.number().min(0).nullable().optional(),
  customOutputPrice: z.number().min(0).nullable().optional(),
})

/**
 * 应用设置导出数据结构
 */
export type AppSettingsExport = AppSettings

/**
 * 应用设置导出 Zod Schema
 */
export const AppSettingsExportSchema = z.object({
  pollInterval: z.enum(['5m', '15m', '30m', '1h', '2h', '6h', '12h', '24h']).default('30m'),
  notificationType: z.enum(['system', 'none']).default('system'),
  enableNotifications: z.boolean().default(true),
  maxNotificationsPerBatch: z.number().int().min(0).max(100).default(5),
  enableBackgroundRefresh: z.boolean().default(true),
  closeToTray: z.boolean().default(true),
  enableAutoUpdateCheck: z.boolean().default(true),
  autoUpdateCheckInterval: z.enum(['1h', '4h', '8h', '12h', '24h']).default('4h'),
})

/**
 * 完整的导出配置结构
 */
export interface ExportedConfig {
  /** 配置版本号 */
  version: string
  /** 导出时间 (ISO 字符串) */
  exportedAt: string
  /** Feed 列表 */
  feeds: FeedExport[]
  /** AI 设置 (可选) */
  aiSettings?: AiSettingsExport
  /** 应用设置 (可选) */
  appSettings?: AppSettingsExport
}

/**
 * 完整导出配置 Zod Schema
 */
export const ExportedConfigSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  exportedAt: z.string().min(1, 'Export timestamp is required'),
  feeds: z.array(FeedExportSchema).default([]),
  aiSettings: AiSettingsExportSchema.optional(),
  appSettings: AppSettingsExportSchema.optional(),
})

/**
 * 从 Feed 对象创建 FeedExport
 */
function feedToExport(feed: Feed): FeedExport {
  return {
    url: feed.url,
    title: feed.title,
    description: feed.description,
    icon_url: feed.icon_url,
    use_full_content: feed.use_full_content,
    use_ai_summary: feed.use_ai_summary,
    use_ai_translation: feed.use_ai_translation,
  }
}

/**
 * 从 AiSettings 创建 AiSettingsExport (移除 apiKey)
 */
function aiSettingsToExport(settings: AiSettings): AiSettingsExport {
  return {
    apiEndpoint: settings.apiEndpoint,
    model: settings.model,
    maxTokens: settings.maxTokens,
    prompt: settings.prompt,
    enableAutoSummary: settings.enableAutoSummary,
    language: settings.language,
    maxConcurrency: settings.maxConcurrency,
    customInputPrice: settings.customInputPrice,
    customOutputPrice: settings.customOutputPrice,
  }
}

/**
 * 创建导出配置对象
 *
 * @param feeds - Feed 列表
 * @param aiSettings - AI 设置 (apiKey 会被移除)
 * @param appSettings - 应用设置
 * @returns 完整的导出配置对象
 */
export function createExportConfig(
  feeds: Feed[],
  aiSettings: AiSettings,
  appSettings: AppSettings
): ExportedConfig {
  return {
    version: CURRENT_CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    feeds: feeds.map(feedToExport),
    aiSettings: aiSettingsToExport(aiSettings),
    appSettings: appSettings,
  }
}

/**
 * 验证导入的配置数据
 *
 * @param input - 要验证的数据 (可以是对象或 JSON 字符串)
 * @returns 验证结果
 */
export function validateImportConfig(
  input: unknown
): { success: true; data: ExportedConfig } | { success: false; error: string } {
  try {
    // 如果是字符串，尝试解析为 JSON
    let data = input
    if (typeof input === 'string') {
      try {
        data = JSON.parse(input)
      } catch {
        return { success: false, error: 'Invalid JSON format' }
      }
    }

    // 检查 null/undefined
    if (data === null || data === undefined) {
      return { success: false, error: 'Config cannot be null or undefined' }
    }

    // 使用 Zod schema 验证
    const result = ExportedConfigSchema.safeParse(data)

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
      return { success: false, error: errorMessage }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    }
  }
}
