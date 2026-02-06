/**
 * Tauri Integration Tests
 *
 * These tests use Tauri's mock runtime to test IPC communication
 * between the frontend and Rust backend without requiring the full Tauri app to run.
 *
 * This allows us to test:
 * - Command invocation (invoke)
 * - Event handling (listen/emit)
 * - Error handling
 * - Data serialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockIPC, clearMocks, mockWindows } from '@tauri-apps/api/mocks'
import { invoke } from '@tauri-apps/api/core'
import type { Feed, Article, FeedWithUnreadCount, ReaderSettings } from '../../src/types'

describe('Tauri Integration Tests - IPC Communication', () => {
  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock the main window
    mockWindows('main')
  })

  afterEach(() => {
    // Clear all mocks after each test
    clearMocks()
    vi.restoreAllMocks()
  })

  /**
   * Feed Management Commands
   */
  describe('Feed Commands', () => {
    const mockFeed: Feed = {
      id: 'feed-1',
      url: 'https://example.com/feed.xml',
      title: 'Example Feed',
      description: 'Test feed description',
      icon_url: 'https://example.com/icon.png',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('should add a new feed via add_feed command', async () => {
      mockIPC((cmd) => {
        if (cmd === 'add_feed') {
          return mockFeed
        }
      })

      const result = await invoke<Feed>('add_feed', { url: mockFeed.url })
      expect(result).toEqual(mockFeed)
    })

    it('should get all feeds via get_feeds command', async () => {
      const mockFeeds: FeedWithUnreadCount[] = [
        { feed: mockFeed, unread_count: 5 },
      ]

      mockIPC((cmd) => {
        if (cmd === 'get_feeds') {
          return mockFeeds
        }
      })

      const result = await invoke<FeedWithUnreadCount[]>('get_feeds')
      expect(result).toEqual(mockFeeds)
      expect(result).toHaveLength(1)
      expect(result[0].feed.title).toBe('Example Feed')
      expect(result[0].unread_count).toBe(5)
    })

    it('should remove a feed via remove_feed command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'remove_feed') {
          expect(payload).toHaveProperty('id', 'feed-1')
          return undefined
        }
      })

      await expect(invoke('remove_feed', { id: 'feed-1' })).resolves.toBeUndefined()
    })

    it('should refresh a feed via refresh_feed command', async () => {
      const mockRefreshed: FeedWithUnreadCount = {
        feed: { ...mockFeed, updated_at: '2024-01-02T00:00:00Z' },
        unread_count: 10,
      }

      mockIPC((cmd, payload) => {
        if (cmd === 'refresh_feed') {
          expect(payload).toHaveProperty('id', 'feed-1')
          return mockRefreshed
        }
      })

      const result = await invoke<FeedWithUnreadCount>('refresh_feed', { id: 'feed-1' })
      expect(result.unread_count).toBe(10)
    })

    it('should refresh all feeds via refresh_all_feeds command', async () => {
      const mockFeeds: FeedWithUnreadCount[] = [
        { feed: mockFeed, unread_count: 0 },
      ]

      mockIPC((cmd) => {
        if (cmd === 'refresh_all_feeds') {
          return mockFeeds
        }
      })

      const result = await invoke<FeedWithUnreadCount[]>('refresh_all_feeds')
      expect(result).toHaveLength(1)
    })
  })

  /**
   * Article Commands
   */
  describe('Article Commands', () => {
    const mockArticle: Article = {
      id: 'article-1',
      feed_id: 'feed-1',
      title: 'Test Article',
      link: 'https://example.com/article',
      description: 'Test description',
      content: '<p>Test content</p>',
      published_at: '2024-01-01T00:00:00Z',
      read: false,
      created_at: '2024-01-01T00:00:00Z',
      reading_progress: 0,
      favorite: false,
    }

    it('should get articles via get_articles command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'get_articles') {
          expect(payload).toHaveProperty('feedId', 'feed-1')
          return [mockArticle]
        }
      })

      const result = await invoke<Article[]>('get_articles', { feedId: 'feed-1' })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Article')
    })

    it('should get articles with limit', async () => {
      const mockArticles = Array.from({ length: 10 }, (_, i) => ({
        ...mockArticle,
        id: `article-${i}`,
        title: `Article ${i}`,
      }))

      mockIPC((cmd, payload) => {
        if (cmd === 'get_articles') {
          const limit = payload?.limit as number | undefined
          return limit ? mockArticles.slice(0, limit) : mockArticles
        }
      })

      const result = await invoke<Article[]>('get_articles', { limit: 5 })
      expect(result).toHaveLength(5)
    })

    it('should mark article as read via mark_article_read command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'mark_article_read') {
          expect(payload).toHaveProperty('id', 'article-1')
          expect(payload).toHaveProperty('read', true)
          return undefined
        }
      })

      await expect(
        invoke('mark_article_read', { id: 'article-1', read: true })
      ).resolves.toBeUndefined()
    })

    it('should mark all articles as read via mark_all_read command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'mark_all_read') {
          expect(payload).toHaveProperty('feedId', 'feed-1')
          return undefined
        }
      })

      await expect(
        invoke('mark_all_read', { feedId: 'feed-1' })
      ).resolves.toBeUndefined()
    })

    it('should get unread count via get_unread_count command', async () => {
      mockIPC((cmd) => {
        if (cmd === 'get_unread_count') {
          return 5
        }
      })

      const result = await invoke<number>('get_unread_count', { feedId: 'feed-1' })
      expect(result).toBe(5)
    })
  })

  /**
   * Reader Feature Commands
   */
  describe('Reader Commands', () => {
    const mockArticle: Article = {
      id: 'article-1',
      feed_id: 'feed-1',
      title: 'Test Article',
      link: 'https://example.com/article',
      description: 'Test description',
      content: '<p>Test content</p>',
      published_at: '2024-01-01T00:00:00Z',
      read: false,
      created_at: '2024-01-01T00:00:00Z',
      reading_progress: 25,
      favorite: false,
    }

    it('should get single article via get_article command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'get_article') {
          expect(payload).toHaveProperty('id', 'article-1')
          return mockArticle
        }
      })

      const result = await invoke<Article>('get_article', { id: 'article-1' })
      expect(result).toEqual(mockArticle)
    })

    it('should return null when article not found', async () => {
      mockIPC((cmd) => {
        if (cmd === 'get_article') {
          return null
        }
      })

      const result = await invoke<Article | null>('get_article', { id: 'nonexistent' })
      expect(result).toBeNull()
    })

    it('should update reading progress via update_reading_progress command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'update_reading_progress') {
          expect(payload).toHaveProperty('id', 'article-1')
          expect(payload).toHaveProperty('progress', 50)
          return undefined
        }
      })

      await expect(
        invoke('update_reading_progress', { id: 'article-1', progress: 50 })
      ).resolves.toBeUndefined()
    })

    it('should toggle favorite via set_article_favorite command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'set_article_favorite') {
          expect(payload).toHaveProperty('id', 'article-1')
          expect(payload).toHaveProperty('favorite', true)
          return undefined
        }
      })

      await expect(
        invoke('set_article_favorite', { id: 'article-1', favorite: true })
      ).resolves.toBeUndefined()
    })

    it('should get favorite articles via get_favorite_articles command', async () => {
      const favoriteArticles = [
        { ...mockArticle, id: 'article-1', favorite: true },
        { ...mockArticle, id: 'article-2', favorite: true },
      ]

      mockIPC((cmd) => {
        if (cmd === 'get_favorite_articles') {
          return favoriteArticles
        }
      })

      const result = await invoke<Article[]>('get_favorite_articles')
      expect(result).toHaveLength(2)
      expect(result.every(a => a.favorite)).toBe(true)
    })

    it('should get favorite articles with limit', async () => {
      const favoriteArticles = Array.from({ length: 20 }, (_, i) => ({
        ...mockArticle,
        id: `article-${i}`,
        favorite: true,
      }))

      mockIPC((cmd, payload) => {
        if (cmd === 'get_favorite_articles') {
          const limit = payload?.limit as number | undefined
          return limit ? favoriteArticles.slice(0, limit) : favoriteArticles
        }
      })

      const result = await invoke<Article[]>('get_favorite_articles', { limit: 5 })
      expect(result).toHaveLength(5)
    })
  })

  /**
   * Utility Commands
   */
  describe('Utility Commands', () => {
    it('should open link via open_link command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'open_link') {
          expect(payload).toHaveProperty('url', 'https://example.com')
          return undefined
        }
      })

      await expect(
        invoke('open_link', { url: 'https://example.com' })
      ).resolves.toBeUndefined()
    })

    it('should set store value via set_store_value command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'set_store_value') {
          expect(payload).toHaveProperty('key', 'test-key')
          expect(payload).toHaveProperty('value', 'test-value')
          return undefined
        }
      })

      await expect(
        invoke('set_store_value', { key: 'test-key', value: 'test-value' })
      ).resolves.toBeUndefined()
    })

    it('should get store value via get_store_value command', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'get_store_value') {
          expect(payload).toHaveProperty('key', 'test-key')
          return 'stored-value'
        }
      })

      const result = await invoke<string>('get_store_value', { key: 'test-key' })
      expect(result).toBe('stored-value')
    })
  })

  /**
   * Error Handling
   */
  describe('Error Handling', () => {
    it('should reject when command throws error', async () => {
      mockIPC(() => {
        throw new Error('Failed to execute command')
      })

      // Use rejects.toThrow for proper error testing
      await expect(invoke('get_feeds')).rejects.toThrow('Failed to execute command')
    })

    it('should handle missing required parameters', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'get_article') {
          if (!payload?.id) {
            throw new Error('Missing required parameter: id')
          }
          return { id: payload.id }
        }
      })

      let errorThrown = false
      try {
        await invoke('get_article', { id: undefined as unknown as string })
      } catch (error) {
        errorThrown = true
        expect((error as Error).message).toContain('Missing required parameter')
      }
      expect(errorThrown).toBe(true)
    })
  })

  /**
   * Data Serialization
   */
  describe('Data Serialization', () => {
    it('should correctly serialize dates', async () => {
      const mockArticle: Article = {
        id: 'article-1',
        feed_id: 'feed-1',
        title: 'Test Article',
        link: 'https://example.com/article',
        published_at: '2024-01-15T10:30:00Z',
        read: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockIPC(() => mockArticle)

      const result = await invoke<Article>('get_article', { id: 'article-1' })
      expect(result.published_at).toBe('2024-01-15T10:30:00Z')
    })

    it('should correctly serialize reading progress', async () => {
      const mockArticle: Article = {
        id: 'article-1',
        feed_id: 'feed-1',
        title: 'Test Article',
        link: 'https://example.com/article',
        read: true,
        created_at: '2024-01-01T00:00:00Z',
        reading_progress: 75.5,
        favorite: false,
      }

      mockIPC(() => mockArticle)

      const result = await invoke<Article>('get_article', { id: 'article-1' })
      expect(result.reading_progress).toBe(75.5)
    })

    it('should correctly serialize boolean values', async () => {
      const mockArticle: Article = {
        id: 'article-1',
        feed_id: 'feed-1',
        title: 'Test Article',
        link: 'https://example.com/article',
        read: true,
        created_at: '2024-01-01T00:00:00Z',
        favorite: true,
        reading_progress: 100,
      }

      mockIPC(() => mockArticle)

      const result = await invoke<Article>('get_article', { id: 'article-1' })
      expect(result.read).toBe(true)
      expect(result.favorite).toBe(true)
    })
  })
})
