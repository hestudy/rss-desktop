import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { Feed, Article, FeedWithUnreadCount } from '../types'
import { RssApi } from '../lib/api'

interface RssContextType {
  feeds: FeedWithUnreadCount[]
  articles: Article[]
  selectedFeedId: string | null
  isLoading: boolean
  error: string | null
  loadFeeds: () => Promise<void>
  loadArticles: (feedId?: string) => Promise<void>
  addFeed: (url: string) => Promise<Feed>
  removeFeed: (id: string) => Promise<void>
  refreshFeed: (id: string) => Promise<void>
  refreshAllFeeds: () => Promise<void>
  selectFeed: (id: string | null) => void
  markArticleRead: (id: string, read: boolean) => Promise<void>
  markAllRead: (feedId: string) => Promise<void>
  openLink: (url: string) => Promise<void>
  getGlobalUnreadCount: () => number
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

  const selectFeed = useCallback((id: string | null) => {
    setSelectedFeedId(id)
    if (id) {
      loadArticles(id)
    } else {
      setArticles([])
    }
  }, [loadArticles])

  const markArticleRead = useCallback(async (id: string, read: boolean) => {
    try {
      await RssApi.markArticleRead(id, read)
      // 更新文章状态
      setArticles(prev => prev.map(a =>
        a.id === id ? { ...a, read } : a
      ))
      // 重新加载订阅列表以更新未读计数
      await loadFeeds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark article')
    }
  }, [loadFeeds])

  const markAllRead = useCallback(async (feedId: string) => {
    try {
      await RssApi.markAllRead(feedId)
      // 更新文章状态
      setArticles(prev => prev.map(a =>
        a.feed_id === feedId ? { ...a, read: true } : a
      ))
      // 重新加载订阅列表以更新未读计数
      await loadFeeds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all read')
    }
  }, [loadFeeds])

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

  const value: RssContextType = {
    feeds,
    articles,
    selectedFeedId,
    isLoading,
    error,
    loadFeeds,
    loadArticles,
    addFeed,
    removeFeed,
    refreshFeed,
    refreshAllFeeds,
    selectFeed,
    markArticleRead,
    markAllRead,
    openLink,
    getGlobalUnreadCount,
  }

  return <RssContext.Provider value={value}>{children}</RssContext.Provider>
}
