import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { Feed, Article, FeedWithUnreadCount } from '../types'
import { RssApi } from '../lib/api'

interface RssContextType {
  feeds: FeedWithUnreadCount[]
  articles: Article[]
  selectedFeedId: string | null
  isLoading: boolean
  error: string | null
  showFavoritesOnly: boolean
  loadFeeds: () => Promise<void>
  loadArticles: (feedId?: string) => Promise<void>
  addFeed: (url: string) => Promise<Feed>
  removeFeed: (id: string) => Promise<void>
  updateFeed: (id: string, title?: string, url?: string) => Promise<void>
  refreshFeed: (id: string) => Promise<void>
  refreshAllFeeds: () => Promise<void>
  silentRefreshAll: () => Promise<void>
  selectFeed: (id: string | null) => void
  selectFavorites: () => void
  markArticleRead: (id: string, read: boolean) => Promise<void>
  markAllRead: (feedId: string) => Promise<void>
  openLink: (url: string) => Promise<void>
  getGlobalUnreadCount: () => number
  updateArticleInList: (updated: Article) => void
}

const RssContext = createContext<RssContextType | undefined>(undefined)

export function useRss() {
  const context = useContext(RssContext)
  if (!context) {
    throw new Error('useRss must be used within RssProvider')
  }
  return context
}

interface RssProviderProps {
  children: ReactNode
}

export function RssProvider({ children }: RssProviderProps) {
  const [feeds, setFeeds] = useState<FeedWithUnreadCount[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const loadFeeds = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await RssApi.getFeeds()
      setFeeds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadArticles = useCallback(async (feedId?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await RssApi.getArticles({
        feed_id: feedId,
        limit: 100,
      })
      setArticles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addFeed = useCallback(async (url: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const feed = await RssApi.addFeed(url)
      // 重新加载订阅列表
      await loadFeeds()
      return feed
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add feed'
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadFeeds])

  const removeFeed = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await RssApi.removeFeed(id)
      // 如果删除的是当前选中的订阅，清空文章列表
      if (selectedFeedId === id) {
        setArticles([])
        setSelectedFeedId(null)
      }
      // 重新加载订阅列表
      await loadFeeds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove feed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadFeeds, selectedFeedId])

  const updateFeed = useCallback(async (id: string, title?: string, url?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await RssApi.updateFeed(id, title, url)
      setFeeds(prev => prev.map(f =>
        f.feed.id === id ? result : f
      ))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update feed'
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshFeed = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await RssApi.refreshFeed(id)
      // 更新订阅列表中的该项
      setFeeds(prev => prev.map(f =>
        f.feed.id === id ? result : f
      ))
      // 如果是当前选中的订阅，重新加载文章
      if (selectedFeedId === id) {
        await loadArticles(id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh feed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadArticles, selectedFeedId])

  const refreshAllFeeds = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const results = await RssApi.refreshAllFeeds()
      setFeeds(results)
      // 如果有选中的订阅，重新加载文章
      if (selectedFeedId) {
        await loadArticles(selectedFeedId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh feeds')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadArticles, selectedFeedId])

  const silentRefreshAll = useCallback(async () => {
    try {
      const results = await RssApi.refreshAllFeeds()
      setFeeds(results)
    } catch (err) {
      // 静默刷新失败不影响用户体验，仅记录日志
      console.warn('Silent refresh failed:', err instanceof Error ? err.message : err)
    }
  }, [])

  const selectFeed = useCallback((id: string | null) => {
    setSelectedFeedId(id)
    setShowFavoritesOnly(false)
    // 加载文章：指定订阅时加载该订阅的文章，否则加载全部文章
    loadArticles(id || undefined)
  }, [loadArticles])

  const selectFavorites = useCallback(async () => {
    setSelectedFeedId(null)
    setShowFavoritesOnly(true)
    setIsLoading(true)
    setError(null)
    try {
      const data = await RssApi.getFavoriteArticles(100)
      setArticles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markArticleRead = useCallback(async (id: string, read: boolean) => {
    try {
      await RssApi.markArticleRead(id, read)
      let feedId: string | undefined
      setArticles(prev => {
        const next = prev.map(a => {
          if (a.id === id) {
            feedId = a.feed_id
            return { ...a, read }
          }
          return a
        })
        return next
      })
      if (feedId) {
        const delta = read ? -1 : 1
        setFeeds(prev => prev.map(f =>
          f.feed.id === feedId
            ? { ...f, unread_count: Math.max(0, f.unread_count + delta) }
            : f
        ))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark article')
    }
  }, [])

  const markAllRead = useCallback(async (feedId: string) => {
    try {
      await RssApi.markAllRead(feedId)
      setArticles(prev => prev.map(a =>
        a.feed_id === feedId ? { ...a, read: true } : a
      ))
      setFeeds(prev => prev.map(f =>
        f.feed.id === feedId ? { ...f, unread_count: 0 } : f
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all read')
    }
  }, [])

  const openLink = useCallback(async (url: string) => {
    try {
      await RssApi.openLink(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open link')
    }
  }, [])

  const getGlobalUnreadCount = useCallback(() => {
    return feeds.reduce((sum, f) => sum + f.unread_count, 0)
  }, [feeds])

  const updateArticleInList = useCallback((updated: Article) => {
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a))
  }, [])

  const value: RssContextType = {
    feeds,
    articles,
    selectedFeedId,
    isLoading,
    error,
    showFavoritesOnly,
    loadFeeds,
    loadArticles,
    addFeed,
    removeFeed,
    updateFeed,
    refreshFeed,
    refreshAllFeeds,
    silentRefreshAll,
    selectFeed,
    selectFavorites,
    markArticleRead,
    markAllRead,
    openLink,
    getGlobalUnreadCount,
    updateArticleInList,
  }

  return <RssContext.Provider value={value}>{children}</RssContext.Provider>
}
