/**
 * RSSHubDiscoveryDialog 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RSSHubDiscoveryDialog } from './RSSHubDiscoveryDialog'
import * as RSSHubApi from '../../lib/rsshub'

// 模拟 RSSHubApi
vi.mock('../../lib/rsshub', () => ({
  RSSHubApi: {
    detectFeeds: vi.fn(),
    searchRoutes: vi.fn(),
    buildRssUrl: vi.fn((path, options) => {
      const baseUrl = options?.instanceUrl || 'https://rsshub.app'
      return `${baseUrl}${path}`
    }),
    hasRouteParams: vi.fn((path) => path.includes(':')),
    extractRouteParams: vi.fn((path) => {
      const matches = path.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) || []
      return matches.map((m: string) => m.slice(1))
    }),
    fillRouteParams: vi.fn((path, params) => {
      let result = path
      for (const [key, value] of Object.entries(params)) {
        result = result.replace(`:${key}`, value)
      }
      return result
    }),
    validateRssUrl: vi.fn().mockResolvedValue({
      valid: true,
      feedInfo: { title: 'Test Feed' },
    }),
  },
}))

// 模拟 settings
vi.mock('../../lib/settings', () => ({
  getRSSHubSettings: vi.fn().mockResolvedValue({
    instanceUrl: 'https://rsshub.app',
    enabled: true,
  }),
}))

// 模拟 RssContext
const mockAddFeed = vi.fn()
vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    addFeed: mockAddFeed,
  }),
}))

describe('RSSHubDiscoveryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('对话框可见性', () => {
    it('当 isOpen 为 false 时不渲染', () => {
      render(<RSSHubDiscoveryDialog isOpen={false} onClose={() => {}} />)

      expect(screen.queryByText('RSSHub 发现')).toBeNull()
    })

    it('当 isOpen 为 true 时渲染对话框', () => {
      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      expect(screen.getByText('RSSHub 发现')).toBeDefined()
    })

    it('点击关闭按钮调用 onClose', () => {
      const onClose = vi.fn()
      render(<RSSHubDiscoveryDialog isOpen={true} onClose={onClose} />)

      const closeButton = screen.getByLabelText('关闭')
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Tab 切换', () => {
    it('默认显示 URL 检测 Tab', () => {
      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      expect(screen.getByPlaceholderText(/输入网站 URL/)).toBeDefined()
    })

    it('点击平台浏览 Tab 切换到搜索界面', () => {
      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const searchTab = screen.getByRole('tab', { name: /平台搜索/ })
      fireEvent.click(searchTab)

      expect(screen.getByPlaceholderText(/搜索平台/)).toBeDefined()
    })
  })

  describe('URL 检测功能', () => {
    it('输入 URL 后点击检测调用 API', async () => {
      const mockFeeds = [
        {
          namespace: 'bilibili',
          title: 'UP 主视频',
          rssUrl: 'https://rsshub.app/bilibili/user/video/123456',
          sourceUrl: 'https://space.bilibili.com/123456',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://space.bilibili.com/123456' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(RSSHubApi.RSSHubApi.detectFeeds).toHaveBeenCalledWith(
          'https://space.bilibili.com/123456'
        )
      })
    })

    it('检测成功后显示结果列表', async () => {
      const mockFeeds = [
        {
          namespace: 'bilibili',
          title: 'UP 主视频',
          rssUrl: 'https://rsshub.app/bilibili/user/video/123456',
          sourceUrl: 'https://space.bilibili.com/123456',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://space.bilibili.com/123456' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
      })
    })

    it('检测无结果时显示提示', async () => {
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue([])

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://example.com/unknown' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText(/未检测到/)).toBeDefined()
      })
    })

    it('检测失败时显示错误', async () => {
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockRejectedValue(
        new Error('Network error')
      )

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://example.com' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText(/检测失败/)).toBeDefined()
      })
    })
  })

  describe('平台搜索功能', () => {
    it('搜索调用 API', async () => {
      const mockRoutes = [
        {
          path: '/bilibili/user/video/:uid',
          namespace: 'bilibili',
          title: 'UP 主视频',
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.searchRoutes).mockResolvedValue(mockRoutes)

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      // 切换到搜索 Tab
      const searchTab = screen.getByRole('tab', { name: /平台搜索/ })
      fireEvent.click(searchTab)

      const input = screen.getByPlaceholderText(/搜索平台/)
      fireEvent.change(input, { target: { value: 'bilibili' } })

      await waitFor(() => {
        expect(RSSHubApi.RSSHubApi.searchRoutes).toHaveBeenCalledWith('bilibili')
      })
    })

    it('搜索结果正确显示', async () => {
      const mockRoutes = [
        {
          path: '/bilibili/user/video/:uid',
          namespace: 'bilibili',
          title: 'UP 主视频',
        },
        {
          path: '/bilibili/user/dynamic/:uid',
          namespace: 'bilibili',
          title: 'UP 主动态',
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.searchRoutes).mockResolvedValue(mockRoutes)

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      // 切换到搜索 Tab
      const searchTab = screen.getByRole('tab', { name: /平台搜索/ })
      fireEvent.click(searchTab)

      const input = screen.getByPlaceholderText(/搜索平台/)
      fireEvent.change(input, { target: { value: 'bilibili' } })

      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
        expect(screen.getByText('UP 主动态')).toBeDefined()
      })
    })

    it('搜索失败应该显示详细错误信息', async () => {
      vi.mocked(RSSHubApi.RSSHubApi.searchRoutes).mockRejectedValue(
        new Error('Failed to fetch radar rules: Network error')
      )

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      // 切换到搜索 Tab
      const searchTab = screen.getByRole('tab', { name: /平台搜索/ })
      fireEvent.click(searchTab)

      const input = screen.getByPlaceholderText(/搜索平台/)
      fireEvent.change(input, { target: { value: 'test' } })

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeDefined()
      })
    })

    it('搜索失败后点击重试应该重新调用 API', async () => {
      // 第一次失败
      vi.mocked(RSSHubApi.RSSHubApi.searchRoutes)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([
          {
            path: '/bilibili/user/video/:uid',
            namespace: 'bilibili',
            title: 'UP 主视频',
          },
        ])

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      // 切换到搜索 Tab
      const searchTab = screen.getByRole('tab', { name: /平台搜索/ })
      fireEvent.click(searchTab)

      const input = screen.getByPlaceholderText(/搜索平台/)
      fireEvent.change(input, { target: { value: 'bilibili' } })

      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText('重试')).toBeDefined()
      })

      // 点击重试
      const retryButton = screen.getByText('重试')
      fireEvent.click(retryButton)

      // 第二次应该成功
      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
      })
    })
  })

  describe('添加订阅', () => {
    it('点击添加订阅调用 addFeed', async () => {
      const mockFeeds = [
        {
          namespace: 'bilibili',
          title: 'UP 主视频',
          rssUrl: 'https://rsshub.app/bilibili/user/video/123456',
          sourceUrl: 'https://space.bilibili.com/123456',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)
      mockAddFeed.mockResolvedValue({})

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://space.bilibili.com/123456' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
      })

      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockAddFeed).toHaveBeenCalledWith(
          'https://rsshub.app/bilibili/user/video/123456'
        )
      })
    })

    it('添加成功后显示"已添加"状态', async () => {
      const mockFeeds = [
        {
          namespace: 'bilibili',
          title: 'UP 主视频',
          rssUrl: 'https://rsshub.app/bilibili/user/video/123456',
          sourceUrl: 'https://space.bilibili.com/123456',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)
      mockAddFeed.mockResolvedValue({
        id: 'feed-1',
        url: 'https://rsshub.app/bilibili/user/video/123456',
        title: 'UP 主视频',
      })

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://space.bilibili.com/123456' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
      })

      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      // 等待添加完成并验证"已添加"状态显示
      await waitFor(() => {
        expect(screen.getByText('已添加')).toBeDefined()
      })
    })

    it('添加失败后不应该显示"已添加"状态', async () => {
      const mockFeeds = [
        {
          namespace: 'bilibili',
          title: 'UP 主视频',
          rssUrl: 'https://rsshub.app/bilibili/user/video/123456',
          sourceUrl: 'https://space.bilibili.com/123456',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)
      mockAddFeed.mockRejectedValue(new Error('添加失败'))

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://space.bilibili.com/123456' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
      })

      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      // 等待添加尝试完成
      await waitFor(() => {
        expect(mockAddFeed).toHaveBeenCalled()
      })

      // 添加失败后不应显示"已添加"
      expect(screen.queryByText('已添加')).toBeNull()
    })

    it('通过参数对话框添加订阅应该调用 addFeed', async () => {
      // 搜索返回带参数的路由
      const mockRoutes = [
        {
          path: '/bilibili/user/video/:uid',
          namespace: 'bilibili',
          title: 'UP 主视频',
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.searchRoutes).mockResolvedValue(mockRoutes)
      mockAddFeed.mockResolvedValue({
        id: 'feed-1',
        url: 'https://rsshub.app/bilibili/user/video/123456',
        title: 'UP 主视频',
      })

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      // 切换到搜索 Tab
      const searchTab = screen.getByRole('tab', { name: /平台搜索/ })
      fireEvent.click(searchTab)

      const input = screen.getByPlaceholderText(/搜索平台/)
      fireEvent.change(input, { target: { value: 'bilibili' } })

      // 等待搜索结果显示
      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
      })

      // 点击添加按钮（会打开参数对话框）
      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      // 等待参数对话框出现
      await waitFor(() => {
        expect(screen.getByText('填写路由参数')).toBeDefined()
      })

      // 填写参数
      const paramInput = screen.getByLabelText('uid')
      fireEvent.change(paramInput, { target: { value: '123456' } })

      // 点击确认添加
      const confirmButton = screen.getByRole('button', { name: '添加订阅' })
      fireEvent.click(confirmButton)

      // 验证 addFeed 被调用
      await waitFor(() => {
        expect(mockAddFeed).toHaveBeenCalledWith(
          'https://rsshub.app/bilibili/user/video/123456'
        )
      })
    })
  })

  describe('自定义实例 URL', () => {
    it('在搜索 Tab 中使用用户配置的实例 URL', async () => {
      const { getRSSHubSettings } = await import('../../lib/settings')
      vi.mocked(getRSSHubSettings).mockResolvedValue({
        instanceUrl: 'https://custom.rsshub.com',
        enabled: true,
      })

      // 搜索返回不带参数的路由，这样可以直接测试 buildRssUrl
      const mockRoutes = [
        {
          path: '/bilibili/bangumi/media/123',
          namespace: 'bilibili',
          title: '番剧',
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.searchRoutes).mockResolvedValue(mockRoutes)
      mockAddFeed.mockResolvedValue({})

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      // 切换到搜索 Tab
      const searchTab = screen.getByRole('tab', { name: /平台搜索/ })
      fireEvent.click(searchTab)

      const input = screen.getByPlaceholderText(/搜索平台/)
      fireEvent.change(input, { target: { value: 'bilibili' } })

      // 等待搜索结果显示
      await waitFor(() => {
        expect(screen.getByText('番剧')).toBeDefined()
      })

      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(RSSHubApi.RSSHubApi.buildRssUrl).toHaveBeenCalledWith(
          '/bilibili/bangumi/media/123',
          { instanceUrl: 'https://custom.rsshub.com' }
        )
      })
    })
  })

  describe('RSS URL 验证', () => {
    it('验证失败时不应该调用 addFeed', async () => {
      vi.mocked(RSSHubApi.RSSHubApi.validateRssUrl).mockResolvedValue({
        valid: false,
        errorType: 'forbidden',
        errorMessage: '该路由被限制访问 (403)',
      })

      const mockFeeds = [
        {
          namespace: 'github',
          title: 'GitHub Release',
          rssUrl: 'https://rsshub.app/github/release/test/repo',
          sourceUrl: 'https://github.com/test/repo',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://github.com/test/repo' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText('GitHub Release')).toBeDefined()
      })

      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      // 验证 validateRssUrl 被调用
      await waitFor(() => {
        expect(RSSHubApi.RSSHubApi.validateRssUrl).toHaveBeenCalledWith(
          'https://rsshub.app/github/release/test/repo'
        )
      })

      // addFeed 不应该被调用
      expect(mockAddFeed).not.toHaveBeenCalled()
    })

    it('验证失败时应该显示错误信息', async () => {
      vi.mocked(RSSHubApi.RSSHubApi.validateRssUrl).mockResolvedValue({
        valid: false,
        errorType: 'forbidden',
        errorMessage: '该路由被限制访问 (403)',
      })

      const mockFeeds = [
        {
          namespace: 'github',
          title: 'GitHub Release',
          rssUrl: 'https://rsshub.app/github/release/test/repo',
          sourceUrl: 'https://github.com/test/repo',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://github.com/test/repo' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText('GitHub Release')).toBeDefined()
      })

      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      // 等待验证完成并检查错误信息
      await waitFor(() => {
        expect(screen.getByText(/被限制访问/)).toBeDefined()
      })
    })

    it('验证成功后应该调用 addFeed', async () => {
      vi.mocked(RSSHubApi.RSSHubApi.validateRssUrl).mockResolvedValue({
        valid: true,
        feedInfo: { title: 'Test Feed' },
      })

      const mockFeeds = [
        {
          namespace: 'bilibili',
          title: 'UP 主视频',
          rssUrl: 'https://rsshub.app/bilibili/user/video/123456',
          sourceUrl: 'https://space.bilibili.com/123456',
          requiresParams: false,
        },
      ]
      vi.mocked(RSSHubApi.RSSHubApi.detectFeeds).mockResolvedValue(mockFeeds)
      mockAddFeed.mockResolvedValue({})

      render(<RSSHubDiscoveryDialog isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/输入网站 URL/)
      fireEvent.change(input, {
        target: { value: 'https://space.bilibili.com/123456' },
      })

      const detectButton = screen.getByText('检测')
      fireEvent.click(detectButton)

      await waitFor(() => {
        expect(screen.getByText('UP 主视频')).toBeDefined()
      })

      const addButton = screen.getByRole('button', { name: /添加/ })
      fireEvent.click(addButton)

      // 验证先调用 validateRssUrl，再调用 addFeed
      await waitFor(() => {
        expect(RSSHubApi.RSSHubApi.validateRssUrl).toHaveBeenCalledWith(
          'https://rsshub.app/bilibili/user/video/123456'
        )
        expect(mockAddFeed).toHaveBeenCalledWith(
          'https://rsshub.app/bilibili/user/video/123456'
        )
      })
    })
  })
})
