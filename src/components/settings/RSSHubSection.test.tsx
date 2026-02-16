/**
 * RSSHubSection 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RSSHubSection } from './RSSHubSection'
import * as settingsApi from '../../lib/settings'

// 模拟 API
vi.mock('../../lib/settings', () => ({
  getRSSHubSettings: vi.fn(),
  updateRSSHubSettings: vi.fn(),
  DEFAULT_RSSHUB_SETTINGS: {
    instanceUrl: 'https://rsshub.app',
    enabled: true,
  },
}))

// 模拟 RSSHubApi
vi.mock('../../lib/rsshub', () => ({
  RSSHubApi: {
    testConnection: vi.fn(),
  },
}))

import * as RSSHubApi from '../../lib/rsshub'

const mockGetRSSHubSettings = vi.mocked(settingsApi.getRSSHubSettings)
const mockUpdateRSSHubSettings = vi.mocked(settingsApi.updateRSSHubSettings)
const mockTestConnection = vi.mocked(RSSHubApi.RSSHubApi.testConnection)

describe('RSSHubSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRSSHubSettings.mockResolvedValue({
      instanceUrl: 'https://rsshub.app',
      enabled: true,
    })
    mockUpdateRSSHubSettings.mockResolvedValue({
      instanceUrl: 'https://rsshub.app',
      enabled: true,
    })
    mockTestConnection.mockResolvedValue(true)
  })

  describe('初始加载', () => {
    it('应该显示加载状态', () => {
      mockGetRSSHubSettings.mockImplementation(() => new Promise(() => {}))

      render(<RSSHubSection />)

      expect(screen.getByText('加载中...')).toBeDefined()
    })

    it('应该加载并显示设置', async () => {
      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByLabelText(/实例地址/)).toBeDefined()
      })
    })
  })

  describe('实例 URL 输入', () => {
    it('应该显示当前实例 URL', async () => {
      render(<RSSHubSection />)

      await waitFor(() => {
        const input = screen.getByLabelText(/实例地址/) as HTMLInputElement
        expect(input.value).toBe('https://rsshub.app')
      })
    })

    it('应该更新实例 URL', async () => {
      mockUpdateRSSHubSettings.mockResolvedValue({
        instanceUrl: 'https://my-rsshub.com',
        enabled: true,
      })

      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByLabelText(/实例地址/)).toBeDefined()
      })

      const input = screen.getByLabelText(/实例地址/)
      fireEvent.change(input, { target: { value: 'https://my-rsshub.com' } })

      // 等待防抖和更新
      await waitFor(() => {
        expect(mockUpdateRSSHubSettings).toHaveBeenCalledWith(
          expect.objectContaining({ instanceUrl: 'https://my-rsshub.com' })
        )
      }, { timeout: 1000 })
    })
  })

  describe('启用/禁用开关', () => {
    it('应该显示启用开关', async () => {
      render(<RSSHubSection />)

      await waitFor(() => {
        // 使用 role="switch" 定位开关
        expect(screen.getByRole('switch', { name: /启用 RSSHub/ })).toBeDefined()
      })
    })

    it('应该切换启用状态', async () => {
      mockUpdateRSSHubSettings.mockResolvedValue({
        instanceUrl: 'https://rsshub.app',
        enabled: false,
      })

      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /启用 RSSHub/ })).toBeDefined()
      })

      const toggle = screen.getByRole('switch', { name: /启用 RSSHub/ })
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockUpdateRSSHubSettings).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: false })
        )
      })
    })
  })

  describe('测试连接', () => {
    it('应该显示测试连接按钮', async () => {
      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByText('测试连接')).toBeDefined()
      })
    })

    it('点击测试连接应该调用 API', async () => {
      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByText('测试连接')).toBeDefined()
      })

      const testButton = screen.getByText('测试连接')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(mockTestConnection).toHaveBeenCalledWith('https://rsshub.app')
      })
    })

    it('连接成功应该显示成功状态', async () => {
      mockTestConnection.mockResolvedValue(true)

      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByText('测试连接')).toBeDefined()
      })

      const testButton = screen.getByText('测试连接')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(screen.getByText(/连接成功/)).toBeDefined()
      })
    })

    it('连接失败应该显示失败状态', async () => {
      mockTestConnection.mockResolvedValue(false)

      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByText('测试连接')).toBeDefined()
      })

      const testButton = screen.getByText('测试连接')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(screen.getByText(/连接失败/)).toBeDefined()
      })
    })

    it('测试连接异常应该显示错误', async () => {
      mockTestConnection.mockRejectedValue(new Error('Network error'))

      render(<RSSHubSection />)

      await waitFor(() => {
        expect(screen.getByText('测试连接')).toBeDefined()
      })

      const testButton = screen.getByText('测试连接')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(screen.getByText(/连接失败/)).toBeDefined()
      })
    })
  })
})
