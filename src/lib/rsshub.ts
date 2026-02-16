/**
 * RSSHub API 客户端
 *
 * 用于与 RSSHub 服务交互，支持：
 * - 获取 Radar 规则
 * - 从 URL 检测可用的 RSSHub 订阅
 * - 搜索 RSSHub 支持的路由
 */

import { invoke } from '@tauri-apps/api/core'
import type {
  RSSHubRadarRules,
  DetectedRSSHubFeed,
  RSSHubRoute,
  RssUrlValidationResult,
} from '../types/rsshub'
import { DEFAULT_RSSHUB_CONFIG } from '../types/rsshub'

export interface DetectFeedsOptions {
  instanceUrl?: string
}

export interface BuildRssUrlOptions {
  instanceUrl?: string
}

/**
 * RSSHub API 客户端
 */
export class RSSHubApi {
  /**
   * 获取 RSSHub Radar 规则
   * Radar 规则用于从网站 URL 检测可用的 RSSHub 订阅
   */
  static async getRadarRules(): Promise<RSSHubRadarRules> {
    return await invoke<RSSHubRadarRules>('get_rsshub_radar_rules')
  }

  /**
   * 从网站 URL 检测可用的 RSSHub 订阅
   * @param url 网站 URL
   * @param options 选项，包括自定义实例 URL
   */
  static async detectFeeds(
    url: string,
    options?: DetectFeedsOptions
  ): Promise<DetectedRSSHubFeed[]> {
    return await invoke<DetectedRSSHubFeed[]>('detect_rsshub_feeds', {
      url,
      instanceUrl: options?.instanceUrl,
    })
  }

  /**
   * 搜索 RSSHub 支持的路由
   * @param query 搜索关键词，支持平台名称或中文
   */
  static async searchRoutes(query: string): Promise<RSSHubRoute[]> {
    return await invoke<RSSHubRoute[]>('search_rsshub_routes', {
      query,
    })
  }

  /**
   * 测试 RSSHub 实例连接
   * @param instanceUrl RSSHub 实例 URL
   */
  static async testConnection(instanceUrl: string): Promise<boolean> {
    return await invoke<boolean>('test_rsshub_connection', {
      instanceUrl,
    })
  }

  /**
   * 构建 RSS 订阅 URL
   * @param path RSSHub 路由路径
   * @param options 选项，包括自定义实例 URL
   */
  static buildRssUrl(
    path: string,
    options?: BuildRssUrlOptions
  ): string {
    const instanceUrl = options?.instanceUrl || DEFAULT_RSSHUB_CONFIG.instanceUrl
    // 移除实例 URL 尾部斜杠
    const baseUrl = instanceUrl.replace(/\/$/, '')
    // 确保路径以斜杠开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return `${baseUrl}${normalizedPath}`
  }

  /**
   * 从路由路径提取参数名称
   * @param path RSSHub 路由路径，如 /bilibili/user/video/:uid
   * @returns 参数名称数组，如 ['uid']
   */
  static extractRouteParams(path: string): string[] {
    const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
    const params: string[] = []
    let match: RegExpExecArray | null

    while ((match = paramRegex.exec(path)) !== null) {
      params.push(match[1])
    }

    return params
  }

  /**
   * 检查路由是否有参数
   * @param path RSSHub 路由路径
   * @returns 是否有参数
   */
  static hasRouteParams(path: string): boolean {
    return /:[a-zA-Z_][a-zA-Z0-9_]*/.test(path)
  }

  /**
   * 填充路由参数
   * @param path RSSHub 路由路径
   * @param params 参数键值对
   * @returns 填充后的路径
   */
  static fillRouteParams(path: string, params: Record<string, string>): string {
    let result = path

    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`:${key}`, value)
    }

    return result
  }

  /**
   * 验证 RSS URL 是否有效
   * @param url RSS 订阅 URL
   * @returns 验证结果
   */
  static async validateRssUrl(url: string): Promise<RssUrlValidationResult> {
    return await invoke<RssUrlValidationResult>('validate_rss_url', { url })
  }
}
