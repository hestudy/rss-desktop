import { describe, it, expect } from 'vitest'
import {
  ExportedConfigSchema,
  FeedExportSchema,
  AiSettingsExportSchema,
  AppSettingsExportSchema,
  type ExportedConfig,
  type FeedExport,
  type AiSettingsExport,
  type AppSettingsExport,
  createExportConfig,
  validateImportConfig,
  CURRENT_CONFIG_VERSION,
} from './configExport'
import type { Feed } from '../types'
import type { AiSettings, AppSettings } from './settings'

describe('ConfigExport Types and Schemas', () => {
  describe('CURRENT_CONFIG_VERSION', () => {
    it('should be a valid semver-like version string', () => {
      expect(CURRENT_CONFIG_VERSION).toMatch(/^\d+\.\d+$/)
    })
  })

  describe('FeedExportSchema', () => {
    it('should validate a valid feed export', () => {
      const feedExport: FeedExport = {
        url: 'https://example.com/feed.xml',
        title: 'Example Feed',
        description: 'A sample feed',
        use_full_content: true,
        use_ai_summary: false,
        use_ai_translation: false,
      }

      const result = FeedExportSchema.safeParse(feedExport)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.url).toBe(feedExport.url)
        expect(result.data.title).toBe(feedExport.title)
      }
    })

    it('should require url and title', () => {
      const invalidFeed = {
        description: 'Missing url and title',
      }

      const result = FeedExportSchema.safeParse(invalidFeed)
      expect(result.success).toBe(false)
    })

    it('should use default values for optional boolean fields', () => {
      const minimalFeed = {
        url: 'https://example.com/feed.xml',
        title: 'Minimal Feed',
      }

      const result = FeedExportSchema.safeParse(minimalFeed)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.use_full_content).toBe(false)
        expect(result.data.use_ai_summary).toBe(false)
        expect(result.data.use_ai_translation).toBe(false)
      }
    })

    it('should allow optional description and icon_url', () => {
      const feedWithOptional: FeedExport = {
        url: 'https://example.com/feed.xml',
        title: 'Feed with Optional',
        description: 'A description',
        icon_url: 'https://example.com/icon.png',
      }

      const result = FeedExportSchema.safeParse(feedWithOptional)
      expect(result.success).toBe(true)
    })
  })

  describe('AiSettingsExportSchema', () => {
    it('should validate AI settings without sensitive data', () => {
      const aiSettings: AiSettingsExport = {
        apiEndpoint: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        maxTokens: 300,
        prompt: 'Summarize this article',
        enableAutoSummary: true,
        language: 'zh-CN',
        maxConcurrency: 3,
      }

      const result = AiSettingsExportSchema.safeParse(aiSettings)
      expect(result.success).toBe(true)
    })

    it('should NOT include apiKey field (security)', () => {
      // The schema should not have apiKey field
      const schemaKeys = Object.keys(AiSettingsExportSchema.shape)
      expect(schemaKeys).not.toContain('apiKey')
    })

    it('should use default values', () => {
      const minimalAi = {}

      const result = AiSettingsExportSchema.safeParse(minimalAi)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apiEndpoint).toBe('https://api.openai.com/v1')
        expect(result.data.model).toBe('gpt-4o-mini')
        expect(result.data.maxTokens).toBe(300)
        expect(result.data.enableAutoSummary).toBe(false)
      }
    })

    it('should validate maxTokens range', () => {
      const invalidAi = {
        maxTokens: 5000, // exceeds max of 2000
      }

      const result = AiSettingsExportSchema.safeParse(invalidAi)
      expect(result.success).toBe(false)
    })

    it('should validate maxConcurrency range', () => {
      const invalidAi = {
        maxConcurrency: 20, // exceeds max of 10
      }

      const result = AiSettingsExportSchema.safeParse(invalidAi)
      expect(result.success).toBe(false)
    })
  })

  describe('AppSettingsExportSchema', () => {
    it('should validate app settings', () => {
      const appSettings: AppSettingsExport = {
        pollInterval: '30m',
        notificationType: 'system',
        enableNotifications: true,
        maxNotificationsPerBatch: 5,
        enableBackgroundRefresh: true,
        closeToTray: true,
        enableAutoUpdateCheck: true,
        autoUpdateCheckInterval: '4h',
      }

      const result = AppSettingsExportSchema.safeParse(appSettings)
      expect(result.success).toBe(true)
    })

    it('should validate pollInterval enum', () => {
      const invalidApp = {
        pollInterval: '10m', // not in enum
      }

      const result = AppSettingsExportSchema.safeParse(invalidApp)
      expect(result.success).toBe(false)
    })

    it('should validate maxNotificationsPerBatch range', () => {
      const invalidApp = {
        maxNotificationsPerBatch: 150, // exceeds max of 100
      }

      const result = AppSettingsExportSchema.safeParse(invalidApp)
      expect(result.success).toBe(false)
    })
  })

  describe('ExportedConfigSchema', () => {
    it('should validate a complete exported config', () => {
      const config: ExportedConfig = {
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
          enableAutoUpdateCheck: true,
          autoUpdateCheckInterval: '4h',
        },
      }

      const result = ExportedConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should require version and exportedAt', () => {
      const invalidConfig = {
        feeds: [],
      }

      const result = ExportedConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should allow optional sections (aiSettings, appSettings)', () => {
      const minimalConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
      }

      const result = ExportedConfigSchema.safeParse(minimalConfig)
      expect(result.success).toBe(true)
    })

    it('should allow empty feeds array', () => {
      const configWithEmptyFeeds: ExportedConfig = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
      }

      const result = ExportedConfigSchema.safeParse(configWithEmptyFeeds)
      expect(result.success).toBe(true)
    })
  })
})

describe('createExportConfig', () => {
  it('should create a valid export config from input data', () => {
    const feeds: Feed[] = [
      {
        id: '1',
        url: 'https://example.com/feed.xml',
        title: 'Example Feed',
        description: 'A feed',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z',
        use_full_content: true,
        use_ai_summary: false,
        use_ai_translation: false,
      },
    ]

    const aiSettings: AiSettings = {
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-secret-key', // should NOT be exported
      model: 'gpt-4o-mini',
      maxTokens: 300,
      prompt: 'Summarize',
      enableAutoSummary: true,
      language: 'zh-CN',
      maxConcurrency: 3,
      customInputPrice: null,
      customOutputPrice: null,
    }

    const appSettings: AppSettings = {
      pollInterval: '30m',
      notificationType: 'system',
      enableNotifications: true,
      maxNotificationsPerBatch: 5,
      enableBackgroundRefresh: true,
      closeToTray: true,
      enableAutoUpdateCheck: true,
      autoUpdateCheckInterval: '4h',
    }

    const result = createExportConfig(feeds, aiSettings, appSettings)

    expect(result.version).toBe(CURRENT_CONFIG_VERSION)
    expect(result.exportedAt).toBeDefined()
    expect(result.feeds).toHaveLength(1)
    expect(result.feeds[0].url).toBe('https://example.com/feed.xml')
    expect(result.feeds[0].title).toBe('Example Feed')

    // Verify apiKey is NOT exported
    expect(result.aiSettings).toBeDefined()
    expect('apiKey' in result.aiSettings!).toBe(false)

    // Verify appSettings are exported
    expect(result.appSettings).toBeDefined()
    expect(result.appSettings!.pollInterval).toBe('30m')
  })

  it('should handle feeds with missing optional fields', () => {
    const feeds: Feed[] = [
      {
        id: '1',
        url: 'https://example.com/feed.xml',
        title: 'Minimal Feed',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z',
      },
    ]

    const aiSettings: AiSettings = {
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      maxTokens: 300,
      prompt: 'Summarize',
      enableAutoSummary: false,
      language: 'zh-CN',
      maxConcurrency: 3,
      customInputPrice: null,
      customOutputPrice: null,
    }

    const appSettings: AppSettings = {
      pollInterval: '30m',
      notificationType: 'system',
      enableNotifications: true,
      maxNotificationsPerBatch: 5,
      enableBackgroundRefresh: true,
      closeToTray: true,
      enableAutoUpdateCheck: true,
      autoUpdateCheckInterval: '4h',
    }

    const result = createExportConfig(feeds, aiSettings, appSettings)

    expect(result.feeds[0].description).toBeUndefined()
    expect(result.feeds[0].icon_url).toBeUndefined()
  })

  it('should generate valid ISO timestamp for exportedAt', () => {
    const result = createExportConfig([], {
      apiEndpoint: '',
      apiKey: '',
      model: '',
      maxTokens: 300,
      prompt: '',
      enableAutoSummary: false,
      language: 'zh-CN',
      maxConcurrency: 3,
      customInputPrice: null,
      customOutputPrice: null,
    }, {
      pollInterval: '30m',
      notificationType: 'system',
      enableNotifications: true,
      maxNotificationsPerBatch: 5,
      enableBackgroundRefresh: true,
      closeToTray: true,
      enableAutoUpdateCheck: true,
      autoUpdateCheckInterval: '4h',
    })

    // Should be valid ISO string
    const date = new Date(result.exportedAt)
    expect(date.toISOString()).toBe(result.exportedAt)
  })
})

describe('validateImportConfig', () => {
  it('should return success for valid config', () => {
    const validConfig: ExportedConfig = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      feeds: [
        {
          url: 'https://example.com/feed.xml',
          title: 'Example',
        },
      ],
    }

    const result = validateImportConfig(validConfig)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.feeds).toHaveLength(1)
    }
  })

  it('should return error for invalid config structure', () => {
    const invalidConfig = {
      version: '1.0',
      // missing exportedAt
      feeds: 'not an array', // wrong type
    }

    const result = validateImportConfig(invalidConfig)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })

  it('should return error for missing version', () => {
    const configWithoutVersion = {
      exportedAt: new Date().toISOString(),
      feeds: [],
    }

    const result = validateImportConfig(configWithoutVersion)
    expect(result.success).toBe(false)
  })

  it('should handle null input', () => {
    const result = validateImportConfig(null)
    expect(result.success).toBe(false)
  })

  it('should handle undefined input', () => {
    const result = validateImportConfig(undefined)
    expect(result.success).toBe(false)
  })

  it('should handle string input (JSON string)', () => {
    const validConfig = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      feeds: [],
    }

    const result = validateImportConfig(JSON.stringify(validConfig))
    expect(result.success).toBe(true)
  })

  it('should return error for invalid JSON string', () => {
    const result = validateImportConfig('not valid json')
    expect(result.success).toBe(false)
  })

  it('should validate feed URLs are valid URLs', () => {
    const configWithInvalidUrl = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      feeds: [
        {
          url: 'not a valid url',
          title: 'Bad URL Feed',
        },
      ],
    }

    // This depends on whether we want to validate URL format
    // For now, we accept any string as URL (let backend validate)
    const result = validateImportConfig(configWithInvalidUrl)
    // If we add URL validation, this should be false
    // For now, we'll accept any string
    expect(result.success).toBe(true)
  })
})
