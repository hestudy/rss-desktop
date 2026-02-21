import { useEffect, useRef, useState, useCallback } from 'react'
import { useLayout } from '@/contexts/LayoutContext'
import { useRss } from '@/contexts/RssContext'
import { useReader } from '@/contexts/ReaderContext'
import { useUnifiedSettings } from '@/components/settings/UnifiedSettings'
import { FeedList } from '@/components/feeds/FeedList'
import { ArticleList } from '@/components/articles/ArticleList'
import { ArticleViewer } from '@/components/articles/ArticleViewer'
import { EmptyReaderPlaceholder } from '@/components/articles/EmptyReaderPlaceholder'
import { DiscoverPanel } from '@/components/discover'
import { MobileLayout } from './MobileLayout'
import { MobileFeedList } from '@/components/mobile/MobileFeedList'
import { MobileArticleList } from '@/components/mobile/MobileArticleList'
import { MobileArticleViewer } from '@/components/mobile/MobileArticleViewer'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { UpdateBanner } from '@/components/ui/UpdateBanner'
import { ChangelogDialog } from '@/components/ui/ChangelogDialog'
import { Group, Panel, type Layout, useGroupRef } from 'react-resizable-panels'
import { invoke } from '@tauri-apps/api/core'
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation'
import { useAutoUpdater } from '@/hooks/useAutoUpdater'

const STORAGE_KEY = 'panel-layout-v2'
const DISCOVER_LAYOUT_STORAGE_KEY = 'discover-layout-v1'

// Three-panel default sizes (percentage)
const DEFAULT_SIDEBAR_SIZE = 15
const DEFAULT_ARTICLE_LIST_SIZE = 30
const DEFAULT_READER_SIZE = 55

// Two-panel discover mode default sizes
const DEFAULT_DISCOVER_SIDEBAR_SIZE = 20
const DEFAULT_DISCOVER_PANEL_SIZE = 80

// Panel constraints
const MIN_SIDEBAR_PERCENT = 12
const MAX_SIDEBAR_PERCENT = 25
const MIN_ARTICLE_LIST_PERCENT = 20
const MAX_ARTICLE_LIST_PERCENT = 45
const MIN_READER_SIZE = 200 // px

// Discover mode panel constraints
const MIN_DISCOVER_SIDEBAR_PERCENT = 15
const MAX_DISCOVER_SIDEBAR_PERCENT = 35

interface ThreePanelLayout {
  sidebar: number
  articleList: number
  reader: number
}

/**
 * Mobile content view component
 * Renders the appropriate content based on mobileView state
 */
function MobileContentView() {
  const { mobileView, goBack, navigateToArticleList, navigateToReader } = useLayout()
  const {
    articles,
    feeds,
    selectedFeedId,
    isLoading,
    selectFeedAndLoad,
    refreshAllFeeds,
    markArticleRead,
    selectDiscover,
  } = useRss()
  const { selectedArticleId, selectArticle } = useReader()

  // Get current selected article
  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null
  const currentIndex = selectedArticle ? articles.findIndex(a => a.id === selectedArticle.id) : -1
  const hasNext = currentIndex >= 0 && currentIndex < articles.length - 1
  const hasPrevious = currentIndex > 0

  // Build unread counts map for feeds
  const unreadCounts = feeds.reduce((acc, feedWithCount) => {
    acc[feedWithCount.feed.id] = feedWithCount.unread_count
    return acc
  }, {} as Record<string, number>)

  // Extract feed objects from FeedWithUnreadCount
  const feedList = feeds.map(f => f.feed)

  // Handle feed click
  const handleFeedClick = useCallback(
    async (feed: { id: string }) => {
      await selectFeedAndLoad(feed.id)
      navigateToArticleList(feed.id)
    },
    [selectFeedAndLoad, navigateToArticleList]
  )

  // Handle article click
  const handleArticleClick = useCallback(
    (article: { id: string }) => {
      selectArticle(article.id)
      navigateToReader(article.id)
    },
    [selectArticle, navigateToReader]
  )

  // Handle next/previous navigation
  const handleNext = useCallback(() => {
    if (hasNext) {
      selectArticle(articles[currentIndex + 1].id)
    }
  }, [hasNext, currentIndex, articles, selectArticle])

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      selectArticle(articles[currentIndex - 1].id)
    }
  }, [hasPrevious, currentIndex, articles, selectArticle])

  // Handle article refresh
  const handleArticleRefresh = useCallback(async () => {
    if (selectedFeedId) {
      await selectFeedAndLoad(selectedFeedId)
    }
  }, [selectedFeedId, selectFeedAndLoad])

  // Render content based on mobileView
  switch (mobileView) {
    case 'feed-list':
      return (
        <MobileFeedList
          feeds={feedList}
          selectedFeedId={selectedFeedId}
          onFeedClick={handleFeedClick}
          onRefresh={refreshAllFeeds}
          onAddFeed={selectDiscover}
          unreadCounts={unreadCounts}
          isLoading={isLoading}
        />
      )
    case 'article-list':
      return (
        <MobileArticleList
          articles={articles}
          selectedArticleId={selectedArticleId}
          onArticleClick={handleArticleClick}
          onRefresh={handleArticleRefresh}
          onBack={goBack}
          isLoading={isLoading}
          onMarkRead={(articleId) => markArticleRead(articleId, true)}
        />
      )
    case 'article-reader':
      return (
        <MobileArticleViewer
          article={selectedArticle}
          onBack={goBack}
          isLoading={isLoading}
          onPrevious={hasPrevious ? handlePrevious : undefined}
          onNext={hasNext ? handleNext : undefined}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
      )
    case 'discover':
      return <MobileDiscoverView />
    case 'settings':
      return <MobileSettingsView />
    default:
      return (
        <MobileFeedList
          feeds={feedList}
          selectedFeedId={selectedFeedId}
          onFeedClick={handleFeedClick}
          onRefresh={refreshAllFeeds}
          onAddFeed={selectDiscover}
          unreadCounts={unreadCounts}
          isLoading={isLoading}
        />
      )
  }
}

/**
 * Mobile discover view
 */
function MobileDiscoverView() {
  const { feeds, addFeed, exitDiscover } = useRss()

  return (
    <div className="h-full" data-testid="mobile-discover-view">
      <DiscoverPanel
        existingFeeds={feeds}
        onAddFeed={async (url, useFullContent, useAiSummary, useAiTranslation) => {
          await addFeed(url, useFullContent, useAiSummary, useAiTranslation)
          exitDiscover()
        }}
        onClose={exitDiscover}
      />
    </div>
  )
}

/**
 * Mobile settings view
 * Renders settings content directly for mobile layout
 */
function MobileSettingsView() {
  const { closeSettings } = useUnifiedSettings()

  return (
    <div data-testid="settings-view" className="h-full overflow-y-auto bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-lg font-semibold">Settings</h1>
        <button
          onClick={closeSettings}
          className="p-2 rounded-md hover:bg-muted"
          aria-label="Close settings"
        >
          Close
        </button>
      </div>
      <div className="p-4">
        <p className="text-muted-foreground">Settings content will be rendered here.</p>
      </div>
    </div>
  )
}

/**
 * Desktop three-panel layout
 */
function DesktopLayout() {
  const { loadFeeds, silentRefreshAll, articles, selectFeedAndLoad, showDiscover, feeds, addFeed, exitDiscover } = useRss()
  const { selectedArticleId, selectArticle, readerSettings } = useReader()
  const groupRef = useGroupRef()
  const discoverGroupRef = useGroupRef()
  const initialRefreshDone = useRef(false)

  // Auto updater
  const autoUpdater = useAutoUpdater()

  // Changelog dialog state
  const [changelogOpen, setChangelogOpen] = useState(false)

  // Notification navigation
  useNotificationNavigation(selectFeedAndLoad)

  // Get current selected article
  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null
  const currentIndex = selectedArticle ? articles.findIndex(a => a.id === selectedArticle.id) : -1
  const hasNext = currentIndex >= 0 && currentIndex < articles.length - 1
  const hasPrevious = currentIndex > 0

  const handleNext = () => {
    if (hasNext) {
      selectArticle(articles[currentIndex + 1].id)
    }
  }

  const handlePrevious = () => {
    if (hasPrevious) {
      selectArticle(articles[currentIndex - 1].id)
    }
  }

  useEffect(() => {
    let cancelled = false

    loadFeeds().then(() => {
      if (!cancelled && !initialRefreshDone.current) {
        initialRefreshDone.current = true
        silentRefreshAll()
      }
    })

    // Load panel layout from Tauri storage
    invoke('get_store_value', { key: STORAGE_KEY })
      .then((value: unknown) => {
        if (cancelled) return

        let layout: ThreePanelLayout | null = null

        if (value && typeof value === 'object') {
          const record = value as Record<string, unknown>
          const sidebar = typeof record.sidebar === 'number' ? record.sidebar : null
          const articleList = typeof record.articleList === 'number' ? record.articleList : null
          const reader = typeof record.reader === 'number' ? record.reader : null

          if (
            sidebar !== null &&
            articleList !== null &&
            reader !== null &&
            sidebar >= MIN_SIDEBAR_PERCENT &&
            sidebar <= MAX_SIDEBAR_PERCENT &&
            articleList >= MIN_ARTICLE_LIST_PERCENT &&
            articleList <= MAX_ARTICLE_LIST_PERCENT
          ) {
            layout = { sidebar, articleList, reader }
          }
        }

        if (layout && !cancelled && groupRef.current) {
          groupRef.current.setLayout({
            'sidebar-panel': layout.sidebar,
            'article-list-panel': layout.articleList,
            'reader-panel': layout.reader,
          })
        }
      })
      .catch(() => {
        // Use default layout when storage fails
      })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFeeds, groupRef])

  // Load discover mode layout
  useEffect(() => {
    if (!showDiscover) return

    let cancelled = false

    invoke('get_store_value', { key: DISCOVER_LAYOUT_STORAGE_KEY })
      .then((value: unknown) => {
        if (cancelled || !discoverGroupRef.current) return

        if (value && typeof value === 'object') {
          const record = value as Record<string, unknown>
          const sidebar = typeof record.sidebar === 'number' ? record.sidebar : null

          if (
            sidebar !== null &&
            sidebar >= MIN_DISCOVER_SIDEBAR_PERCENT &&
            sidebar <= MAX_DISCOVER_SIDEBAR_PERCENT
          ) {
            discoverGroupRef.current.setLayout({
              'discover-sidebar-panel': sidebar,
              'discover-content-panel': 100 - sidebar,
            })
          }
        }
      })
      .catch(() => {
        // Use default layout when storage fails
      })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDiscover])

  const handleLayoutChange = (newLayout: Layout) => {
    const sidebar = newLayout['sidebar-panel']
    const articleList = newLayout['article-list-panel']
    const reader = newLayout['reader-panel']

    if (
      typeof sidebar === 'number' &&
      typeof articleList === 'number' &&
      typeof reader === 'number' &&
      sidebar >= MIN_SIDEBAR_PERCENT &&
      sidebar <= MAX_SIDEBAR_PERCENT &&
      articleList >= MIN_ARTICLE_LIST_PERCENT &&
      articleList <= MAX_ARTICLE_LIST_PERCENT
    ) {
      invoke('set_store_value', {
        key: STORAGE_KEY,
        value: { sidebar, articleList, reader },
      }).catch(() => {
        // Silently ignore storage errors
      })
    }
  }

  const handleDiscoverLayoutChange = (newLayout: Layout) => {
    const sidebar = newLayout['discover-sidebar-panel']

    if (
      typeof sidebar === 'number' &&
      sidebar >= MIN_DISCOVER_SIDEBAR_PERCENT &&
      sidebar <= MAX_DISCOVER_SIDEBAR_PERCENT
    ) {
      invoke('set_store_value', {
        key: DISCOVER_LAYOUT_STORAGE_KEY,
        value: { sidebar, discoverPanel: 100 - sidebar },
      }).catch(() => {
        // Silently ignore storage errors
      })
    }
  }

  // Discover mode two-panel layout
  if (showDiscover) {
    return (
      <div className="flex flex-col h-screen">
        {/* Update banner */}
        {autoUpdater.updateInfo && (
          <UpdateBanner
            version={autoUpdater.updateInfo.version}
            onDownload={autoUpdater.downloadAndInstall}
            onDismiss={autoUpdater.dismissUpdate}
            onViewChangelog={() => setChangelogOpen(true)}
          />
        )}

        {/* Changelog dialog */}
        {autoUpdater.updateInfo && (
          <ChangelogDialog
            open={changelogOpen}
            onOpenChange={setChangelogOpen}
            version={autoUpdater.updateInfo.version}
            content={autoUpdater.updateInfo.body || ''}
            publishedAt={autoUpdater.updateInfo.date?.toLocaleDateString()}
          />
        )}

        {/* Discover mode two-panel layout */}
        <div data-testid="discover-layout" className="flex-1">
          <Group
            groupRef={discoverGroupRef}
            orientation="horizontal"
            className="h-full"
            defaultLayout={{
              'discover-sidebar-panel': DEFAULT_DISCOVER_SIDEBAR_SIZE,
              'discover-content-panel': DEFAULT_DISCOVER_PANEL_SIZE,
            }}
            onLayoutChange={handleDiscoverLayoutChange}
          >
            {/* Left feed list */}
            <Panel
              id="discover-sidebar-panel"
              minSize={`${MIN_DISCOVER_SIDEBAR_PERCENT}%`}
              maxSize={`${MAX_DISCOVER_SIDEBAR_PERCENT}%`}
              defaultSize={`${DEFAULT_DISCOVER_SIDEBAR_SIZE}%`}
            >
              <div data-testid="feed-panel-content" className="h-full">
                <FeedList />
              </div>
            </Panel>

            {/* Resize handle */}
            <ResizeHandle id="discover-resize-handle" />

            {/* Right discover panel */}
            <Panel
              id="discover-content-panel"
              defaultSize={`${DEFAULT_DISCOVER_PANEL_SIZE}%`}
            >
              <div data-testid="discover-panel-content" className="h-full">
                <DiscoverPanel
                  existingFeeds={feeds}
                  onAddFeed={async (url, useFullContent, useAiSummary, useAiTranslation) => {
                    await addFeed(url, useFullContent, useAiSummary, useAiTranslation)
                    exitDiscover()
                  }}
                  onClose={exitDiscover}
                />
              </div>
            </Panel>
          </Group>
        </div>
      </div>
    )
  }

  // Normal three-panel layout
  return (
    <div className="flex flex-col h-screen">
      {/* Update banner */}
      {autoUpdater.updateInfo && (
        <UpdateBanner
          version={autoUpdater.updateInfo.version}
          onDownload={autoUpdater.downloadAndInstall}
          onDismiss={autoUpdater.dismissUpdate}
          onViewChangelog={() => setChangelogOpen(true)}
        />
      )}

      {/* Changelog dialog */}
      {autoUpdater.updateInfo && (
        <ChangelogDialog
          open={changelogOpen}
          onOpenChange={setChangelogOpen}
          version={autoUpdater.updateInfo.version}
          content={autoUpdater.updateInfo.body || ''}
          publishedAt={autoUpdater.updateInfo.date?.toLocaleDateString()}
        />
      )}

      {/* Main content area */}
      <Group
        groupRef={groupRef}
        data-testid="resizable-layout"
        orientation="horizontal"
        className="flex-1"
        defaultLayout={{
          'sidebar-panel': DEFAULT_SIDEBAR_SIZE,
          'article-list-panel': DEFAULT_ARTICLE_LIST_SIZE,
          'reader-panel': DEFAULT_READER_SIZE,
        }}
        onLayoutChange={handleLayoutChange}
      >
        {/* Left feed list */}
        <Panel
          id="sidebar-panel"
          minSize={`${MIN_SIDEBAR_PERCENT}%`}
          maxSize={`${MAX_SIDEBAR_PERCENT}%`}
          defaultSize={`${DEFAULT_SIDEBAR_SIZE}%`}
        >
          <div data-testid="feed-panel-content" className="h-full">
            <FeedList />
          </div>
        </Panel>

        {/* Resize handle */}
        <ResizeHandle id="resize-handle-1" />

        {/* Middle article list */}
        <Panel
          id="article-list-panel"
          minSize={`${MIN_ARTICLE_LIST_PERCENT}%`}
          maxSize={`${MAX_ARTICLE_LIST_PERCENT}%`}
          defaultSize={`${DEFAULT_ARTICLE_LIST_SIZE}%`}
        >
          <div data-testid="article-list-panel-content" className="h-full">
            <ArticleList />
          </div>
        </Panel>

        {/* Resize handle */}
        <ResizeHandle id="resize-handle-2" />

        {/* Right reader */}
        <Panel
          id="reader-panel"
          minSize={MIN_READER_SIZE}
          defaultSize={`${DEFAULT_READER_SIZE}%`}
        >
          <div data-testid="reader-panel-content" className="h-full">
            {selectedArticle ? (
              <ArticleViewer
                key={selectedArticle.id}
                article={selectedArticle}
                articles={articles}
                onNext={handleNext}
                onPrevious={handlePrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                readerSettings={readerSettings}
              />
            ) : (
              <EmptyReaderPlaceholder />
            )}
          </div>
        </Panel>
      </Group>
    </div>
  )
}

interface ResponsiveLayoutProps {
  children?: React.ReactNode
}

/**
 * ResponsiveLayout Component
 *
 * Chooses between desktop and mobile layout based on platform detection.
 * - Desktop: Three-panel resizable layout with sidebar, article list, and reader
 * - Mobile: Single-column layout with bottom navigation and view switching
 */
export function ResponsiveLayout(_props?: ResponsiveLayoutProps) {
  const { isMobileLayout, mobileView } = useLayout()
  const { showDiscover, selectDiscover, exitDiscover } = useRss()

  // Sync showDiscover with mobileView
  useEffect(() => {
    if (isMobileLayout) {
      if (mobileView === 'discover' && !showDiscover) {
        selectDiscover()
      } else if (mobileView !== 'discover' && showDiscover) {
        exitDiscover()
      }
    }
  }, [isMobileLayout, mobileView, showDiscover, selectDiscover, exitDiscover])

  // Mobile layout
  if (isMobileLayout) {
    return (
      <MobileLayout>
        <MobileContentView />
      </MobileLayout>
    )
  }

  // Desktop layout
  return <DesktopLayout />
}
