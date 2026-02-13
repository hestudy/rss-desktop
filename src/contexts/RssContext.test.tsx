import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { RssProvider, useRss } from './RssContext'
import { RssApi } from '../lib/api'
import type { ReactNode } from 'react'

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
})
