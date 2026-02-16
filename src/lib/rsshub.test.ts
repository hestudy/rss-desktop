/**
 * RSSHub API 测试
 *
 * 使用 TDD 方法：先写测试，再实现功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RSSHubApi } from './rsshub'
import type {
  RSSHubRadarRules,
  DetectedRSSHubFeed,
  RSSHubRoute,
} from '../types/rsshub'

// 模拟 Tauri invoke 函数
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

const mockInvoke = invoke as ReturnType<typeof vi.fn>

describe('RSSHubApi - Radar 规则获取', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRadarRules', () => {
    it('应该成功获取 Radar 规则', async () => {
      const mockRules: RSSHubRadarRules = {
        'bilibili.user': [
          {
            title: 'UP 主视频',
            source: '/space.bilibili.com/(\\d+)',
            target: '/bilibili/user/video/:uid',
          },
        ],
      }

      mockInvoke.mockResolvedValue(mockRules)

      const result = await RSSHubApi.getRadarRules()

      expect(mockInvoke).toHaveBeenCalledWith('get_rsshub_radar_rules')
      expect(result).toEqual(mockRules)
    })

    it('应该处理获取规则失败的情况', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'))

      await expect(RSSHubApi.getRadarRules()).rejects.toThrow('Network error')
    })

    it('应该返回空对象当没有规则时', async () => {
      mockInvoke.mockResolvedValue({})

      const result = await RSSHubApi.getRadarRules()

      expect(result).toEqual({})
    })
  })
})

describe('RSSHubApi - URL 检测', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectFeeds', () => {
    it('应该从 URL 检测到 RSSHub 订阅', async () => {
      const mockFeeds: DetectedRSSHubFeed[] = [
        {
          namespace: 'bilibili',
          title: 'UP 主视频',
          rssUrl: 'https://rsshub.app/bilibili/user/video/123456',
          sourceUrl: 'https://space.bilibili.com/123456',
          requiresParams: false,
        },
      ]

      mockInvoke.mockResolvedValue(mockFeeds)

      const result = await RSSHubApi.detectFeeds(
        'https://space.bilibili.com/123456'
      )

      expect(mockInvoke).toHaveBeenCalledWith('detect_rsshub_feeds', {
        url: 'https://space.bilibili.com/123456',
      })
      expect(result).toEqual(mockFeeds)
      expect(result).toHaveLength(1)
    })

    it('应该返回空数组当 URL 无法匹配任何规则', async () => {
      mockInvoke.mockResolvedValue([])

      const result = await RSSHubApi.detectFeeds('https://example.com/unknown')

      expect(result).toEqual([])
    })

    it('应该标记需要参数的订阅', async () => {
      const mockFeeds: DetectedRSSHubFeed[] = [
        {
          namespace: 'twitter',
          title: '用户时间线',
          rssUrl: 'https://rsshub.app/twitter/user/username',
          sourceUrl: 'https://twitter.com/username',
          requiresParams: true,
          requiredParams: ['id'],
        },
      ]

      mockInvoke.mockResolvedValue(mockFeeds)

      const result = await RSSHubApi.detectFeeds('https://twitter.com/username')

      expect(result[0].requiresParams).toBe(true)
      expect(result[0].requiredParams).toContain('id')
    })

    it('应该处理无效 URL', async () => {
      mockInvoke.mockRejectedValue(new Error('Invalid URL'))

      await expect(RSSHubApi.detectFeeds('not-a-url')).rejects.toThrow(
        'Invalid URL'
      )
    })

    it('应该支持自定义实例 URL', async () => {
      mockInvoke.mockResolvedValue([])

      await RSSHubApi.detectFeeds('https://space.bilibili.com/123456', {
        instanceUrl: 'https://my-rsshub.com',
      })

      expect(mockInvoke).toHaveBeenCalledWith('detect_rsshub_feeds', {
        url: 'https://space.bilibili.com/123456',
        instanceUrl: 'https://my-rsshub.com',
      })
    })
  })
})

describe('RSSHubApi - 平台搜索', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchRoutes', () => {
    it('应该搜索到匹配的路由', async () => {
      const mockRoutes: RSSHubRoute[] = [
        {
          path: '/bilibili/user/video/:uid',
          namespace: 'bilibili',
          title: 'UP 主视频',
          docs: 'https://docs.rsshub.app/bilibili',
        },
        {
          path: '/bilibili/user/dynamic/:uid',
          namespace: 'bilibili',
          title: 'UP 主动态',
        },
      ]

      mockInvoke.mockResolvedValue(mockRoutes)

      const result = await RSSHubApi.searchRoutes('bilibili')

      expect(mockInvoke).toHaveBeenCalledWith('search_rsshub_routes', {
        query: 'bilibili',
      })
      expect(result).toEqual(mockRoutes)
      expect(result).toHaveLength(2)
    })

    it('应该支持中文搜索', async () => {
      const mockRoutes: RSSHubRoute[] = [
        {
          path: '/bilibili/bangumi/media/:mediaId',
          namespace: 'bilibili',
          title: '番剧',
        },
      ]

      mockInvoke.mockResolvedValue(mockRoutes)

      const result = await RSSHubApi.searchRoutes('番剧')

      expect(mockInvoke).toHaveBeenCalledWith('search_rsshub_routes', {
        query: '番剧',
      })
      expect(result).toHaveLength(1)
    })

    it('应该返回空数组当没有匹配结果', async () => {
      mockInvoke.mockResolvedValue([])

      const result = await RSSHubApi.searchRoutes('nonexistent')

      expect(result).toEqual([])
    })

    it('应该处理空查询', async () => {
      mockInvoke.mockResolvedValue([])

      await RSSHubApi.searchRoutes('')

      expect(mockInvoke).toHaveBeenCalledWith('search_rsshub_routes', {
        query: '',
      })
    })
  })
})

describe('RSSHubApi - 配置测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('testConnection', () => {
    it('应该成功测试连接', async () => {
      mockInvoke.mockResolvedValue(true)

      const result = await RSSHubApi.testConnection('https://rsshub.app')

      expect(mockInvoke).toHaveBeenCalledWith('test_rsshub_connection', {
        instanceUrl: 'https://rsshub.app',
      })
      expect(result).toBe(true)
    })

    it('应该返回 false 当连接失败', async () => {
      mockInvoke.mockResolvedValue(false)

      const result = await RSSHubApi.testConnection('https://invalid-url.com')

      expect(result).toBe(false)
    })

    it('应该处理异常情况', async () => {
      mockInvoke.mockRejectedValue(new Error('Connection timeout'))

      await expect(
        RSSHubApi.testConnection('https://timeout.com')
      ).rejects.toThrow('Connection timeout')
    })
  })
})

describe('RSSHubApi - 实例 URL 构建', () => {
  it('应该正确构建 RSS URL', () => {
    const url = RSSHubApi.buildRssUrl('/bilibili/user/video/123456')
    expect(url).toBe('https://rsshub.app/bilibili/user/video/123456')
  })

  it('应该使用自定义实例 URL 构建 RSS URL', () => {
    const url = RSSHubApi.buildRssUrl('/bilibili/user/video/123456', {
      instanceUrl: 'https://my-rsshub.com',
    })
    expect(url).toBe('https://my-rsshub.com/bilibili/user/video/123456')
  })

  it('应该处理路径前缀斜杠', () => {
    const url = RSSHubApi.buildRssUrl('bilibili/user/video/123456')
    expect(url).toBe('https://rsshub.app/bilibili/user/video/123456')
  })

  it('应该处理实例 URL 尾部斜杠', () => {
    const url = RSSHubApi.buildRssUrl('/bilibili/user/video/123456', {
      instanceUrl: 'https://my-rsshub.com/',
    })
    expect(url).toBe('https://my-rsshub.com/bilibili/user/video/123456')
  })
})

describe('RSSHubApi - 路由参数检测', () => {
  describe('extractRouteParams', () => {
    it('应该从路由路径提取参数', () => {
      const params = RSSHubApi.extractRouteParams('/bilibili/user/video/:uid')
      expect(params).toEqual(['uid'])
    })

    it('应该提取多个参数', () => {
      const params = RSSHubApi.extractRouteParams('/github/issue/:owner/:repo')
      expect(params).toEqual(['owner', 'repo'])
    })

    it('应该返回空数组当没有参数', () => {
      const params = RSSHubApi.extractRouteParams('/bilibili/popular')
      expect(params).toEqual([])
    })

    it('应该处理复杂的路由路径', () => {
      const params = RSSHubApi.extractRouteParams('/twitter/list/:id/:name')
      expect(params).toEqual(['id', 'name'])
    })
  })

  describe('hasRouteParams', () => {
    it('应该返回 true 当路由有参数', () => {
      expect(RSSHubApi.hasRouteParams('/bilibili/user/video/:uid')).toBe(true)
    })

    it('应该返回 false 当路由没有参数', () => {
      expect(RSSHubApi.hasRouteParams('/bilibili/popular')).toBe(false)
    })
  })

  describe('fillRouteParams', () => {
    it('应该填充单个参数', () => {
      const result = RSSHubApi.fillRouteParams('/bilibili/user/video/:uid', {
        uid: '123456',
      })
      expect(result).toBe('/bilibili/user/video/123456')
    })

    it('应该填充多个参数', () => {
      const result = RSSHubApi.fillRouteParams('/github/issue/:owner/:repo', {
        owner: 'octocat',
        repo: 'hello-world',
      })
      expect(result).toBe('/github/issue/octocat/hello-world')
    })

    it('应该保留未填充的参数', () => {
      const result = RSSHubApi.fillRouteParams('/github/issue/:owner/:repo', {
        owner: 'octocat',
      })
      expect(result).toBe('/github/issue/octocat/:repo')
    })

    it('应该处理空参数对象', () => {
      const result = RSSHubApi.fillRouteParams('/bilibili/user/video/:uid', {})
      expect(result).toBe('/bilibili/user/video/:uid')
    })

    it('应该处理没有参数的路径', () => {
      const result = RSSHubApi.fillRouteParams('/bilibili/popular', { uid: '123' })
      expect(result).toBe('/bilibili/popular')
    })
  })
})

describe('RSSHubApi - RSS URL 验证', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateRssUrl', () => {
    it('应该成功验证有效的 RSS URL', async () => {
      mockInvoke.mockResolvedValue({
        valid: true,
        feedInfo: {
          title: 'Test Feed',
          description: 'A test feed',
        },
      })

      const result = await RSSHubApi.validateRssUrl('https://rsshub.app/bilibili/user/video/123')

      expect(mockInvoke).toHaveBeenCalledWith('validate_rss_url', {
        url: 'https://rsshub.app/bilibili/user/video/123',
      })
      expect(result.valid).toBe(true)
      expect(result.feedInfo?.title).toBe('Test Feed')
    })

    it('应该返回 forbidden 错误当收到 403', async () => {
      mockInvoke.mockResolvedValue({
        valid: false,
        errorType: 'forbidden',
        errorMessage: 'status code 403',
      })

      const result = await RSSHubApi.validateRssUrl('https://rsshub.app/github/release/test/repo')

      expect(result.valid).toBe(false)
      expect(result.errorType).toBe('forbidden')
    })

    it('应该返回 not_found 错误当收到 404', async () => {
      mockInvoke.mockResolvedValue({
        valid: false,
        errorType: 'not_found',
        errorMessage: 'Feed not found',
      })

      const result = await RSSHubApi.validateRssUrl('https://rsshub.app/invalid/path')

      expect(result.valid).toBe(false)
      expect(result.errorType).toBe('not_found')
    })

    it('应该返回 network 错误当网络失败', async () => {
      mockInvoke.mockResolvedValue({
        valid: false,
        errorType: 'network',
        errorMessage: 'Network error',
      })

      const result = await RSSHubApi.validateRssUrl('https://invalid-host.com/feed')

      expect(result.valid).toBe(false)
      expect(result.errorType).toBe('network')
    })

    it('应该返回 invalid_rss 错误当内容不是 RSS', async () => {
      mockInvoke.mockResolvedValue({
        valid: false,
        errorType: 'invalid_rss',
        errorMessage: 'Invalid RSS format',
      })

      const result = await RSSHubApi.validateRssUrl('https://example.com/not-rss')

      expect(result.valid).toBe(false)
      expect(result.errorType).toBe('invalid_rss')
    })

    it('应该返回 timeout 错误当请求超时', async () => {
      mockInvoke.mockResolvedValue({
        valid: false,
        errorType: 'timeout',
        errorMessage: 'Request timeout',
      })

      const result = await RSSHubApi.validateRssUrl('https://slow-server.com/feed')

      expect(result.valid).toBe(false)
      expect(result.errorType).toBe('timeout')
    })
  })
})
