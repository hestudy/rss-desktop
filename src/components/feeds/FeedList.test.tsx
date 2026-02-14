import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedList } from './FeedList'

const mockSelectFeed = vi.fn()
const mockSelectFavorites = vi.fn()
const mockRemoveFeed = vi.fn()
const mockRefreshFeed = vi.fn()
const mockRefreshAllFeeds = vi.fn()
const mockUpdateFeed = vi.fn()
const mockGetGlobalUnreadCount = vi.fn(() => 3)

let mockFeeds = [
  {
    feed: { id: 'feed-1', title: 'Tech Blog', url: 'https://example.com/feed.xml', icon_url: null, site_url: 'https://example.com' },
    unread_count: 3,
  },
  {
    feed: { id: 'feed-2', title: 'News Feed', url: 'https://news.com/rss', icon_url: null, site_url: 'https://news.com' },
    unread_count: 0,
  },
]
let mockSelectedFeedId: string | null = null
let mockIsLoading = false
let mockShowFavoritesOnly = false
let mockRefreshingFeedIds = new Set<string>()

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    get feeds() { return mockFeeds },
    get selectedFeedId() { return mockSelectedFeedId },
    get isLoading() { return mockIsLoading },
    get showFavoritesOnly() { return mockShowFavoritesOnly },
    get refreshingFeedIds() { return mockRefreshingFeedIds },
    removeFeed: mockRemoveFeed,
    refreshFeed: mockRefreshFeed,
    refreshAllFeeds: mockRefreshAllFeeds,
    updateFeed: mockUpdateFeed,
    selectFeed: mockSelectFeed,
    selectFavorites: mockSelectFavorites,
    getGlobalUnreadCount: mockGetGlobalUnreadCount,
  }),
}))

vi.mock('../ui/ConfirmDialog', () => ({
  useConfirm: () => ({
    confirm: mockConfirm,
  }),
}))

vi.mock('../settings/UnifiedSettings', () => ({
  useUnifiedSettings: () => ({
    openSettings: mockOpenSettings,
  }),
}))

vi.mock('lucide-react', () => ({
  Rss: (props: Record<string, unknown>) => <svg data-testid="rss-icon" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  Settings: (props: Record<string, unknown>) => <svg data-testid="settings-icon" {...props} />,
  Star: (props: Record<string, unknown>) => <svg data-testid="star-icon" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right-icon" {...props} />,
  Inbox: (props: Record<string, unknown>) => <svg data-testid="inbox-icon" {...props} />,
  Mail: (props: Record<string, unknown>) => <svg data-testid="mail-icon" {...props} />,
  Calendar: (props: Record<string, unknown>) => <svg data-testid="calendar-icon" {...props} />,
  Pencil: (props: Record<string, unknown>) => <svg data-testid="pencil-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  MoreHorizontal: (props: Record<string, unknown>) => <svg data-testid="more-icon" {...props} />,
  ScrollText: (props: Record<string, unknown>) => <svg data-testid="scroll-text-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}))

vi.mock('../queue/QueueIndicator', () => ({
  QueueIndicator: () => <div data-testid="queue-indicator" />,
}))

const mockOpenSettings = vi.fn()
vi.mock('../settings/UnifiedSettings', () => ({
  useUnifiedSettings: () => ({
    openSettings: mockOpenSettings,
  }),
}))

const mockConfirm = vi.fn().mockResolvedValue(true)
vi.mock('../ui/ConfirmDialog', () => ({
  useConfirm: () => ({
    confirm: mockConfirm,
  }),
}))

vi.mock('./AddFeedDialog', () => ({
  AddFeedDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="add-feed-dialog">AddFeedDialog</div> : null,
}))

vi.mock('./EditFeedDialog', () => ({
  EditFeedDialog: ({ isOpen, feed: _feed }: { isOpen: boolean; feed: unknown }) => isOpen ? <div data-testid="edit-feed-dialog">EditFeedDialog</div> : null,
}))

vi.mock('./FeedLogDialog', () => ({
  FeedLogDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="feed-log-dialog">FeedLogDialog</div> : null,
}))

vi.mock('./GlobalLogDialog', () => ({
  GlobalLogDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="global-log-dialog">GlobalLogDialog</div> : null,
}))

describe('FeedList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFeeds = [
      {
        feed: { id: 'feed-1', title: 'Tech Blog', url: 'https://example.com/feed.xml', icon_url: null, site_url: 'https://example.com' },
        unread_count: 3,
      },
      {
        feed: { id: 'feed-2', title: 'News Feed', url: 'https://news.com/rss', icon_url: null, site_url: 'https://news.com' },
        unread_count: 0,
      },
    ]
    mockSelectedFeedId = null
    mockIsLoading = false
    mockShowFavoritesOnly = false
    mockRefreshingFeedIds = new Set<string>()
  })

  describe('navigation buttons', () => {
    it('renders "全部文章" button and calls selectFeed(null) on click', () => {
      render(<FeedList />)
      const allBtn = screen.getByTestId('all-articles-button')
      fireEvent.click(allBtn)
      expect(mockSelectFeed).toHaveBeenCalledWith(null)
    })

    it('renders "收藏文章" button and calls selectFavorites on click', () => {
      render(<FeedList />)
      const favBtn = screen.getByTestId('favorites-button')
      fireEvent.click(favBtn)
      expect(mockSelectFavorites).toHaveBeenCalled()
    })

    it('highlights "全部文章" when no feed selected and not in favorites mode', () => {
      mockSelectedFeedId = null
      mockShowFavoritesOnly = false
      render(<FeedList />)
      const allBtn = screen.getByTestId('all-articles-button')
      expect(allBtn.className).toContain('bg-sidebar-hover')
    })

    it('highlights "收藏文章" when in favorites mode', () => {
      mockShowFavoritesOnly = true
      render(<FeedList />)
      const favBtn = screen.getByTestId('favorites-button')
      expect(favBtn.className).toContain('bg-sidebar-hover')
    })
  })

  describe('global unread badge', () => {
    it('shows global unread count when > 0', () => {
      mockGetGlobalUnreadCount.mockReturnValue(5)
      render(<FeedList />)
      expect(screen.getByTestId('global-unread-badge')).toHaveTextContent('5')
    })

    it('hides global unread badge when count is 0', () => {
      mockGetGlobalUnreadCount.mockReturnValue(0)
      render(<FeedList />)
      expect(screen.queryByTestId('global-unread-badge')).not.toBeInTheDocument()
    })
  })

  describe('feed items', () => {
    it('renders feed items with titles', () => {
      render(<FeedList />)
      expect(screen.getByText('Tech Blog')).toBeInTheDocument()
      expect(screen.getByText('News Feed')).toBeInTheDocument()
    })

    it('clicking a feed item calls selectFeed with feed id', () => {
      render(<FeedList />)
      fireEvent.click(screen.getByText('Tech Blog'))
      expect(mockSelectFeed).toHaveBeenCalledWith('feed-1')
    })

    it('shows unread count for feeds with unread articles', () => {
      render(<FeedList />)
      const badges = screen.getAllByTestId('feed-unread-count')
      expect(badges).toHaveLength(1)
      expect(badges[0]).toHaveTextContent('3')
    })

    it('highlights selected feed', () => {
      mockSelectedFeedId = 'feed-1'
      render(<FeedList />)
      const feedItems = screen.getAllByTestId('feed-item')
      expect(feedItems[0].className).toContain('bg-sidebar-hover')
    })

    it('shows refreshing indicator for feed being refreshed', () => {
      mockRefreshingFeedIds = new Set(['feed-1'])
      render(<FeedList />)
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no feeds and not loading', () => {
      mockFeeds = []
      render(<FeedList />)
      expect(screen.getByTestId('feed-empty-state')).toBeInTheDocument()
    })

    it('does not show empty state when loading', () => {
      mockFeeds = []
      mockIsLoading = true
      render(<FeedList />)
      expect(screen.queryByTestId('feed-empty-state')).not.toBeInTheDocument()
    })
  })

  describe('bottom toolbar', () => {
    it('calls refreshAllFeeds when refresh button clicked', () => {
      render(<FeedList />)
      const bottomBar = screen.getByTestId('sidebar-bottom')
      const refreshBtn = bottomBar.querySelector('button[title="刷新全部"]')!
      fireEvent.click(refreshBtn)
      expect(mockRefreshAllFeeds).toHaveBeenCalled()
    })

    it('opens global log dialog when log button clicked', () => {
      render(<FeedList />)
      const bottomBar = screen.getByTestId('sidebar-bottom')
      const logBtn = bottomBar.querySelector('button[title="刷新日志"]')!
      fireEvent.click(logBtn)
      // GlobalLogDialog should now be rendered
      // The mock will handle this
    })

    it('calls openSettings when settings button clicked', () => {
      render(<FeedList />)
      const bottomBar = screen.getByTestId('sidebar-bottom')
      const settingsBtn = bottomBar.querySelector('button[title="设置"]')!
      fireEvent.click(settingsBtn)
      expect(mockOpenSettings).toHaveBeenCalled()
    })

    it('disables refresh button when loading', () => {
      mockIsLoading = true
      render(<FeedList />)
      const bottomBar = screen.getByTestId('sidebar-bottom')
      const refreshBtn = bottomBar.querySelector('button[title="刷新全部"]')!
      expect(refreshBtn).toBeDisabled()
    })
  })

  describe('add feed dialog', () => {
    it('opens add feed dialog when plus button clicked', () => {
      render(<FeedList />)
      expect(screen.queryByTestId('add-feed-dialog')).not.toBeInTheDocument()
      const addBtn = screen.getByTitle('添加订阅')
      fireEvent.click(addBtn)
      expect(screen.getByTestId('add-feed-dialog')).toBeInTheDocument()
    })
  })

  describe('global log dialog', () => {
    it('opens global log dialog when log button clicked', () => {
      render(<FeedList />)
      expect(screen.queryByTestId('global-log-dialog')).not.toBeInTheDocument()
      const bottomBar = screen.getByTestId('sidebar-bottom')
      const logBtn = bottomBar.querySelector('button[title="刷新日志"]')!
      fireEvent.click(logBtn)
      expect(screen.getByTestId('global-log-dialog')).toBeInTheDocument()
    })
  })

  describe('dropdown menu actions', () => {
    it('calls refreshFeed when refresh menu item clicked', async () => {
      mockRefreshFeed.mockResolvedValue(undefined)
      render(<FeedList />)

      // Open dropdown for first feed
      const actionContainers = screen.getAllByTestId('feed-actions')
      const triggerBtn = actionContainers[0].querySelector('button')!
      fireEvent.click(triggerBtn)

      // Click refresh menu item
      const refreshItem = await screen.findByTestId('feed-menu-refresh')
      fireEvent.click(refreshItem)
      expect(mockRefreshFeed).toHaveBeenCalledWith('feed-1')
    })

    it('opens edit dialog when edit menu item clicked', async () => {
      render(<FeedList />)

      const actionContainers = screen.getAllByTestId('feed-actions')
      const triggerBtn = actionContainers[0].querySelector('button')!
      fireEvent.click(triggerBtn)

      const editItem = await screen.findByTestId('feed-menu-edit')
      fireEvent.click(editItem)
      expect(screen.getByTestId('edit-feed-dialog')).toBeInTheDocument()
    })

    it('opens log dialog when log menu item clicked', async () => {
      render(<FeedList />)

      const actionContainers = screen.getAllByTestId('feed-actions')
      const triggerBtn = actionContainers[0].querySelector('button')!
      fireEvent.click(triggerBtn)

      const logItem = await screen.findByTestId('feed-menu-log')
      fireEvent.click(logItem)
      expect(screen.getByTestId('feed-log-dialog')).toBeInTheDocument()
    })

    it('calls confirm and removeFeed when delete menu item clicked', async () => {
      mockRemoveFeed.mockResolvedValue(undefined)
      render(<FeedList />)

      const actionContainers = screen.getAllByTestId('feed-actions')
      const triggerBtn = actionContainers[0].querySelector('button')!
      fireEvent.click(triggerBtn)

      const deleteItem = await screen.findByTestId('feed-menu-delete')
      fireEvent.click(deleteItem)

      expect(mockConfirm).toHaveBeenCalledWith('确定要删除这个订阅吗？', '删除订阅')
    })
  })

  describe('feed action buttons hover behavior', () => {
    it('renders action buttons with absolute positioning and hidden by default', () => {
      render(<FeedList />)

      const feedItems = screen.getAllByText(/Tech Blog|News Feed/)
      expect(feedItems.length).toBeGreaterThanOrEqual(2)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      expect(actionContainers.length).toBe(2)

      actionContainers.forEach((container) => {
        expect(container).toHaveClass('absolute')
        expect(container).toHaveClass('opacity-0')
        expect(container).toHaveClass('group-hover:opacity-100')
      })
    })

    it('action buttons are positioned to right edge without affecting layout', () => {
      render(<FeedList />)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      actionContainers.forEach((container) => {
        expect(container).toHaveClass('right-0')
        expect(container).toHaveClass('top-0')
        expect(container).toHaveClass('bottom-0')
      })
    })

    it('action buttons have background to cover underlying text on hover', () => {
      render(<FeedList />)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      actionContainers.forEach((container) => {
        const classList = Array.from(container.classList)
        const hasBg = classList.some(c => c.startsWith('bg-'))
        expect(hasBg).toBe(true)
      })
    })
  })

  describe('edit feed button', () => {
    it('renders a dropdown trigger for each feed in the action area', () => {
      render(<FeedList />)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      actionContainers.forEach((container) => {
        const triggerButton = container.querySelector('[data-testid="more-icon"]')
        expect(triggerButton).toBeTruthy()
      })
    })
  })

  describe('queue indicator', () => {
    it('renders QueueIndicator in the bottom toolbar', () => {
      render(<FeedList />)
      expect(screen.getByTestId('queue-indicator')).toBeInTheDocument()
    })
  })
})
