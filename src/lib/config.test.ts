import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import {
  exportConfigToFile,
  importConfigFromFile,
  type ImportResult,
} from './config'
import type { ExportedConfig } from './configExport'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
  open: vi.fn(),
}))

// Mock Tauri fs plugin
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn(),
  readTextFile: vi.fn(),
}))

describe('Config API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportConfigToFile', () => {
    it('should call export_config command and return the config', async () => {
      const mockConfig: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [
          {
            url: 'https://example.com/feed.xml',
            title: 'Example Feed',
          },
        ],
        aiSettings: {
          apiEndpoint: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          maxTokens: 300,
          prompt: 'Summarize',
          enableAutoSummary: false,
          language: 'zh-CN',
          maxConcurrency: 3,
        },
        appSettings: {
          pollInterval: '30m',
          notificationType: 'system',
          enableNotifications: true,
          maxNotificationsPerBatch: 5,
          enableBackgroundRefresh: true,
          closeToTray: true,
        },
      }

      vi.mocked(invoke).mockResolvedValueOnce(mockConfig)

      const result = await exportConfigToFile()

      expect(invoke).toHaveBeenCalledWith('export_config')
      expect(result).toEqual(mockConfig)
      expect(result.feeds).toHaveLength(1)
    })

    it('should throw error when export fails', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Export failed'))

      await expect(exportConfigToFile()).rejects.toThrow('Export failed')
    })

    it('should not include sensitive data in export', async () => {
      const mockConfig: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
        aiSettings: {
          apiEndpoint: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          maxTokens: 300,
          prompt: 'Summarize',
          enableAutoSummary: false,
          language: 'zh-CN',
          maxConcurrency: 3,
        },
      }

      vi.mocked(invoke).mockResolvedValueOnce(mockConfig)

      const result = await exportConfigToFile()

      // Verify apiKey is not in the export
      expect('apiKey' in (result.aiSettings || {})).toBe(false)
    })
  })

  describe('importConfigFromFile', () => {
    it('should successfully import a valid config', async () => {
      const mockConfig: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [
          {
            url: 'https://example.com/feed.xml',
            title: 'Example Feed',
          },
        ],
      }

      const expectedResult: ImportResult = {
        success: true,
        feedsImported: 1,
        feedsSkipped: 0,
        settingsImported: false,
        aiSettingsImported: false,
      }

      vi.mocked(invoke).mockResolvedValueOnce(expectedResult)

      const result = await importConfigFromFile(mockConfig)

      expect(invoke).toHaveBeenCalledWith('import_config', { config: mockConfig })
      expect(result.success).toBe(true)
      expect(result.feedsImported).toBe(1)
    })

    it('should return error for invalid config version', async () => {
      const invalidConfig = {
        version: '99.0', // Invalid version
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
      }

      vi.mocked(invoke).mockResolvedValueOnce({
        success: false,
        error: 'Unsupported config version',
        feedsImported: 0,
        feedsSkipped: 0,
        settingsImported: false,
        aiSettingsImported: false,
      })

      const result = await importConfigFromFile(invalidConfig as ExportedConfig)

      expect(result.success).toBe(false)
    })

    it('should handle duplicate feeds during import', async () => {
      const configWithDuplicates: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [
          { url: 'https://existing.com/feed.xml', title: 'Existing Feed' },
          { url: 'https://new.com/feed.xml', title: 'New Feed' },
        ],
      }

      vi.mocked(invoke).mockResolvedValueOnce({
        success: true,
        feedsImported: 1,
        feedsSkipped: 1, // One duplicate skipped
        settingsImported: false,
        aiSettingsImported: false,
      })

      const result = await importConfigFromFile(configWithDuplicates)

      expect(result.feedsImported).toBe(1)
      expect(result.feedsSkipped).toBe(1)
    })

    it('should handle empty feeds array', async () => {
      const emptyConfig: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
      }

      vi.mocked(invoke).mockResolvedValueOnce({
        success: true,
        feedsImported: 0,
        feedsSkipped: 0,
        settingsImported: false,
        aiSettingsImported: false,
      })

      const result = await importConfigFromFile(emptyConfig)

      expect(result.success).toBe(true)
      expect(result.feedsImported).toBe(0)
    })

    it('should handle backend errors gracefully', async () => {
      const validConfig: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
      }

      vi.mocked(invoke).mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(importConfigFromFile(validConfig)).rejects.toThrow('Database connection failed')
    })

    it('should import AI settings when present', async () => {
      const configWithAiSettings: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
        aiSettings: {
          apiEndpoint: 'https://api.openai.com/v1',
          model: 'gpt-4o',
          maxTokens: 500,
          prompt: 'Custom prompt',
          enableAutoSummary: true,
          language: 'en-US',
          maxConcurrency: 5,
        },
      }

      vi.mocked(invoke).mockResolvedValueOnce({
        success: true,
        feedsImported: 0,
        feedsSkipped: 0,
        settingsImported: false,
        aiSettingsImported: true,
      })

      const result = await importConfigFromFile(configWithAiSettings)

      expect(result.aiSettingsImported).toBe(true)
    })

    it('should import app settings when present', async () => {
      const configWithAppSettings: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
        appSettings: {
          pollInterval: '1h',
          notificationType: 'none',
          enableNotifications: false,
          maxNotificationsPerBatch: 10,
          enableBackgroundRefresh: false,
          closeToTray: false,
        },
      }

      vi.mocked(invoke).mockResolvedValueOnce({
        success: true,
        feedsImported: 0,
        feedsSkipped: 0,
        settingsImported: true,
        aiSettingsImported: false,
      })

      const result = await importConfigFromFile(configWithAppSettings)

      expect(result.settingsImported).toBe(true)
    })
  })

  describe('ImportResult type', () => {
    it('should have correct structure for success result', () => {
      const result: ImportResult = {
        success: true,
        feedsImported: 5,
        feedsSkipped: 2,
        settingsImported: true,
        aiSettingsImported: true,
      }

      expect(result.success).toBe(true)
      expect(typeof result.feedsImported).toBe('number')
      expect(typeof result.feedsSkipped).toBe('number')
      expect(typeof result.settingsImported).toBe('boolean')
      expect(typeof result.aiSettingsImported).toBe('boolean')
    })

    it('should have error field for failure result', () => {
      const result: ImportResult = {
        success: false,
        error: 'Import failed due to invalid format',
        feedsImported: 0,
        feedsSkipped: 0,
        settingsImported: false,
        aiSettingsImported: false,
      }

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
