/**
 * RSSHub 设置 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRSSHubSettings, updateRSSHubSettings, DEFAULT_RSSHUB_SETTINGS, RSSHubSettingsSchema } from './settings'

// 模拟 Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

const mockInvoke = invoke as ReturnType<typeof vi.fn>

describe('RSSHubSettings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRSSHubSettings', () => {
    it('应该返回默认设置当没有保存的设置', async () => {
      mockInvoke.mockResolvedValue({
        instanceUrl: 'https://rsshub.app',
        enabled: true,
      })

      const result = await getRSSHubSettings()

      expect(mockInvoke).toHaveBeenCalledWith('get_rsshub_settings')
      expect(result).toEqual(DEFAULT_RSSHUB_SETTINGS)
    })

    it('应该返回保存的自定义设置', async () => {
      const customSettings = {
        instanceUrl: 'https://my-rsshub.com',
        enabled: false,
      }
      mockInvoke.mockResolvedValue(customSettings)

      const result = await getRSSHubSettings()

      expect(result.instanceUrl).toBe('https://my-rsshub.com')
      expect(result.enabled).toBe(false)
    })

    it('应该处理 API 错误', async () => {
      mockInvoke.mockRejectedValue(new Error('Database error'))

      await expect(getRSSHubSettings()).rejects.toThrow()
    })
  })

  describe('updateRSSHubSettings', () => {
    it('应该更新设置并返回结果', async () => {
      const newSettings = {
        instanceUrl: 'https://custom.rsshub.com',
        enabled: true,
      }
      mockInvoke.mockResolvedValue(newSettings)

      const result = await updateRSSHubSettings({ instanceUrl: 'https://custom.rsshub.com' })

      expect(mockInvoke).toHaveBeenCalledWith('update_rsshub_settings', {
        settings: newSettings,
      })
      expect(result.instanceUrl).toBe('https://custom.rsshub.com')
    })

    it('应该合并部分更新', async () => {
      // 先返回当前设置
      mockInvoke.mockResolvedValueOnce({
        instanceUrl: 'https://rsshub.app',
        enabled: true,
      })
      // 然后返回更新后的设置
      mockInvoke.mockResolvedValueOnce({
        instanceUrl: 'https://rsshub.app',
        enabled: false,
      })

      const result = await updateRSSHubSettings({ enabled: false })

      expect(result.enabled).toBe(false)
      expect(result.instanceUrl).toBe('https://rsshub.app')
    })

    it('应该验证无效 URL', async () => {
      mockInvoke.mockResolvedValue({
        instanceUrl: 'https://rsshub.app',
        enabled: true,
      })

      // 传入无效 URL 应该在 schema 验证时失败
      await expect(updateRSSHubSettings({ instanceUrl: 'not-a-url' })).rejects.toThrow()
    })
  })

  describe('RSSHubSettingsSchema', () => {
    it('应该验证有效的设置', () => {
      const result = RSSHubSettingsSchema.parse({
        instanceUrl: 'https://rsshub.app',
        enabled: true,
      })

      expect(result.instanceUrl).toBe('https://rsshub.app')
      expect(result.enabled).toBe(true)
    })

    it('应该使用默认值填充缺失字段', () => {
      const result = RSSHubSettingsSchema.parse({})

      expect(result.instanceUrl).toBe('https://rsshub.app')
      expect(result.enabled).toBe(true)
    })

    it('应该拒绝无效 URL', () => {
      const result = RSSHubSettingsSchema.safeParse({
        instanceUrl: 'invalid-url',
        enabled: true,
      })

      expect(result.success).toBe(false)
    })

    it('应该拒绝非布尔 enabled', () => {
      const result = RSSHubSettingsSchema.safeParse({
        instanceUrl: 'https://rsshub.app',
        enabled: 'yes',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('DEFAULT_RSSHUB_SETTINGS', () => {
    it('应该有正确的默认值', () => {
      expect(DEFAULT_RSSHUB_SETTINGS.instanceUrl).toBe('https://rsshub.app')
      expect(DEFAULT_RSSHUB_SETTINGS.enabled).toBe(true)
    })
  })
})
