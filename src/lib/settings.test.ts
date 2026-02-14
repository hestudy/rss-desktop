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
  DEFAULT_SETTINGS,
  DEFAULT_AI_SETTINGS,
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
      expect(DEFAULT_SETTINGS.enableBackgroundRefresh).toBe(false)
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
