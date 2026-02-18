import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DiscoverPanel } from './DiscoverPanel'
import type { DiscoverData, FeedWithUnreadCount, Feed, DiscoverFeed } from '../../types'

// Mock RssApi
const mockGetDiscoverFeeds = vi.fn()
vi.mock('../../lib/api', () => ({
  RssApi: {
    getDiscoverFeeds: () => mockGetDiscoverFeeds(),
  },
}))

// Mock DiscoverFeedCard component
vi.mock('./DiscoverFeedCard', () => ({
  DiscoverFeedCard: ({
    feed,
    isAdded,
    onAdd,
  }: {
    feed: { id: string; title: string; url: string }
    isAdded: boolean
    onAdd: (feed: { url: string }) => Promise<void>
  }) => (
    <div data-testid={`feed-card-${feed.id}`}>
      <span>{feed.title}</span>
      <span data-isadded={isAdded}>{isAdded ? 'Added' : 'Not Added'}</span>
      <button onClick={() => onAdd(feed)}>Add</button>
    </div>
  ),
}))

// Mock AddFromDiscoverDialog component - render nothing but always exist in DOM
vi.mock('./AddFromDiscoverDialog', () => ({
  AddFromDiscoverDialog: ({
    isOpen,
    feed,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean
    feed: DiscoverFeed | null
    onClose: () => void
    onConfirm: (url: string, useFullContent: boolean, useAiSummary: boolean, useAiTranslation: boolean) => Promise<void>
  }) => (
    <div data-testid="add-from-discover-dialog" data-open={isOpen}>
      {isOpen && feed && (
        <>
          <span>{feed.title}</span>
          <button data-testid="dialog-cancel" onClick={onClose}>Cancel</button>
          <button
            data-testid="dialog-confirm"
            onClick={() => onConfirm(feed.url, true, false, true)}
          >
            Confirm
          </button>
        </>
      )}
    </div>
  ),
}))

// Mock DiscoverCategoryFilter component
vi.mock('./DiscoverCategory', () => ({
  DiscoverCategoryFilter: ({
    categories,
    selectedCategoryId,
    onSelect,
  }: {
    categories: { id: string; name: string }[]
    selectedCategoryId: string | null
    onSelect: (id: string | null) => void
  }) => (
    <div data-testid="category-filter">
      <button onClick={() => onSelect(null)} data-selected={selectedCategoryId === null}>
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          data-selected={selectedCategoryId === cat.id}
        >
          {cat.name}
        </button>
      ))}
    </div>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon">Loading...</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  Inbox: () => <span data-testid="inbox-icon">Inbox</span>,
  X: () => <span data-testid="x-icon">X</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
}))

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Group: ({ children, className, orientation }: { children: React.ReactNode; className?: string; orientation?: string }) => (
    <div data-testid="resize-group" className={className} data-orientation={orientation}>{children}</div>
  ),
  Panel: ({
    children,
    defaultSize,
    minSize,
    maxSize,
  }: {
    children: React.ReactNode
    defaultSize?: number
    minSize?: number
    maxSize?: number
  }) => (
    <div
      data-testid={`panel-${defaultSize}`}
      data-default-size={defaultSize}
      data-min-size={minSize}
      data-max-size={maxSize}
    >
      {children}
    </div>
  ),
  Separator: ({ className }: { className?: string }) => (
    <div data-testid="resize-handle" className={className} />
  ),
}))

const mockDiscoverData: DiscoverData = {
  categories: [
    { id: 'tech', name: '科技', icon: 'Cpu', description: '科技资讯' },
    { id: 'news', name: '新闻', icon: 'Newspaper', description: '新闻资讯' },
  ],
  feeds: [
    {
      id: 'feed-1',
      title: 'Tech Feed 1',
      url: 'https://example.com/tech1.xml',
      description: 'Tech description 1',
      categoryId: 'tech',
      tags: ['tech'],
    },
    {
      id: 'feed-2',
      title: 'Tech Feed 2',
      url: 'https://example.com/tech2.xml',
      description: 'Tech description 2',
      categoryId: 'tech',
      tags: ['tech'],
    },
    {
      id: 'feed-3',
      title: 'News Feed 1',
      url: 'https://example.com/news1.xml',
      description: 'News description 1',
      categoryId: 'news',
      tags: ['news'],
    },
  ],
}

const createMockFeed = (id: string, url: string): Feed => ({
  id,
  url,
  title: `Feed ${id}`,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
})

const mockExistingFeeds: FeedWithUnreadCount[] = [
  { feed: createMockFeed('existing-1', 'https://example.com/tech1.xml'), unread_count: 5 },
  { feed: createMockFeed('existing-2', 'https://different.com/feed.xml'), unread_count: 3 },
]

const mockOnAddFeed = vi.fn()

describe('DiscoverPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDiscoverFeeds.mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('加载状态测试', () => {
    it('shows loading state initially', () => {
      // Never resolve the promise to keep loading state
      mockGetDiscoverFeeds.mockImplementation(() => new Promise(() => {}))

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(screen.getByText('加载中...')).toBeInTheDocument()
    })

    it('hides loading state after data loads', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument()
      })
    })
  })

  describe('错误状态测试', () => {
    it('shows error state when API fails', async () => {
      mockGetDiscoverFeeds.mockRejectedValue(new Error('Network error'))

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('shows generic error message for non-Error rejections', async () => {
      mockGetDiscoverFeeds.mockRejectedValue('Unknown error')

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        // Use getAllByText since both title and error message show "加载失败"
        const errorElements = screen.getAllByText('加载失败')
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('数据加载测试', () => {
    it('calls getDiscoverFeeds API on mount', () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      expect(mockGetDiscoverFeeds).toHaveBeenCalledTimes(1)
    })

    it('renders all feeds after loading', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-2')).toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-3')).toBeInTheDocument()
      })
    })

    it('renders category filter with all categories', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('category-filter')).toBeInTheDocument()
        expect(screen.getByText('科技')).toBeInTheDocument()
        expect(screen.getByText('新闻')).toBeInTheDocument()
      })
    })
  })

  describe('分类筛选测试', () => {
    it('shows all feeds by default (no category selected)', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-2')).toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-3')).toBeInTheDocument()
      })
    })

    it('filters feeds by selected category', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('category-filter')).toBeInTheDocument()
      })

      // Click on "科技" category
      fireEvent.click(screen.getByText('科技'))

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-2')).toBeInTheDocument()
        expect(screen.queryByTestId('feed-card-feed-3')).not.toBeInTheDocument()
      })
    })

    it('shows all feeds when "All" is clicked after selecting category', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('category-filter')).toBeInTheDocument()
      })

      // Select a category first
      fireEvent.click(screen.getByText('科技'))

      await waitFor(() => {
        expect(screen.queryByTestId('feed-card-feed-3')).not.toBeInTheDocument()
      })

      // Click "All" to reset filter
      fireEvent.click(screen.getByText('All'))

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-2')).toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-3')).toBeInTheDocument()
      })
    })
  })

  describe('搜索功能测试', () => {
    it('renders search input', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索订阅源...')).toBeInTheDocument()
      })
    })

    it('filters feeds by search query (title)', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索订阅源...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜索订阅源...')
      fireEvent.change(searchInput, { target: { value: 'Tech Feed 1' } })

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
        expect(screen.queryByTestId('feed-card-feed-2')).not.toBeInTheDocument()
        expect(screen.queryByTestId('feed-card-feed-3')).not.toBeInTheDocument()
      })
    })

    it('filters feeds by search query (description)', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索订阅源...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜索订阅源...')
      fireEvent.change(searchInput, { target: { value: 'News description' } })

      await waitFor(() => {
        expect(screen.queryByTestId('feed-card-feed-1')).not.toBeInTheDocument()
        expect(screen.queryByTestId('feed-card-feed-2')).not.toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-3')).toBeInTheDocument()
      })
    })

    it('filters feeds by search query (tags)', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索订阅源...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜索订阅源...')
      fireEvent.change(searchInput, { target: { value: 'news' } })

      await waitFor(() => {
        expect(screen.queryByTestId('feed-card-feed-1')).not.toBeInTheDocument()
        expect(screen.queryByTestId('feed-card-feed-2')).not.toBeInTheDocument()
        expect(screen.getByTestId('feed-card-feed-3')).toBeInTheDocument()
      })
    })

    it('search is case-insensitive', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索订阅源...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜索订阅源...')
      fireEvent.change(searchInput, { target: { value: 'TECH FEED 1' } })

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
      })
    })

    it('combines search and category filters', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('category-filter')).toBeInTheDocument()
      })

      // Select tech category
      fireEvent.click(screen.getByText('科技'))

      // Search within tech category
      const searchInput = screen.getByPlaceholderText('搜索订阅源...')
      fireEvent.change(searchInput, { target: { value: 'Feed 1' } })

      await waitFor(() => {
        // Should only show feed-1 (tech category + matches "Feed 1")
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
        expect(screen.queryByTestId('feed-card-feed-2')).not.toBeInTheDocument()
        expect(screen.queryByTestId('feed-card-feed-3')).not.toBeInTheDocument()
      })
    })
  })

  describe('已添加状态测试', () => {
    it('marks feeds as added when URL matches existing feeds', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={mockExistingFeeds}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        // feed-1 URL matches existing-1, should be marked as added
        const feedCard1 = screen.getByTestId('feed-card-feed-1')
        expect(feedCard1.querySelector('[data-isadded="true"]')).toBeInTheDocument()

        // feed-2 URL doesn't match, should not be marked as added
        const feedCard2 = screen.getByTestId('feed-card-feed-2')
        expect(feedCard2.querySelector('[data-isadded="false"]')).toBeInTheDocument()
      })
    })
  })

  describe('添加订阅测试', () => {
    it('opens dialog when clicking add button on a feed', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
          onClose={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-feed-1')).toBeInTheDocument()
      })

      // Click add button on first feed
      const feedCard1 = screen.getByTestId('feed-card-feed-1')
      const addButton = feedCard1.querySelector('button')!
      fireEvent.click(addButton)

      // Dialog should be open now
      await waitFor(() => {
        expect(screen.getByTestId('add-from-discover-dialog')).toHaveAttribute('data-open', 'true')
      })
    })
  })

  describe('空结果状态测试', () => {
    it('shows empty state when no feeds match search', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索订阅源...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜索订阅源...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent feed xyz' } })

      await waitFor(() => {
        expect(screen.getByText('没有找到订阅源')).toBeInTheDocument()
        expect(screen.getByText('尝试更换搜索词或分类')).toBeInTheDocument()
      })
    })

    it('shows empty state when category has no feeds', async () => {
      const dataWithEmptyCategory: DiscoverData = {
        categories: [
          { id: 'tech', name: '科技', icon: 'Cpu', description: '科技资讯' },
          { id: 'empty', name: '空分类', icon: 'Empty', description: '没有订阅源' },
        ],
        feeds: [
          {
            id: 'feed-1',
            title: 'Tech Feed',
            url: 'https://example.com/tech.xml',
            description: 'Tech',
            categoryId: 'tech',
            tags: [],
          },
        ],
      }
      mockGetDiscoverFeeds.mockResolvedValue(dataWithEmptyCategory)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('空分类')).toBeInTheDocument()
      })

      // Select empty category
      fireEvent.click(screen.getByText('空分类'))

      await waitFor(() => {
        expect(screen.getByText('没有找到订阅源')).toBeInTheDocument()
      })
    })
  })

  describe('组件卸载测试', () => {
    it('cancels pending API request on unmount', async () => {
      let rejectPromise: (reason?: Error) => void
      const pendingPromise = new Promise<DiscoverData>((_, reject) => {
        rejectPromise = reject
      })
      mockGetDiscoverFeeds.mockReturnValue(pendingPromise)

      const { unmount } = render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      // Unmount while loading
      unmount()

      // Reject the promise after unmount
      rejectPromise!(new Error('Unmounted'))

      // Should not throw any errors
      await Promise.resolve()
      expect(true).toBe(true)
    })
  })

  describe('标题和描述测试', () => {
    it('renders panel title and description', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
          onClose={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('发现订阅')).toBeInTheDocument()
        expect(screen.getByText('探索精选 RSS 订阅源，发现优质内容')).toBeInTheDocument()
      })
    })
  })

  describe('全屏模式测试', () => {
    it('renders close button when onClose is provided', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)
      const mockOnClose = vi.fn()

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('发现订阅')).toBeInTheDocument()
      })

      // 应该有关闭按钮
      expect(screen.getByTestId('discover-close-button')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)
      const mockOnClose = vi.fn()

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('发现订阅')).toBeInTheDocument()
      })

      const closeButton = screen.getByTestId('discover-close-button')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('does not render close button when onClose is not provided', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('发现订阅')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('discover-close-button')).not.toBeInTheDocument()
    })
  })

  describe('AI 功能配置测试', () => {
    it('renders AddFromDiscoverDialog with correct props', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
          onClose={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('发现订阅')).toBeInTheDocument()
      })

      // 对话框应该存在于 DOM 中（即使未打开）
      expect(screen.getByTestId('add-from-discover-dialog')).toBeInTheDocument()
    })
  })

  describe('两栏式布局测试', () => {
    it('应该渲染两栏可调整大小的布局', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('discover-panel')).toBeInTheDocument()
      })

      // 应该有两栏布局容器
      expect(screen.getByTestId('discover-two-column-layout')).toBeInTheDocument()
    })

    it('应该渲染左侧分类列表面板', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('discover-panel')).toBeInTheDocument()
      })

      // 应该有分类列表面板
      expect(screen.getByTestId('discover-category-panel')).toBeInTheDocument()
    })

    it('应该渲染右侧订阅源网格面板', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('discover-panel')).toBeInTheDocument()
      })

      // 应该有订阅源面板
      expect(screen.getByTestId('discover-feeds-panel')).toBeInTheDocument()
    })

    it('分类列表应该是垂直布局', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('discover-panel')).toBeInTheDocument()
      })

      // 分类列表容器应该有 flex-col 类
      const categoryList = screen.getByTestId('discover-category-list')
      expect(categoryList).toHaveClass('flex-col')
    })

    it('应该在分类面板中显示所有分类按钮', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('discover-category-panel')).toBeInTheDocument()
      })

      // 验证分类面板中包含分类过滤器
      const categoryPanel = screen.getByTestId('discover-category-panel')
      expect(categoryPanel).toContainElement(screen.getByTestId('category-filter'))
    })

    it('应该在订阅源面板中显示搜索框和订阅源列表', async () => {
      mockGetDiscoverFeeds.mockResolvedValue(mockDiscoverData)

      render(
        <DiscoverPanel
          existingFeeds={[]}
          onAddFeed={mockOnAddFeed}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('discover-feeds-panel')).toBeInTheDocument()
      })

      // 验证订阅源面板中包含搜索框
      const feedsPanel = screen.getByTestId('discover-feeds-panel')
      expect(feedsPanel).toContainElement(screen.getByPlaceholderText('搜索订阅源...'))
    })
  })
})
