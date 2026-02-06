/**
 * RssApi Integration Tests
 *
 * These tests verify the RssApi class correctly handles Tauri IPC calls
 * using the mock runtime.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockIPC, clearMocks, mockWindows } from '@tauri-apps/api/mocks'
import { RssApi } from '../../src/lib/api'
import type { Feed, Article, FeedWithUnreadCount, ReaderSettings } from '../../src/types'
import { DEFAULT_READER_SETTINGS } from '../../src/types'

describe('RssApi Integration Tests', () => {
  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mockWindows('main')
  })

  afterEach(() => {
    clearMocks()
    vi.restoreAllMocks()
  })

  /**
   * Feed Management API Tests
   */
  describe('Feed API', () => {
    const mockFeed: Feed = {
      id: 'feed-1',
      url: 'https://example.com/feed.xml',
      title: 'Example Feed',
      description: 'Test feed',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('should add a feed', async () => {
      mockIPC((cmd) => {
        if (cmd === 'add_feed') return mockFeed
      })

      const result = await RssApi.addFeed('https://example.com/feed.xml')
      expect(result).toEqual(mockFeed)
    })

    it('should get all feeds', async () => {
      const mockFeeds: FeedWithUnreadCount[] = [
        { feed: mockFeed, unread_count: 5 },
        {
          feed: {
            ...mockFeed,
            id: 'feed-2',
            title: 'Another Feed',
          },
          unread_count: 3,
        },
      ]

      mockIPC((cmd) => {
        if (cmd === 'get_feeds') return mockFeeds
      })

      const result = await RssApi.getFeeds()
      expect(result).toHaveLength(2)
      expect(result[0].feed.title).toBe('Example Feed')
    })

    it('should remove a feed', async () => {
      mockIPC(() => null)

      await expect(RssApi.removeFeed('feed-1')).resolves.toBeUndefined()
    })

    it('should refresh a feed', async () => {
      const mockRefreshed: FeedWithUnreadCount = {
        feed: mockFeed,
        unread_count: 10,
      }

      mockIPC((cmd) => {
        if (cmd === 'refresh_feed') return mockRefreshed
      })

      const result = await RssApi.refreshFeed('feed-1')
      expect(result.unread_count).toBe(10)
    })

    it('should refresh all feeds', async () => {
      const mockFeeds: FeedWithUnreadCount[] = [
        { feed: mockFeed, unread_count: 0 },
      ]

      mockIPC((cmd) => {
        if (cmd === 'refresh_all_feeds') return mockFeeds
      })

      const result = await RssApi.refreshAllFeeds()
      expect(result).toHaveLength(1)
    })
  })

  /**
   * Article API Tests
   */
  describe('Article API', () => {
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

    it('should get articles', async () => {
      mockIPC((cmd) => {
        if (cmd === 'get_articles') return [mockArticle]
      })

      const result = await RssApi.getArticles()
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Article')
    })

    it('should get articles with filters', async () => {
      mockIPC((cmd, payload) => {
        if (cmd === 'get_articles') {
          const feedId = payload?.feedId as string | undefined
          const limit = payload?.limit as number | undefined
          const unreadOnly = payload?.unreadOnly as boolean | undefined

          if (feedId === 'feed-1' && unreadOnly && limit === 10) {
            return [mockArticle]
          }
          return []
        }
      })

      const result = await RssApi.getArticles({
        feed_id: 'feed-1',
        limit: 10,
        unread_only: true,
      })
      expect(result).toHaveLength(1)
    })

    it('should mark article as read', async () => {
      mockIPC(() => null)

      await expect(RssApi.markArticleRead('article-1', true)).resolves.toBeUndefined()
    })

    it('should mark all articles as read', async () => {
      mockIPC(() => null)

      await expect(RssApi.markAllRead('feed-1')).resolves.toBeUndefined()
    })

    it('should get unread count', async () => {
      mockIPC(() => 5)

      const result = await RssApi.getUnreadCount('feed-1')
      expect(result).toBe(5)
    })

    it('should get unread count for all feeds', async () => {
      mockIPC(() => 15)

      const result = await RssApi.getUnreadCount()
      expect(result).toBe(15)
    })
  })

  /**
   * Reader Feature API Tests
   */
  describe('Reader API', () => {
    const mockArticle: Article = {
      id: 'article-1',
      feed_id: 'feed-1',
      title: 'Test Article',
      link: 'https://example.com/article',
      read: true,
      created_at: '2024-01-01T00:00:00Z',
      reading_progress: 50,
      favorite: false,
    }

    it('should get single article', async () => {
      mockIPC(() => mockArticle)

      const result = await RssApi.getArticle('article-1')
      expect(result).toEqual(mockArticle)
    })

    it('should return null when article not found', async () => {
      mockIPC(() => null)

      const result = await RssApi.getArticle('nonexistent')
      expect(result).toBeNull()
    })

    it('should update reading progress', async () => {
      mockIPC(() => null)

      await expect(
        RssApi.updateReadingProgress('article-1', 75)
      ).resolves.toBeUndefined()
    })

    it('should toggle favorite', async () => {
      mockIPC(() => null)

      // Favorite
      await expect(RssApi.setArticleFavorite('article-1', true)).resolves.toBeUndefined()

      // Unfavorite
      await expect(RssApi.setArticleFavorite('article-1', false)).resolves.toBeUndefined()
    })

    it('should get favorite articles', async () => {
      const favoriteArticles = [
        { ...mockArticle, id: 'article-1', favorite: true },
        { ...mockArticle, id: 'article-2', favorite: true },
      ]

      mockIPC(() => favoriteArticles)

      const result = await RssApi.getFavoriteArticles()
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

      const result = await RssApi.getFavoriteArticles(5)
      expect(result).toHaveLength(5)
    })
  })

  /**
   * Utility API Tests
   */
  describe('Utility API', () => {
    it('should open link', async () => {
      mockIPC(() => null)

      await expect(RssApi.openLink('https://example.com')).resolves.toBeUndefined()
    })
  })

  /**
   * Error Handling Tests
   */
  describe('Error Handling', () => {
    it('should handle command errors gracefully', async () => {
      mockIPC(() => {
        throw new Error('Network error')
      })

      await expect(RssApi.getFeeds()).rejects.toThrow('Network error')
    })

    it('should handle empty responses', async () => {
      mockIPC(() => [])

      const result = await RssApi.getFeeds()
      expect(result).toEqual([])
    })
  })

  /**
   * Complex Scenario Tests
   */
  describe('Complex Scenarios', () => {
    it('should handle complete feed refresh flow', async () => {
      const mockFeed: Feed = {
        id: 'feed-1',
        url: 'https://example.com/feed.xml',
        title: 'Example Feed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockArticles: Article[] = [
        {
          id: 'article-1',
          feed_id: 'feed-1',
          title: 'Article 1',
          link: 'https://example.com/1',
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          reading_progress: 0,
          favorite: false,
        },
        {
          id: 'article-2',
          feed_id: 'feed-1',
          title: 'Article 2',
          link: 'https://example.com/2',
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          reading_progress: 0,
          favorite: true,
        },
      ]

      mockIPC((cmd, payload) => {
        switch (cmd) {
          case 'refresh_feed':
            return { feed: mockFeed, unread_count: 2 }
          case 'get_articles':
            return mockArticles
          case 'get_article':
            return mockArticles.find(a => a.id === payload?.id) || null
          case 'set_article_favorite':
            return null
          default:
            return null
        }
      })

      // 1. Refresh feed
      const feedResult = await RssApi.refreshFeed('feed-1')
      expect(feedResult.unread_count).toBe(2)

      // 2. Get articles
      const articles = await RssApi.getArticles({ feed_id: 'feed-1' })
      expect(articles).toHaveLength(2)

      // 3. Get first article
      const article = await RssApi.getArticle('article-1')
      expect(article).toBeTruthy()
      expect(article?.favorite).toBe(false)

      // 4. Toggle favorite
      await RssApi.setArticleFavorite('article-1', true)
      const updatedArticle = await RssApi.getArticle('article-1')
      // Note: In this mock, we're not actually updating the stored article
      // In real implementation, the article would be updated
    })

    it('should handle reading progress tracking flow', async () => {
      let currentProgress = 0

      const mockArticle: Article = {
        id: 'article-1',
        feed_id: 'feed-1',
        title: 'Test Article',
        link: 'https://example.com/article',
        read: true,
        created_at: '2024-01-01T00:00:00Z',
        reading_progress: 0,
        favorite: false,
      }

      mockIPC((cmd, payload) => {
        if (cmd === 'update_reading_progress') {
          currentProgress = payload?.progress as number
          return null
        }
        if (cmd === 'get_article') {
          return { ...mockArticle, reading_progress: currentProgress }
        }
        return mockArticle
      })

      // Initial progress is 0
      const initial = await RssApi.getArticle('article-1')
      expect(initial?.reading_progress).toBe(0)

      // Update progress to 50%
      await RssApi.updateReadingProgress('article-1', 50)

      // Verify progress is updated
      const updated = await RssApi.getArticle('article-1')
      expect(updated?.reading_progress).toBe(50)

      // Mark as complete
      await RssApi.updateReadingProgress('article-1', 100)

      const completed = await RssApi.getArticle('article-1')
      expect(completed?.reading_progress).toBe(100)
    })
  })
})
