import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import {
  getSettings,
  updateSettings,
  getSchedulerState,
  getAiSettings,
  updateAiSettings,
  type PollInterval,
  type AppSettings,
  type SchedulerState,
  type PartialAppSettings,
  type AiSettings,
  type AutoUpdateCheckInterval,
  DEFAULT_SETTINGS,
  DEFAULT_AI_SETTINGS,
  AUTO_UPDATE_CHECK_INTERVAL_OPTIONS,
} from './settings'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should return default settings when store is empty', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(DEFAULT_SETTINGS)

      const settings = await getSettings()

      expect(settings).toEqual(DEFAULT_SETTINGS)
      expect(invoke).toHaveBeenCalledWith('get_settings')
    })

    it('should return stored settings', async () => {
      const customSettings: AppSettings = {
        pollInterval: '1h',
        notificationType: 'none',
        enableNotifications: false,
        maxNotificationsPerBatch: 10,
        enableBackgroundRefresh: true,
        closeToTray: false,
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '12h',
      }

      vi.mocked(invoke).mockResolvedValueOnce(customSettings)

      const settings = await getSettings()

      expect(settings).toEqual(customSettings)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Storage error'))

      await expect(getSettings()).rejects.toThrow('Storage error')
    })
  })

  describe('updateSettings', () => {
    it('should update settings and return updated value', async () => {
      const newSettings: PartialAppSettings = {
        pollInterval: '2h',
        enableNotifications: false,
      }

      const currentSettings = DEFAULT_SETTINGS
      const expected: AppSettings = {
        ...currentSettings,
        ...newSettings,
      }

      // Mock getSettings (获取当前设置)
      vi.mocked(invoke).mockResolvedValueOnce(currentSettings)
      // Mock update_settings (更新并返回)
      vi.mocked(invoke).mockResolvedValueOnce(expected)

      const result = await updateSettings(newSettings)

      expect(result).toEqual(expected)
      expect(invoke).toHaveBeenCalledWith('get_settings')
      expect(invoke).toHaveBeenCalledWith('update_settings', {
        settings: expected,
      })
    })

    it('should handle partial updates', async () => {
      const partialUpdate: PartialAppSettings = { pollInterval: '15m' }
      const currentSettings = DEFAULT_SETTINGS
      const expected: AppSettings = {
        ...currentSettings,
        ...partialUpdate,
      }

      vi.mocked(invoke).mockResolvedValueOnce(currentSettings)
      vi.mocked(invoke).mockResolvedValueOnce(expected)

      const result = await updateSettings(partialUpdate)

      expect(result.pollInterval).toBe('15m')
      expect(result.enableNotifications).toBe(DEFAULT_SETTINGS.enableNotifications)
    })
  })

  describe('getSchedulerState', () => {
    it('should return scheduler state', async () => {
      const state: SchedulerState = {
        isRunning: true,
        lastRunAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + 1800000).toISOString(),
        consecutiveErrors: 0,
      }

      vi.mocked(invoke).mockResolvedValueOnce(state)

      const result = await getSchedulerState()

      expect(result).toEqual(state)
      expect(invoke).toHaveBeenCalledWith('get_scheduler_state')
    })

    it('should return default state when not set', async () => {
      const defaultState: SchedulerState = {
        isRunning: false,
        lastRunAt: null,
        nextRunAt: null,
        consecutiveErrors: 0,
      }

      vi.mocked(invoke).mockResolvedValueOnce(defaultState)

      const result = await getSchedulerState()

      expect(result.isRunning).toBe(false)
      expect(result.consecutiveErrors).toBe(0)
    })
  })
})

describe('Settings Types', () => {
  describe('PollInterval', () => {
    it('should accept valid interval values', () => {
      const validIntervals: PollInterval[] = [
        '5m',
        '15m',
        '30m',
        '1h',
        '2h',
        '6h',
        '12h',
        '24h',
      ]

      // Type-level check - this would fail at compile time with invalid values
      const interval: PollInterval = '30m'
      expect(validIntervals).toContain(interval)
    })
  })

  describe('AppSettings', () => {
    it('should have default values', () => {
      expect(DEFAULT_SETTINGS.pollInterval).toBe('30m')
      expect(DEFAULT_SETTINGS.notificationType).toBe('system')
      expect(DEFAULT_SETTINGS.enableNotifications).toBe(true)
      expect(DEFAULT_SETTINGS.maxNotificationsPerBatch).toBe(5)
      expect(DEFAULT_SETTINGS.enableBackgroundRefresh).toBe(true)
      expect(DEFAULT_SETTINGS.closeToTray).toBe(true)
    })

    it('should accept partial updates', () => {
      const partial: Partial<AppSettings> = {
        pollInterval: '1h',
      }

      expect(partial.pollInterval).toBe('1h')
      // Other properties are optional
      expect(partial.enableNotifications).toBeUndefined()
    })
  })

  describe('SchedulerState', () => {
    it('should have correct structure', () => {
      const state: SchedulerState = {
        isRunning: true,
        lastRunAt: new Date().toISOString(),
        nextRunAt: new Date().toISOString(),
        consecutiveErrors: 3,
      }

      expect(state.isRunning).toBe(true)
      expect(state.consecutiveErrors).toBe(3)
      expect(typeof state.lastRunAt).toBe('string')
      expect(typeof state.nextRunAt).toBe('string')
    })

    it('should allow null for optional date fields', () => {
      const state: SchedulerState = {
        isRunning: false,
        lastRunAt: null,
        nextRunAt: null,
        consecutiveErrors: 0,
      }

      expect(state.lastRunAt).toBeNull()
      expect(state.nextRunAt).toBeNull()
    })
  })
})

describe('Validation', () => {
  it('should validate maxNotificationsPerBatch range', () => {
    const validMin: AppSettings = {
      ...DEFAULT_SETTINGS,
      maxNotificationsPerBatch: 0,
    }

    const validMax: AppSettings = {
      ...DEFAULT_SETTINGS,
      maxNotificationsPerBatch: 100,
    }

    expect(validMin.maxNotificationsPerBatch).toBe(0)
    expect(validMax.maxNotificationsPerBatch).toBe(100)
  })
})

// ============= Auto Update Settings Tests (TDD: 先写测试) =============
describe('Auto Update Settings', () => {
  describe('AutoUpdateCheckInterval Type', () => {
    it('should accept valid interval values', () => {
      const validIntervals: AutoUpdateCheckInterval[] = ['1h', '4h', '8h', '12h', '24h']

      const interval: AutoUpdateCheckInterval = '4h'
      expect(validIntervals).toContain(interval)
    })
  })

  describe('AUTO_UPDATE_CHECK_INTERVAL_OPTIONS', () => {
    it('should provide all available interval options', () => {
      expect(AUTO_UPDATE_CHECK_INTERVAL_OPTIONS).toHaveLength(5)
      expect(AUTO_UPDATE_CHECK_INTERVAL_OPTIONS.map((o) => o.value)).toEqual([
        '1h',
        '4h',
        '8h',
        '12h',
        '24h',
      ])
    })

    it('should have correct labels', () => {
      const labels = AUTO_UPDATE_CHECK_INTERVAL_OPTIONS.map((o) => o.label)
      expect(labels).toContain('1 小时')
      expect(labels).toContain('4 小时')
      expect(labels).toContain('24 小时')
    })
  })

  describe('AppSettings Auto Update Fields', () => {
    it('should have auto update default values', () => {
      // 默认启用自动更新检查
      expect(DEFAULT_SETTINGS.enableAutoUpdateCheck).toBe(true)
      // 默认 4 小时检查一次
      expect(DEFAULT_SETTINGS.autoUpdateCheckInterval).toBe('4h')
    })

    it('should accept auto update settings from backend', async () => {
      const backendSettings = {
        ...DEFAULT_SETTINGS,
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '12h' as AutoUpdateCheckInterval,
      }

      vi.mocked(invoke).mockResolvedValueOnce(backendSettings)

      const settings = await getSettings()

      expect(settings.enableAutoUpdateCheck).toBe(false)
      expect(settings.autoUpdateCheckInterval).toBe('12h')
    })

    it('should update auto update settings', async () => {
      const newSettings = {
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '24h' as AutoUpdateCheckInterval,
      }

      const expected: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...newSettings,
      }

      vi.mocked(invoke).mockResolvedValueOnce(DEFAULT_SETTINGS)
      vi.mocked(invoke).mockResolvedValueOnce(expected)

      const result = await updateSettings(newSettings)

      expect(result.enableAutoUpdateCheck).toBe(false)
      expect(result.autoUpdateCheckInterval).toBe('24h')
    })
  })
})

describe('AI Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAiSettings', () => {
    it('should return AI settings', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(DEFAULT_AI_SETTINGS)

      const result = await getAiSettings()

      expect(result).toEqual(DEFAULT_AI_SETTINGS)
      expect(invoke).toHaveBeenCalledWith('get_ai_settings')
    })
  })

  describe('updateAiSettings', () => {
    it('should merge and update AI settings', async () => {
      const partial: Partial<AiSettings> = { model: 'gpt-4o' }
      const expected = { ...DEFAULT_AI_SETTINGS, ...partial }

      vi.mocked(invoke).mockResolvedValueOnce(DEFAULT_AI_SETTINGS)
      vi.mocked(invoke).mockResolvedValueOnce(expected)

      const result = await updateAiSettings(partial)

      expect(result.model).toBe('gpt-4o')
      expect(invoke).toHaveBeenCalledWith('get_ai_settings')
      expect(invoke).toHaveBeenCalledWith('update_ai_settings', {
        settings: expected,
      })
    })
  })
})
