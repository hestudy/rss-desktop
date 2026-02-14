import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { RssProvider, useRss } from './RssContext'
import { RssApi } from '../lib/api'
import type { ReactNode } from 'react'
import type { FeedWithUnreadCount, Article } from '../types'
import { listen } from '@tauri-apps/api/event'

// Mock RssApi
vi.mock('../lib/api', () => ({
  RssApi: {
    getFeeds: vi.fn(),
    getArticles: vi.fn(),
    addFeed: vi.fn(),
    removeFeed: vi.fn(),
    updateFeed: vi.fn(),
    refreshFeed: vi.fn(),
    refreshAllFeeds: vi.fn(),
    markArticleRead: vi.fn(),
    markAllRead: vi.fn(),
    openLink: vi.fn(),
    getFavoriteArticles: vi.fn(),
  },
}))

// Capture event listener callbacks
type ListenerCallback = (event: { payload: unknown }) => void
const eventListeners: Record<string, ListenerCallback> = {}

// Mock Tauri event listener
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, callback: ListenerCallback) => {
    eventListeners[eventName] = callback
    return Promise.resolve(() => { delete eventListeners[eventName] })
  }),
}))

describe('RssContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <RssProvider>{children}</RssProvider>
  )

  describe('selectFeedAndLoad', () => {
    it('should set selectedFeedId and showFavoritesOnly to false', async () => {
      const mockArticles = [
        { 
          id: 'article-1', 
          title: 'Test Article', 
          feed_id: 'feed-1', 
          link: 'https://example.com/article-1',
          read: false,
          created_at: '2024-01-01T00:00:00Z'
        },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(mockArticles)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.selectFeedAndLoad('feed-1')
      })

      expect(result.current.selectedFeedId).toBe('feed-1')
      expect(result.current.showFavoritesOnly).toBe(false)
    })

    it('should call loadArticles with the feedId and wait for completion', async () => {
      const mockArticles = [
        { 
          id: 'article-1', 
          title: 'Test Article', 
          feed_id: 'feed-1', 
          link: 'https://example.com/article-1',
          read: false,
          created_at: '2024-01-01T00:00:00Z'
        },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(mockArticles)

      const { result } = renderHook(() => useRss(), { wrapper })

      expect(result.current.articles).toEqual([])

      await act(async () => {
        await result.current.selectFeedAndLoad('feed-1')
      })

      await waitFor(() => {
        expect(result.current.articles).toEqual(mockArticles)
      })

      expect(RssApi.getArticles).toHaveBeenCalledWith({
        feed_id: 'feed-1',
        limit: 100,
      })
    })

    it('should return a Promise that resolves after loadArticles completes', async () => {
      const mockArticles = [
        { 
          id: 'article-1', 
          title: 'Test Article', 
          feed_id: 'feed-1', 
          link: 'https://example.com/article-1',
          read: false,
          created_at: '2024-01-01T00:00:00Z'
        },
      ]
      
      vi.mocked(RssApi.getArticles).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockArticles), 100))
      )

      const { result } = renderHook(() => useRss(), { wrapper })

      const startTime = Date.now()
      await act(async () => {
        await result.current.selectFeedAndLoad('feed-1')
      })
      const endTime = Date.now()

      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
      await waitFor(() => {
        expect(result.current.articles).toEqual(mockArticles)
      })
    })

    it('should handle errors from loadArticles', async () => {
      const errorMessage = 'Failed to load articles'
      vi.mocked(RssApi.getArticles).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.selectFeedAndLoad('feed-1')
      })

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage)
      })
    })
  })

  describe('selectFeed (existing behavior)', () => {
    it('should not wait for loadArticles to complete', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article',
          feed_id: 'feed-1',
          link: 'https://example.com/article-1',
          read: false,
          created_at: '2024-01-01T00:00:00Z'
        },
      ]

      vi.mocked(RssApi.getArticles).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockArticles), 100))
      )

      const { result } = renderHook(() => useRss(), { wrapper })

      const startTime = Date.now()
      act(() => {
        result.current.selectFeed('feed-1')
      })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(50)

      await waitFor(() => {
        expect(result.current.selectedFeedId).toBe('feed-1')
        expect(result.current.showFavoritesOnly).toBe(false)
      })
    })
  })

  describe('useRss outside provider', () => {
    it('should throw when used outside RssProvider', () => {
      expect(() => {
        renderHook(() => useRss())
      }).toThrow('useRss must be used within RssProvider')
    })
  })

  describe('loadFeeds', () => {
    it('should load feeds successfully', async () => {
      const mockFeeds: FeedWithUnreadCount[] = [
        { feed: { id: 'f1', url: 'https://example.com', title: 'Feed 1', created_at: '', updated_at: '' }, unread_count: 3 },
      ]
      vi.mocked(RssApi.getFeeds).mockResolvedValue(mockFeeds)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.loadFeeds()
      })

      expect(result.current.feeds).toEqual(mockFeeds)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.getFeeds).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.loadFeeds()
      })

      expect(result.current.error).toBe('Network error')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.getFeeds).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.loadFeeds()
      })

      expect(result.current.error).toBe('Failed to load feeds')
    })
  })

  describe('loadArticles', () => {
    it('should load articles for a feed', async () => {
      const mockArticles: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Art 1', link: '', read: false, created_at: '' },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(mockArticles)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.loadArticles('f1')
      })

      expect(result.current.articles).toEqual(mockArticles)
      expect(RssApi.getArticles).toHaveBeenCalledWith({ feed_id: 'f1', limit: 100 })
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.getArticles).mockRejectedValue(new Error('Load failed'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.loadArticles()
      })

      expect(result.current.error).toBe('Load failed')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.getArticles).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.loadArticles()
      })

      expect(result.current.error).toBe('Failed to load articles')
    })
  })

  describe('addFeed', () => {
    it('should add feed and reload feeds', async () => {
      const newFeed = { id: 'f1', url: 'https://example.com', title: 'New', created_at: '', updated_at: '' }
      vi.mocked(RssApi.addFeed).mockResolvedValue(newFeed)
      vi.mocked(RssApi.getFeeds).mockResolvedValue([])

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        const feed = await result.current.addFeed('https://example.com', true, false, false)
        expect(feed).toEqual(newFeed)
      })

      expect(RssApi.addFeed).toHaveBeenCalledWith('https://example.com', true, false, false)
      expect(RssApi.getFeeds).toHaveBeenCalled()
    })

    it('should set error and rethrow on failure', async () => {
      vi.mocked(RssApi.addFeed).mockRejectedValue(new Error('Duplicate'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.addFeed('https://example.com')).rejects.toThrow('Duplicate')
      })

      expect(result.current.error).toBe('Duplicate')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.addFeed).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.addFeed('https://example.com')).rejects.toBe('unknown')
      })

      expect(result.current.error).toBe('Failed to add feed')
    })
  })

  describe('removeFeed', () => {
    it('should remove feed and reload', async () => {
      vi.mocked(RssApi.removeFeed).mockResolvedValue(undefined)
      vi.mocked(RssApi.getFeeds).mockResolvedValue([])

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.removeFeed('f1')
      })

      expect(RssApi.removeFeed).toHaveBeenCalledWith('f1')
    })

    it('should clear articles when removing the selected feed', async () => {
      const feeds: FeedWithUnreadCount[] = [
        { feed: { id: 'f1', url: '', title: 'Feed', created_at: '', updated_at: '' }, unread_count: 2 },
      ]
      const articles: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Art', link: '', read: false, created_at: '' },
      ]
      vi.mocked(RssApi.getFeeds).mockResolvedValue(feeds)
      vi.mocked(RssApi.getArticles).mockResolvedValue(articles)
      vi.mocked(RssApi.removeFeed).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      // Load feeds and select feed
      await act(async () => { await result.current.loadFeeds() })
      act(() => { result.current.selectFeed('f1') })
      await waitFor(() => { expect(result.current.selectedFeedId).toBe('f1') })

      // Now remove the selected feed
      vi.mocked(RssApi.getFeeds).mockResolvedValue([])
      await act(async () => { await result.current.removeFeed('f1') })

      expect(result.current.selectedFeedId).toBeNull()
      expect(result.current.articles).toEqual([])
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.removeFeed).mockRejectedValue(new Error('Not found'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.removeFeed('f1')).rejects.toThrow('Not found')
      })

      expect(result.current.error).toBe('Not found')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.removeFeed).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.removeFeed('f1')).rejects.toBe('unknown')
      })

      expect(result.current.error).toBe('Failed to remove feed')
    })
  })

  describe('updateFeed', () => {
    it('should update feed in list', async () => {
      const updated: FeedWithUnreadCount = {
        feed: { id: 'f1', url: 'https://example.com', title: 'Updated', created_at: '', updated_at: '' },
        unread_count: 0,
      }
      vi.mocked(RssApi.getFeeds).mockResolvedValue([updated])
      vi.mocked(RssApi.updateFeed).mockResolvedValue(updated)

      const { result } = renderHook(() => useRss(), { wrapper })

      // Load feeds first
      await act(async () => { await result.current.loadFeeds() })

      await act(async () => {
        await result.current.updateFeed('f1', 'Updated')
      })

      expect(RssApi.updateFeed).toHaveBeenCalledWith('f1', 'Updated', undefined, undefined, undefined, undefined)
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.updateFeed).mockRejectedValue(new Error('Update failed'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.updateFeed('f1', 'New')).rejects.toThrow('Update failed')
      })

      expect(result.current.error).toBe('Update failed')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.updateFeed).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.updateFeed('f1', 'New')).rejects.toBe('unknown')
      })

      expect(result.current.error).toBe('Failed to update feed')
    })
  })

  describe('refreshFeed', () => {
    it('should refresh a single feed', async () => {
      const refreshed: FeedWithUnreadCount = {
        feed: { id: 'f1', url: 'https://example.com', title: 'Feed', created_at: '', updated_at: '' },
        unread_count: 5,
      }
      vi.mocked(RssApi.refreshFeed).mockResolvedValue(refreshed)
      vi.mocked(RssApi.getFeeds).mockResolvedValue([refreshed])

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadFeeds() })
      await act(async () => { await result.current.refreshFeed('f1') })

      expect(RssApi.refreshFeed).toHaveBeenCalledWith('f1')
    })

    it('should merge articles when refreshing the selected feed', async () => {
      const refreshed: FeedWithUnreadCount = {
        feed: { id: 'f1', url: 'https://example.com', title: 'Feed', created_at: '', updated_at: '' },
        unread_count: 5,
      }
      vi.mocked(RssApi.refreshFeed).mockResolvedValue(refreshed)
      vi.mocked(RssApi.getFeeds).mockResolvedValue([refreshed])
      vi.mocked(RssApi.getArticles).mockResolvedValue([])

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadFeeds() })
      act(() => { result.current.selectFeed('f1') })
      await waitFor(() => { expect(result.current.selectedFeedId).toBe('f1') })

      await act(async () => { await result.current.refreshFeed('f1') })

      // getArticles should be called for the merge
      expect(RssApi.getArticles).toHaveBeenCalled()
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.refreshFeed).mockRejectedValue(new Error('Timeout'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.refreshFeed('f1')).rejects.toThrow('Timeout')
      })

      expect(result.current.error).toBe('Timeout')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.refreshFeed).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.refreshFeed('f1')).rejects.toBe('unknown')
      })

      expect(result.current.error).toBe('Failed to refresh feed')
    })
  })

  describe('refreshAllFeeds', () => {
    it('should call refreshAllFeeds API', async () => {
      vi.mocked(RssApi.refreshAllFeeds).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.refreshAllFeeds()
      })

      expect(RssApi.refreshAllFeeds).toHaveBeenCalled()
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.refreshAllFeeds).mockRejectedValue(new Error('Refresh failed'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.refreshAllFeeds()).rejects.toThrow('Refresh failed')
      })

      expect(result.current.error).toBe('Refresh failed')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.refreshAllFeeds).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await expect(result.current.refreshAllFeeds()).rejects.toBe('unknown')
      })

      expect(result.current.error).toBe('Failed to refresh feeds')
    })
  })

  describe('silentRefreshAll', () => {
    it('should call refreshAllFeeds silently', async () => {
      vi.mocked(RssApi.refreshAllFeeds).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.silentRefreshAll()
      })

      expect(RssApi.refreshAllFeeds).toHaveBeenCalled()
    })

    it('should not set error on failure', async () => {
      vi.mocked(RssApi.refreshAllFeeds).mockRejectedValue(new Error('fail'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.silentRefreshAll()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('selectFavorites', () => {
    it('should load favorite articles', async () => {
      const favorites: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Fav', link: '', read: false, created_at: '', favorite: true },
      ]
      vi.mocked(RssApi.getFavoriteArticles).mockResolvedValue(favorites)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.selectFavorites()
      })

      expect(result.current.showFavoritesOnly).toBe(true)
      expect(result.current.selectedFeedId).toBeNull()
      expect(result.current.articles).toEqual(favorites)
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.getFavoriteArticles).mockRejectedValue(new Error('Fav error'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.selectFavorites()
      })

      expect(result.current.error).toBe('Fav error')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.getFavoriteArticles).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.selectFavorites()
      })

      expect(result.current.error).toBe('Failed to load favorites')
    })
  })

  describe('markArticleRead', () => {
    it('should mark article as read and decrement unread count', async () => {
      const feeds: FeedWithUnreadCount[] = [
        { feed: { id: 'f1', url: '', title: 'Feed', created_at: '', updated_at: '' }, unread_count: 3 },
      ]
      const articles: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Art', link: '', read: false, created_at: '' },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(articles)
      vi.mocked(RssApi.getFeeds).mockResolvedValue(feeds)
      vi.mocked(RssApi.markArticleRead).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadFeeds() })
      await act(async () => { await result.current.loadArticles('f1') })
      await act(async () => { await result.current.markArticleRead('a1', true) })

      expect(result.current.articles[0].read).toBe(true)
      expect(RssApi.markArticleRead).toHaveBeenCalledWith('a1', true)
    })

    it('should mark article as unread', async () => {
      const articles: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Art', link: '', read: true, created_at: '' },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(articles)
      vi.mocked(RssApi.markArticleRead).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadArticles('f1') })
      await act(async () => { await result.current.markArticleRead('a1', false) })

      expect(result.current.articles[0].read).toBe(false)
      expect(RssApi.markArticleRead).toHaveBeenCalledWith('a1', false)
    })

    it('should not go below 0 for unread count', async () => {
      const feeds: FeedWithUnreadCount[] = [
        { feed: { id: 'f1', url: '', title: 'Feed', created_at: '', updated_at: '' }, unread_count: 0 },
      ]
      const articles: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Art', link: '', read: false, created_at: '' },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(articles)
      vi.mocked(RssApi.getFeeds).mockResolvedValue(feeds)
      vi.mocked(RssApi.markArticleRead).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadFeeds() })
      await act(async () => { await result.current.loadArticles('f1') })
      await act(async () => { await result.current.markArticleRead('a1', true) })

      expect(result.current.feeds[0].unread_count).toBe(0)
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.markArticleRead).mockRejectedValue(new Error('Mark failed'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.markArticleRead('a1', true)
      })

      expect(result.current.error).toBe('Mark failed')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.markArticleRead).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.markArticleRead('a1', true)
      })

      expect(result.current.error).toBe('Failed to mark article')
    })
  })

  describe('markAllRead', () => {
    it('should mark all articles in feed as read', async () => {
      const articles: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Art 1', link: '', read: false, created_at: '' },
        { id: 'a2', feed_id: 'f1', title: 'Art 2', link: '', read: false, created_at: '' },
      ]
      const feeds: FeedWithUnreadCount[] = [
        { feed: { id: 'f1', url: '', title: 'Feed', created_at: '', updated_at: '' }, unread_count: 2 },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(articles)
      vi.mocked(RssApi.getFeeds).mockResolvedValue(feeds)
      vi.mocked(RssApi.markAllRead).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadFeeds() })
      await act(async () => { await result.current.loadArticles('f1') })
      await act(async () => { await result.current.markAllRead('f1') })

      expect(result.current.articles.every(a => a.read)).toBe(true)
      expect(result.current.feeds[0].unread_count).toBe(0)
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.markAllRead).mockRejectedValue(new Error('Mark all failed'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.markAllRead('f1')
      })

      expect(result.current.error).toBe('Mark all failed')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.markAllRead).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.markAllRead('f1')
      })

      expect(result.current.error).toBe('Failed to mark all read')
    })
  })

  describe('openLink', () => {
    it('should call openLink API', async () => {
      vi.mocked(RssApi.openLink).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.openLink('https://example.com')
      })

      expect(RssApi.openLink).toHaveBeenCalledWith('https://example.com')
    })

    it('should set error on failure', async () => {
      vi.mocked(RssApi.openLink).mockRejectedValue(new Error('Open failed'))

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.openLink('https://example.com')
      })

      expect(result.current.error).toBe('Open failed')
    })

    it('should set generic error for non-Error throws', async () => {
      vi.mocked(RssApi.openLink).mockRejectedValue('unknown')

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        await result.current.openLink('https://example.com')
      })

      expect(result.current.error).toBe('Failed to open link')
    })
  })

  describe('getGlobalUnreadCount', () => {
    it('should sum unread counts from all feeds', async () => {
      const feeds: FeedWithUnreadCount[] = [
        { feed: { id: 'f1', url: '', title: 'A', created_at: '', updated_at: '' }, unread_count: 3 },
        { feed: { id: 'f2', url: '', title: 'B', created_at: '', updated_at: '' }, unread_count: 5 },
      ]
      vi.mocked(RssApi.getFeeds).mockResolvedValue(feeds)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadFeeds() })

      expect(result.current.getGlobalUnreadCount()).toBe(8)
    })
  })

  describe('updateArticleInList', () => {
    it('should update article in the list', async () => {
      const articles: Article[] = [
        { id: 'a1', feed_id: 'f1', title: 'Original', link: '', read: false, created_at: '' },
      ]
      vi.mocked(RssApi.getArticles).mockResolvedValue(articles)

      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => { await result.current.loadArticles() })

      const updated: Article = { ...articles[0], title: 'Updated', ai_summary: 'Summary' }
      act(() => {
        result.current.updateArticleInList(updated)
      })

      expect(result.current.articles[0].title).toBe('Updated')
      expect(result.current.articles[0].ai_summary).toBe('Summary')
    })
  })

  describe('event listeners', () => {
    it('should update feeds when feed-refreshed event fires with existing feed', async () => {
      const initialFeeds: FeedWithUnreadCount[] = [
        { feed: { id: 'f1', url: '', title: 'Old Title', created_at: '', updated_at: '' }, unread_count: 0 },
      ]
      vi.mocked(RssApi.getFeeds).mockResolvedValue(initialFeeds)
      vi.mocked(RssApi.getArticles).mockResolvedValue([])

      const { result } = renderHook(() => useRss(), { wrapper })
      await act(async () => { await result.current.loadFeeds() })

      // Simulate feed-refreshed event
      const updatedFeed: FeedWithUnreadCount = {
        feed: { id: 'f1', url: '', title: 'Updated Title', created_at: '', updated_at: '' },
        unread_count: 5,
      }

      await act(async () => {
        eventListeners['feed-refreshed']?.({
          payload: { feed: updatedFeed, new_article_count: 0 },
        })
      })

      expect(result.current.feeds[0].feed.title).toBe('Updated Title')
      expect(result.current.feeds[0].unread_count).toBe(5)
    })

    it('should add new feed when feed-refreshed event fires with unknown feed', async () => {
      vi.mocked(RssApi.getFeeds).mockResolvedValue([])
      vi.mocked(RssApi.getArticles).mockResolvedValue([])

      const { result } = renderHook(() => useRss(), { wrapper })
      await act(async () => { await result.current.loadFeeds() })

      const newFeed: FeedWithUnreadCount = {
        feed: { id: 'f-new', url: '', title: 'New Feed', created_at: '', updated_at: '' },
        unread_count: 3,
      }

      await act(async () => {
        eventListeners['feed-refreshed']?.({
          payload: { feed: newFeed, new_article_count: 0 },
        })
      })

      expect(result.current.feeds).toHaveLength(1)
      expect(result.current.feeds[0].feed.id).toBe('f-new')
    })

    it('should update refresh progress on feed-refresh-progress started event', async () => {
      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        eventListeners['feed-refresh-progress']?.({
          payload: {
            feed_id: 'f1',
            feed_title: 'Feed 1',
            status: 'started',
            current: 0,
            total: 3,
          },
        })
      })

      expect(result.current.refreshProgress.isRefreshing).toBe(true)
      expect(result.current.refreshProgress.total).toBe(3)
      expect(result.current.refreshingFeedIds.has('f1')).toBe(true)
    })

    it('should update refresh progress on feed-refresh-progress completed event', async () => {
      const { result } = renderHook(() => useRss(), { wrapper })

      // First start
      await act(async () => {
        eventListeners['feed-refresh-progress']?.({
          payload: { feed_id: 'f1', feed_title: 'Feed 1', status: 'started', current: 0, total: 2 },
        })
      })

      // Then complete
      await act(async () => {
        eventListeners['feed-refresh-progress']?.({
          payload: { feed_id: 'f1', feed_title: 'Feed 1', status: 'completed', current: 1, total: 2 },
        })
      })

      expect(result.current.refreshProgress.current).toBe(1)
      expect(result.current.refreshingFeedIds.has('f1')).toBe(false)
    })

    it('should update refresh progress on feed-refresh-progress failed event', async () => {
      const { result } = renderHook(() => useRss(), { wrapper })

      await act(async () => {
        eventListeners['feed-refresh-progress']?.({
          payload: { feed_id: 'f1', feed_title: 'Feed 1', status: 'started', current: 0, total: 2 },
        })
      })

      await act(async () => {
        eventListeners['feed-refresh-progress']?.({
          payload: { feed_id: 'f1', feed_title: 'Feed 1', status: 'failed', current: 1, total: 2 },
        })
      })

      expect(result.current.refreshingFeedIds.has('f1')).toBe(false)
    })

    it('should reset refresh progress on feed-refresh-all-done event', async () => {
      const { result } = renderHook(() => useRss(), { wrapper })

      // Start refreshing
      await act(async () => {
        eventListeners['feed-refresh-progress']?.({
          payload: { feed_id: 'f1', feed_title: 'Feed 1', status: 'started', current: 0, total: 1 },
        })
      })

      expect(result.current.refreshProgress.isRefreshing).toBe(true)

      // All done
      await act(async () => {
        eventListeners['feed-refresh-all-done']?.({ payload: 0 })
      })

      expect(result.current.refreshProgress.isRefreshing).toBe(false)
    })

    it('should merge articles when feed-refreshed has new articles for selected feed', async () => {
      vi.mocked(RssApi.getArticles).mockResolvedValue([
        { id: 'a1', feed_id: 'f1', title: 'Art 1', link: '', read: false, created_at: '' },
      ])
      vi.mocked(RssApi.getFeeds).mockResolvedValue([
        { feed: { id: 'f1', url: '', title: 'Feed', created_at: '', updated_at: '' }, unread_count: 1 },
      ])

      const { result } = renderHook(() => useRss(), { wrapper })
      await act(async () => { await result.current.loadFeeds() })
      act(() => { result.current.selectFeed('f1') })

      const updatedFeed: FeedWithUnreadCount = {
        feed: { id: 'f1', url: '', title: 'Feed', created_at: '', updated_at: '' },
        unread_count: 2,
      }

      // Simulate new articles arriving
      vi.mocked(RssApi.getArticles).mockResolvedValue([
        { id: 'a1', feed_id: 'f1', title: 'Art 1', link: '', read: false, created_at: '' },
        { id: 'a2', feed_id: 'f1', title: 'Art 2', link: '', read: false, created_at: '' },
      ])

      await act(async () => {
        eventListeners['feed-refreshed']?.({
          payload: { feed: updatedFeed, new_article_count: 1 },
        })
      })

      // Wait for debounced merge
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600))
      })

      await waitFor(() => {
        expect(result.current.articles.length).toBeGreaterThanOrEqual(1)
      })
    })
  })
})
