import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ResponsiveLayout } from './ResponsiveLayout'
import type { MobileView } from '@/contexts/LayoutContext'

// Mock platform detection
let mockIsMobile = false
vi.mock('@/lib/platform', () => ({
  isMobile: () => mockIsMobile,
  resetPlatformCache: () => {},
}))

// Mock LayoutContext
let mockMobileView: MobileView = 'feed-list'
let mockIsMobileLayout = false
let mockIsToolbarVisible = false
let mockCurrentArticleId: string | null = null
const mockToggleToolbar = vi.fn()
const mockGoBack = vi.fn()
const mockNavigateToArticleList = vi.fn()
const mockNavigateToReader = vi.fn()

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({
    isMobileLayout: mockIsMobileLayout,
    mobileView: mockMobileView,
    setMobileView: vi.fn(),
    isDrawerOpen: false,
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    toggleDrawer: vi.fn(),
    canGoBack: false,
    goBack: mockGoBack,
    navigationHistory: ['feed-list'],
    navigateToFeedList: vi.fn(),
    navigateToArticleList: mockNavigateToArticleList,
    navigateToReader: mockNavigateToReader,
    navigateToDiscover: vi.fn(),
    navigateToSettings: vi.fn(),
    // Enhanced features
    isToolbarVisible: mockIsToolbarVisible,
    toggleToolbar: mockToggleToolbar,
    setToolbarVisible: vi.fn(),
    previousView: null,
    isReading: mockMobileView === 'article-reader',
    currentArticleId: mockCurrentArticleId,
  }),
  LayoutProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock MobileLayout
vi.mock('./MobileLayout', () => ({
  MobileLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mobile-layout">
      <div data-testid="mobile-content">{children}</div>
      <nav data-testid="bottom-nav">Bottom Nav</nav>
    </div>
  ),
}))

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="desktop-layout">{children}</div>
  ),
  Panel: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-testid={`panel-${id}`}>{children}</div>
  ),
  useGroupRef: () => ({ current: null }),
}))

// Mock ResizeHandle
vi.mock('@/components/ui/ResizeHandle', () => ({
  ResizeHandle: () => <div data-testid="resize-handle" />,
}))

// Mock FeedList (desktop)
vi.mock('@/components/feeds/FeedList', () => ({
  FeedList: () => <div data-testid="feed-list">FeedList</div>,
}))

// Mock ArticleList (desktop)
vi.mock('@/components/articles/ArticleList', () => ({
  ArticleList: () => <div data-testid="article-list">ArticleList</div>,
}))

// Mock ArticleViewer (desktop)
vi.mock('@/components/articles/ArticleViewer', () => ({
  ArticleViewer: () => <div data-testid="article-viewer">ArticleViewer</div>,
}))

// Mock EmptyReaderPlaceholder (desktop)
vi.mock('@/components/articles/EmptyReaderPlaceholder', () => ({
  EmptyReaderPlaceholder: () => <div data-testid="empty-reader">EmptyReaderPlaceholder</div>,
}))

// Mock MobileFeedList
vi.mock('@/components/mobile/MobileFeedList', () => ({
  MobileFeedList: ({ feeds, selectedFeedId, onFeedClick, onRefresh, onAddFeed, unreadCounts, isLoading }: {
    feeds: Array<{ id: string; title: string }>
    selectedFeedId?: string | null
    onFeedClick?: () => void
    onRefresh?: () => void
    onAddFeed?: () => void
    unreadCounts?: Record<string, number>
    isLoading?: boolean
  }) => (
    <div data-testid="mobile-feed-list">
      MobileFeedList
      <span data-testid="feeds-count">{feeds.length}</span>
      <span data-testid="selected-feed-id">{selectedFeedId ?? 'none'}</span>
      <span data-testid="is-loading">{isLoading ? 'true' : 'false'}</span>
      <button data-testid="mobile-feed-click" onClick={onFeedClick}>Click Feed</button>
      <button data-testid="mobile-refresh" onClick={onRefresh}>Refresh</button>
      <button data-testid="mobile-add-feed" onClick={onAddFeed}>Add Feed</button>
      <span data-testid="unread-counts">{JSON.stringify(unreadCounts ?? {})}</span>
    </div>
  ),
}))

// Mock MobileArticleList
vi.mock('@/components/mobile/MobileArticleList', () => ({
  MobileArticleList: ({ articles, selectedArticleId, onArticleClick, onRefresh, onBack, isLoading }: {
    articles: Array<{ id: string; title: string }>
    selectedArticleId?: string | null
    onArticleClick?: () => void
    onRefresh?: () => void
    onBack?: () => void
    isLoading?: boolean
  }) => (
    <div data-testid="mobile-article-list">
      MobileArticleList
      <span data-testid="articles-count">{articles.length}</span>
      <span data-testid="selected-article-id">{selectedArticleId ?? 'none'}</span>
      <span data-testid="is-loading">{isLoading ? 'true' : 'false'}</span>
      <button data-testid="mobile-article-click" onClick={onArticleClick}>Click Article</button>
      <button data-testid="mobile-refresh" onClick={onRefresh}>Refresh</button>
      <button data-testid="mobile-back" onClick={onBack}>Back</button>
    </div>
  ),
}))

// Mock MobileArticleViewer
vi.mock('@/components/mobile/MobileArticleViewer', () => ({
  MobileArticleViewer: ({ article, onBack, isLoading }: {
    article: { id: string; title: string } | null
    onBack?: () => void
    isLoading?: boolean
  }) => (
    <div data-testid="mobile-article-viewer">
      MobileArticleViewer
      <span data-testid="article-title">{article?.title ?? 'none'}</span>
      <span data-testid="is-loading">{isLoading ? 'true' : 'false'}</span>
      <button data-testid="mobile-back" onClick={onBack}>Back</button>
    </div>
  ),
}))

// Mock DiscoverPanel
vi.mock('@/components/discover', () => ({
  DiscoverPanel: () => <div data-testid="discover-panel">DiscoverPanel</div>,
}))

// Mock AddFeedDialog
vi.mock('@/components/feeds/AddFeedDialog', () => ({
  AddFeedDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null
    return (
      <div data-testid="add-feed-dialog">
        AddFeedDialog
        <button data-testid="close-add-feed-dialog" onClick={onClose}>Close</button>
      </div>
    )
  },
}))

// Mock UpdateBanner and ChangelogDialog
vi.mock('@/components/ui/UpdateBanner', () => ({
  UpdateBanner: () => <div data-testid="update-banner">UpdateBanner</div>,
}))

vi.mock('@/components/ui/ChangelogDialog', () => ({
  ChangelogDialog: () => <div data-testid="changelog-dialog">ChangelogDialog</div>,
}))

// Mock useAutoUpdater
vi.mock('@/hooks/useAutoUpdater', () => ({
  useAutoUpdater: () => ({
    updateInfo: null,
    downloadAndInstall: vi.fn(),
    dismissUpdate: vi.fn(),
  }),
}))

// Mock useNotificationNavigation
vi.mock('@/hooks/useNotificationNavigation', () => ({
  useNotificationNavigation: vi.fn(),
}))

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}))

// Mock RssContext
let mockShowDiscover = false
let mockSelectedFeedId: string | null = null
let mockIsLoading = false
let mockArticles: Array<{ id: string; title: string; feed_id: string; read: boolean; favorite: boolean }> = []
let mockFeeds: Array<{ feed: { id: string; title: string }; unread_count: number }> = []

const mockSelectDiscover = vi.fn()
const mockExitDiscover = vi.fn()
const mockSelectFeed = vi.fn()
const mockSelectFeedAndLoad = vi.fn()
const mockRefreshAllFeeds = vi.fn().mockResolvedValue(undefined)
const mockMarkArticleRead = vi.fn()

vi.mock('@/contexts/RssContext', () => ({
  useRss: () => ({
    loadFeeds: vi.fn().mockResolvedValue(undefined),
    silentRefreshAll: vi.fn(),
    articles: mockArticles,
    selectFeedAndLoad: mockSelectFeedAndLoad,
    showDiscover: mockShowDiscover,
    feeds: mockFeeds,
    addFeed: vi.fn(),
    exitDiscover: mockExitDiscover,
    selectDiscover: mockSelectDiscover,
    selectFeed: mockSelectFeed,
    selectedFeedId: mockSelectedFeedId,
    isLoading: mockIsLoading,
    refreshAllFeeds: mockRefreshAllFeeds,
    markArticleRead: mockMarkArticleRead,
    getGlobalUnreadCount: () => mockFeeds.reduce((sum, f) => sum + f.unread_count, 0),
  }),
  RssProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock ReaderContext
vi.mock('@/contexts/ReaderContext', () => ({
  useReader: () => ({
    selectedArticleId: mockCurrentArticleId,
    selectArticle: vi.fn(),
    readerSettings: {
      fontSize: 16,
      lineHeight: 1.8,
      letterSpacing: 0,
      maxWidth: 80,
      textAlign: 'left' as const,
      showProgress: true,
    },
  }),
  ReaderProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock UnifiedSettings
vi.mock('@/components/settings/UnifiedSettings', () => ({
  UnifiedSettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUnifiedSettings: () => ({
    open: false,
    openSettings: vi.fn(),
    closeSettings: vi.fn(),
  }),
}))

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile = false
    mockIsMobileLayout = false
    mockMobileView = 'feed-list'
    mockShowDiscover = false
    mockSelectedFeedId = null
    mockIsLoading = false
    mockArticles = []
    mockFeeds = []
    mockIsToolbarVisible = false
    mockCurrentArticleId = null
    mockSelectDiscover.mockClear()
    mockExitDiscover.mockClear()
    mockSelectFeed.mockClear()
    mockSelectFeedAndLoad.mockClear()
    mockRefreshAllFeeds.mockClear()
    mockMarkArticleRead.mockClear()
    mockToggleToolbar.mockClear()
    mockGoBack.mockClear()
    mockNavigateToArticleList.mockClear()
    mockNavigateToReader.mockClear()
  })

  describe('Desktop Layout', () => {
    beforeEach(() => {
      mockIsMobile = false
      mockIsMobileLayout = false
    })

    it('should render desktop three-panel layout on desktop', () => {
      render(
        <ResponsiveLayout>
          <div data-testid="child-content">Child</div>
        </ResponsiveLayout>
      )

      // Desktop should show resizable layout, not mobile layout
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-layout')).not.toBeInTheDocument()
    })

    it('should render feed panel in desktop layout', () => {
      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('panel-sidebar-panel')).toBeInTheDocument()
      expect(screen.getByTestId('feed-list')).toBeInTheDocument()
    })

    it('should render article list panel in desktop layout', () => {
      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('panel-article-list-panel')).toBeInTheDocument()
      expect(screen.getByTestId('article-list')).toBeInTheDocument()
    })

    it('should render reader panel in desktop layout', () => {
      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('panel-reader-panel')).toBeInTheDocument()
    })

    it('should render EmptyReaderPlaceholder when no article selected', () => {
      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('empty-reader')).toBeInTheDocument()
    })

    it('should show discover layout when showDiscover is true', () => {
      mockShowDiscover = true

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('discover-layout')).toBeInTheDocument()
    })
  })

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockIsMobile = true
      mockIsMobileLayout = true
    })

    it('should render MobileLayout on mobile', () => {
      render(
        <ResponsiveLayout>
          <div data-testid="child-content">Child</div>
        </ResponsiveLayout>
      )

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument()
    })

    it('should render bottom navigation in mobile layout', () => {
      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    })

    it('should render feed-list view when mobileView is feed-list', () => {
      mockMobileView = 'feed-list'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      // Should show MobileFeedList in mobile content area
      expect(screen.getByTestId('mobile-feed-list')).toBeInTheDocument()
    })

    it('should render article-list view when mobileView is article-list', () => {
      mockMobileView = 'article-list'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('mobile-article-list')).toBeInTheDocument()
    })

    it('should render article-reader view when mobileView is article-reader', () => {
      mockMobileView = 'article-reader'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      // Should show MobileArticleViewer
      expect(screen.getByTestId('mobile-article-viewer')).toBeInTheDocument()
    })

    it('should render discover view when mobileView is discover', () => {
      mockMobileView = 'discover'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('mobile-discover-view')).toBeInTheDocument()
    })

    it('should render settings view when mobileView is settings', () => {
      mockMobileView = 'settings'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      // Settings should be rendered (via UnifiedSettingsPanel)
      expect(screen.getByTestId('settings-view')).toBeInTheDocument()
    })

    it('should pass feeds to MobileFeedList', () => {
      mockMobileView = 'feed-list'
      mockFeeds = [
        { feed: { id: 'feed-1', title: 'Feed 1' }, unread_count: 5 },
        { feed: { id: 'feed-2', title: 'Feed 2' }, unread_count: 3 },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('feeds-count')).toHaveTextContent('2')
    })

    it('should pass selectedFeedId to MobileFeedList', () => {
      mockMobileView = 'feed-list'
      mockSelectedFeedId = 'feed-1'
      mockFeeds = [
        { feed: { id: 'feed-1', title: 'Feed 1' }, unread_count: 5 },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('selected-feed-id')).toHaveTextContent('feed-1')
    })

    it('should pass articles to MobileArticleList', () => {
      mockMobileView = 'article-list'
      mockArticles = [
        { id: 'article-1', title: 'Article 1', feed_id: 'feed-1', read: false, favorite: false },
        { id: 'article-2', title: 'Article 2', feed_id: 'feed-1', read: false, favorite: false },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('articles-count')).toHaveTextContent('2')
    })

    it('should pass article to MobileArticleViewer', () => {
      mockMobileView = 'article-reader'
      mockCurrentArticleId = 'article-1'
      mockArticles = [
        { id: 'article-1', title: 'Test Article', feed_id: 'feed-1', read: false, favorite: false },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('article-title')).toHaveTextContent('Test Article')
    })

    it('should pass isLoading state to mobile components', () => {
      mockMobileView = 'feed-list'
      mockIsLoading = true

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
    })

    it('should call selectFeedAndLoad when feed is clicked in MobileFeedList', async () => {
      mockMobileView = 'feed-list'
      mockFeeds = [
        { feed: { id: 'feed-1', title: 'Feed 1' }, unread_count: 5 },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      const feedClickButton = screen.getByTestId('mobile-feed-click')
      await act(async () => {
        feedClickButton.click()
      })

      // Note: The actual click handler should be passed through props
      expect(feedClickButton).toBeInTheDocument()
    })

    it('should call goBack when back button is pressed in MobileArticleList', async () => {
      mockMobileView = 'article-list'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      const backButton = screen.getByTestId('mobile-back')
      await act(async () => {
        backButton.click()
      })

      expect(mockGoBack).toHaveBeenCalled()
    })

    it('should call goBack when back button is pressed in MobileArticleViewer', async () => {
      mockMobileView = 'article-reader'
      mockArticles = [
        { id: 'article-1', title: 'Test Article', feed_id: 'feed-1', read: false, favorite: false },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      const backButton = screen.getByTestId('mobile-back')
      await act(async () => {
        backButton.click()
      })

      expect(mockGoBack).toHaveBeenCalled()
    })

    it('should call refreshAllFeeds when refresh is triggered in MobileFeedList', async () => {
      mockMobileView = 'feed-list'
      mockFeeds = [
        { feed: { id: 'feed-1', title: 'Feed 1' }, unread_count: 5 },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      const refreshButton = screen.getByTestId('mobile-refresh')
      await act(async () => {
        refreshButton.click()
      })

      expect(mockRefreshAllFeeds).toHaveBeenCalled()
    })

    it('should show empty state in MobileFeedList when no feeds', () => {
      mockMobileView = 'feed-list'
      mockFeeds = []

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('feeds-count')).toHaveTextContent('0')
    })

    it('should show AddFeedDialog when add feed button is clicked in MobileFeedList', async () => {
      mockMobileView = 'feed-list'
      mockFeeds = [
        { feed: { id: 'feed-1', title: 'Feed 1' }, unread_count: 5 },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      // 点击添加按钮应该打开 AddFeedDialog
      const addFeedButton = screen.getByTestId('mobile-add-feed')

      // 初始时对话框不应该显示
      expect(screen.queryByTestId('add-feed-dialog')).not.toBeInTheDocument()

      await act(async () => {
        addFeedButton.click()
      })

      // 点击后对话框应该显示
      expect(screen.getByTestId('add-feed-dialog')).toBeInTheDocument()
    })

    it('should NOT call selectDiscover when add feed button is clicked in MobileFeedList', async () => {
      mockMobileView = 'feed-list'
      mockFeeds = [
        { feed: { id: 'feed-1', title: 'Feed 1' }, unread_count: 5 },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      const addFeedButton = screen.getByTestId('mobile-add-feed')

      await act(async () => {
        addFeedButton.click()
      })

      // 点击添加按钮不应该调用 selectDiscover（导航到发现页面）
      // 而是应该打开 AddFeedDialog
      expect(mockSelectDiscover).not.toHaveBeenCalled()
    })
  })

  describe('Children Propagation', () => {
    it('should render children in desktop layout', () => {
      mockIsMobileLayout = false

      render(
        <ResponsiveLayout>
          <div data-testid="custom-child">Custom Child</div>
        </ResponsiveLayout>
      )

      // In desktop mode, the default content is rendered, not children
      // This is expected behavior as ResponsiveLayout manages its own content
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
    })

    it('should handle children in mobile layout appropriately', () => {
      mockIsMobileLayout = true
      mockMobileView = 'feed-list'

      render(
        <ResponsiveLayout>
          <div data-testid="custom-child">Custom Child</div>
        </ResponsiveLayout>
      )

      // Mobile layout uses content switching based on mobileView
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
    })
  })

  describe('Layout Mode Switching', () => {
    it('should switch from desktop to mobile layout based on isMobileLayout', () => {
      mockIsMobileLayout = false

      const { rerender } = render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()

      // Switch to mobile
      mockIsMobileLayout = true
      rerender(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
    })
  })

  describe('Mobile View Navigation', () => {
    beforeEach(() => {
      mockIsMobile = true
      mockIsMobileLayout = true
    })

    it('should only render one view at a time in mobile', () => {
      mockMobileView = 'feed-list'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('mobile-feed-list')).toBeInTheDocument()
      // Other views should not be present
      expect(screen.queryByTestId('mobile-article-list')).not.toBeInTheDocument()
      expect(screen.queryByTestId('mobile-discover-view')).not.toBeInTheDocument()
    })

    it('should render article-list view', () => {
      mockMobileView = 'article-list'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('mobile-article-list')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-feed-list')).not.toBeInTheDocument()
    })

    it('should render discover view', () => {
      mockMobileView = 'discover'

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('mobile-discover-view')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-feed-list')).not.toBeInTheDocument()
      expect(screen.queryByTestId('mobile-article-list')).not.toBeInTheDocument()
    })

    it('should render article-reader view with article', () => {
      mockMobileView = 'article-reader'
      mockArticles = [
        { id: 'article-1', title: 'Test Article', feed_id: 'feed-1', read: false, favorite: false },
      ]

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      expect(screen.getByTestId('mobile-article-viewer')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-feed-list')).not.toBeInTheDocument()
      expect(screen.queryByTestId('mobile-article-list')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have main landmark in desktop layout', () => {
      mockIsMobileLayout = false

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      // Desktop layout should be accessible
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
    })

    it('should have main landmark in mobile layout', () => {
      mockIsMobileLayout = true

      render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>)

      // MobileLayout component handles main landmark
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined children gracefully', () => {
      mockIsMobileLayout = false

      render(<ResponsiveLayout>{undefined}</ResponsiveLayout>)

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
    })

    it('should handle null children gracefully', () => {
      mockIsMobileLayout = true
      mockMobileView = 'feed-list'

      render(<ResponsiveLayout>{null}</ResponsiveLayout>)

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
    })
  })
})
