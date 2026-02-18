import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { listen } from '@tauri-apps/api/event'
import type { Feed, Article, FeedWithUnreadCount, FeedRefreshedEvent, FeedRefreshProgressEvent, RefreshProgress } from '../types'
import { RssApi } from '../lib/api'
import { mergeArticles } from '../lib/mergeArticles'

interface RssContextType {
  feeds: FeedWithUnreadCount[]
  articles: Article[]
  selectedFeedId: string | null
  isLoading: boolean
  error: string | null
  showFavoritesOnly: boolean
  showDiscover: boolean
  refreshProgress: RefreshProgress
  refreshingFeedIds: Set<string>
  loadFeeds: () => Promise<void>
  loadArticles: (feedId?: string) => Promise<void>
  addFeed: (url: string, useFullContent?: boolean, useAiSummary?: boolean, useAiTranslation?: boolean) => Promise<Feed>
  removeFeed: (id: string) => Promise<void>
  updateFeed: (id: string, title?: string, url?: string, useFullContent?: boolean, useAiSummary?: boolean, useAiTranslation?: boolean) => Promise<void>
  refreshFeed: (id: string) => Promise<void>
  refreshAllFeeds: () => Promise<void>
  silentRefreshAll: () => Promise<void>
  selectFeed: (id: string | null) => void
  selectFeedAndLoad: (feedId: string) => Promise<void>
  selectFavorites: () => void
  selectDiscover: () => void
  exitDiscover: () => void
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
  const [refreshProgress, setRefreshProgress] = useState<RefreshProgress>({
    isRefreshing: false,
    current: 0,
    total: 0,
    currentFeedTitle: '',
  })
  const [refreshingFeedIds, setRefreshingFeedIds] = useState<Set<string>>(new Set())
  const [showDiscover, setShowDiscover] = useState(false)

  const selectedFeedIdRef = useRef(selectedFeedId)
  selectedFeedIdRef.current = selectedFeedId

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

  // 增量刷新：合并新文章到现有列表，不触发 loading 状态
  const refreshArticlesMerge = useCallback(async (feedId?: string) => {
    try {
      const data = await RssApi.getArticles({
        feed_id: feedId,
        limit: 100,
      })
      setArticles(prev => mergeArticles(prev, data))
    } catch {
      // 增量刷新失败静默处理，不影响用户体验
    }
  }, [])

  // 监听后端 feed-refreshed 和 feed-refresh-progress 事件
  useEffect(() => {
    const unlisteners: (() => void)[] = []
    let reloadTimer: ReturnType<typeof setTimeout> | null = null

    const debouncedMergeArticles = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        const currentFeedId = selectedFeedIdRef.current
        refreshArticlesMerge(currentFeedId || undefined)
      }, 500)
    }

    listen<FeedRefreshedEvent>('feed-refreshed', (event) => {
      const { feed, new_article_count } = event.payload
      setFeeds(prev => {
        const exists = prev.some(f => f.feed.id === feed.feed.id)
        if (exists) {
          return prev.map(f => f.feed.id === feed.feed.id ? feed : f)
        }
        return [...prev, feed]
      })
      if (new_article_count > 0) {
        const currentFeedId = selectedFeedIdRef.current
        if (currentFeedId === feed.feed.id || currentFeedId === null) {
          debouncedMergeArticles()
        }
      }
    }).then(fn => unlisteners.push(fn))

    listen<FeedRefreshProgressEvent>('feed-refresh-progress', (event) => {
      const { feed_id, feed_title, status, current, total } = event.payload
      if (status === 'started') {
        setRefreshingFeedIds(prev => new Set(prev).add(feed_id))
        setRefreshProgress(prev => ({
          isRefreshing: true,
          current: prev.current,
          total,
          currentFeedTitle: feed_title,
        }))
      } else if (status === 'completed' || status === 'failed') {
        setRefreshingFeedIds(prev => {
          const next = new Set(prev)
          next.delete(feed_id)
          return next
        })
        setRefreshProgress({
          isRefreshing: true,
          current,
          total,
          currentFeedTitle: feed_title,
        })
      }
    }).then(fn => unlisteners.push(fn))

    listen<number>('feed-refresh-all-done', () => {
      setRefreshProgress(prev => ({
        ...prev,
        isRefreshing: false,
        currentFeedTitle: '',
      }))
    }).then(fn => unlisteners.push(fn))

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      unlisteners.forEach(fn => fn())
    }
  }, [refreshArticlesMerge])

  const addFeed = useCallback(async (url: string, useFullContent?: boolean, useAiSummary?: boolean, useAiTranslation?: boolean) => {
    setIsLoading(true)
    setError(null)
    try {
      const feed = await RssApi.addFeed(url, useFullContent, useAiSummary, useAiTranslation)
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

  const updateFeed = useCallback(async (id: string, title?: string, url?: string, useFullContent?: boolean, useAiSummary?: boolean, useAiTranslation?: boolean) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await RssApi.updateFeed(id, title, url, useFullContent, useAiSummary, useAiTranslation)
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
    setRefreshingFeedIds(prev => new Set(prev).add(id))
    try {
      const result = await RssApi.refreshFeed(id)
      // 更新订阅列表中的该项
      setFeeds(prev => prev.map(f =>
        f.feed.id === id ? result : f
      ))
      // 如果是当前选中的订阅，增量合并文章
      if (selectedFeedId === id) {
        await refreshArticlesMerge(id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh feed')
      throw err
    } finally {
      setRefreshingFeedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setIsLoading(false)
    }
  }, [refreshArticlesMerge, selectedFeedId])

  const refreshAllFeeds = useCallback(async () => {
    setError(null)
    setRefreshProgress({ isRefreshing: true, current: 0, total: 0, currentFeedTitle: '' })
    try {
      await RssApi.refreshAllFeeds()
      // 后端立即返回，实际刷新通过事件增量更新
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh feeds')
      setRefreshProgress(prev => ({ ...prev, isRefreshing: false }))
      throw err
    }
  }, [])

  const silentRefreshAll = useCallback(async () => {
    try {
      await RssApi.refreshAllFeeds()
      // 后端立即返回，实际刷新通过事件增量更新
    } catch {
      // 静默刷新失败不影响用户体验
    }
  }, [])

  const selectFeed = useCallback((id: string | null) => {
    setSelectedFeedId(id)
    setShowFavoritesOnly(false)
    setShowDiscover(false)
    loadArticles(id || undefined)
  }, [loadArticles])

  const selectFeedAndLoad = useCallback(async (feedId: string) => {
    setSelectedFeedId(feedId)
    setShowFavoritesOnly(false)
    await loadArticles(feedId)
  }, [loadArticles])

  const selectFavorites = useCallback(async () => {
    setSelectedFeedId(null)
    setShowFavoritesOnly(true)
    setShowDiscover(false)
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

  const selectDiscover = useCallback(() => {
    setSelectedFeedId(null)
    setShowFavoritesOnly(false)
    setShowDiscover(true)
  }, [])

  const exitDiscover = useCallback(() => {
    setShowDiscover(false)
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
    showDiscover,
    refreshProgress,
    refreshingFeedIds,
    loadFeeds,
    loadArticles,
    addFeed,
    removeFeed,
    updateFeed,
    refreshFeed,
    refreshAllFeeds,
    silentRefreshAll,
    selectFeed,
    selectFeedAndLoad,
    selectFavorites,
    selectDiscover,
    exitDiscover,
    markArticleRead,
    markAllRead,
    openLink,
    getGlobalUnreadCount,
    updateArticleInList,
  }

  return <RssContext.Provider value={value}>{children}</RssContext.Provider>
}
