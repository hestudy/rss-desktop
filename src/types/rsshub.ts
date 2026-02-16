/**
 * RSSHub 集成相关类型
 */

/**
 * RSSHub Radar 规则 - 用于从 URL 检测可用的 RSSHub 订阅
 */
export interface RSSHubRadarRule {
  /** 规则标题 */
  title: string
  /** 文档链接 */
  docs?: string
  /** 源 URL 正则模式 */
  source: string
  /** 目标 RSSHub 路由模板 */
  target: string
  /** 需要的参数说明 */
  required?: string[]
}

/**
 * RSSHub Radar 规则集合 - 按 namespace 分组
 */
export type RSSHubRadarRules = Record<string, RSSHubRadarRule[]>

/**
 * 检测到的 RSSHub 订阅
 */
export interface DetectedRSSHubFeed {
  /** 平台/namespace 名称 */
  namespace: string
  /** 规则标题 */
  title: string
  /** 生成的 RSSHub RSS URL */
  rssUrl: string
  /** 文档链接 */
  docs?: string
  /** 源网站 URL */
  sourceUrl: string
  /** 是否需要额外参数 */
  requiresParams: boolean
  /** 需要的参数列表 */
  requiredParams?: string[]
}

/**
 * RSSHub 平台/路由信息
 */
export interface RSSHubRoute {
  /** 路由路径 */
  path: string
  /** 平台/namespace */
  namespace: string
  /** 路由标题 */
  title: string
  /** 描述 */
  description?: string
  /** 文档链接 */
  docs?: string
  /** 需要的参数 */
  required?: string[]
  /** 是否需要认证 */
  requiresAuth?: boolean
}

/**
 * RSSHub 配置
 */
export interface RSSHubConfig {
  /** RSSHub 实例 URL，默认 https://rsshub.app */
  instanceUrl: string
  /** 是否启用 */
  enabled: boolean
}

/**
 * 默认 RSSHub 配置
 */
export const DEFAULT_RSSHUB_CONFIG: RSSHubConfig = {
  instanceUrl: 'https://rsshub.app',
  enabled: true,
}

/**
 * RSSHub 搜索结果
 */
export interface RSSHubSearchResult {
  /** 命名空间 */
  namespace: string
  /** 匹配的路由列表 */
  routes: RSSHubRoute[]
}

/**
 * RSS URL 验证结果
 */
export interface RssUrlValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误类型 */
  errorType?: 'forbidden' | 'not_found' | 'network' | 'invalid_rss' | 'timeout' | 'unknown'
  /** 错误信息 */
  errorMessage?: string
  /** Feed 信息（验证成功时返回） */
  feedInfo?: {
    title: string
    description?: string
  }
}

/**
 * 获取用户友好的错误信息
 */
export function getValidationErrorMessage(result: RssUrlValidationResult): string {
  switch (result.errorType) {
    case 'forbidden':
      return '该路由被限制访问，请尝试配置自定义 RSSHub 实例'
    case 'not_found':
      return '订阅地址不存在，请检查 URL 是否正确'
    case 'network':
      return '网络连接失败，请检查网络设置'
    case 'invalid_rss':
      return '该 URL 不是有效的 RSS 订阅'
    case 'timeout':
      return '请求超时，请稍后重试'
    default:
      return result.errorMessage || '验证失败，请稍后重试'
  }
}
