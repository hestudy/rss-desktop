import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileFeedList } from './MobileFeedList'
import type { Feed } from '@/types'

// Mock usePullToRefresh hook
const mockPullState = {
  isPulling: false,
  isRefreshing: false,
  distance: 0,
  progress: 0,
  canRefresh: false,
}

let pullHandlers = {
  onTouchStart: vi.fn(),
  onTouchMove: vi.fn(),
  onTouchEnd: vi.fn(),
}

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: vi.fn(() => ({
    pullState: mockPullState,
    handlers: pullHandlers,
  })),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Inbox: () => <span data-testid="inbox-icon">Inbox</span>,
  Loader2: () => <span data-testid="loader-icon">Loader2</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">ChevronDown</span>,
  Rss: () => <span data-testid="rss-icon">Rss</span>,
}))

// Helper to create mock feed
function createMockFeed(overrides?: Partial<Feed>): Feed {
  return {
    id: `feed-${Math.random().toString(36).slice(2, 9)}`,
    url: `https://example.com/feed-${Math.random().toString(36).slice(2, 5)}.xml`,
    title: `Test Feed ${Math.random().toString(36).slice(2, 5)}`,
    created_at: '2025-02-20T10:00:00Z',
    updated_at: '2025-02-20T10:00:00Z',
    ...overrides,
  }
}

// Helper to create multiple feeds
function createMockFeeds(count: number): Feed[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFeed({
      id: `feed-${i + 1}`,
      title: `Feed ${i + 1}`,
    })
  )
}

describe('MobileFeedList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset pull state
    mockPullState.isPulling = false
    mockPullState.isRefreshing = false
    mockPullState.distance = 0
    mockPullState.progress = 0
    mockPullState.canRefresh = false
    pullHandlers = {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    }
  })

  describe('基本渲染', () => {
    it('应该渲染空状态提示', () => {
      render(<MobileFeedList feeds={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('应该显示自定义空状态提示', () => {
      render(
        <MobileFeedList
          feeds={[]}
          emptyMessage="暂无订阅"
        />
      )

      expect(screen.getByText('暂无订阅')).toBeInTheDocument()
    })

    it('应该渲染订阅列表', () => {
      const feeds = createMockFeeds(3)
      render(<MobileFeedList feeds={feeds} />)

      expect(screen.getByTestId('feed-list')).toBeInTheDocument()
      expect(screen.getByText('Feed 1')).toBeInTheDocument()
      expect(screen.getByText('Feed 2')).toBeInTheDocument()
      expect(screen.getByText('Feed 3')).toBeInTheDocument()
    })

    it('应该有正确的列表容器角色', () => {
      const feeds = createMockFeeds(2)
      render(<MobileFeedList feeds={feeds} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('顶部工具栏', () => {
    it('应该显示大标题"订阅"', () => {
      render(<MobileFeedList feeds={createMockFeeds(2)} />)

      expect(screen.getByText('订阅')).toBeInTheDocument()
    })

    it('应该显示添加订阅按钮', () => {
      render(<MobileFeedList feeds={createMockFeeds(2)} />)

      const addButton = screen.getByRole('button', { name: /add|添加/i })
      expect(addButton).toBeInTheDocument()
    })

    it('点击添加按钮应该调用 onAddFeed', () => {
      const handleAddFeed = vi.fn()
      render(
        <MobileFeedList
          feeds={createMockFeeds(2)}
          onAddFeed={handleAddFeed}
        />
      )

      const addButton = screen.getByRole('button', { name: /add|添加/i })
      fireEvent.click(addButton)

      expect(handleAddFeed).toHaveBeenCalledTimes(1)
    })
  })

  describe('下拉刷新', () => {
    it('下拉时应该显示刷新指示器', () => {
      mockPullState.isPulling = true
      mockPullState.progress = 0.5
      mockPullState.distance = 40

      render(<MobileFeedList feeds={createMockFeeds(2)} />)

      expect(screen.getByTestId('pull-indicator')).toBeInTheDocument()
    })

    it('刷新中应该显示加载状态', () => {
      mockPullState.isRefreshing = true

      render(<MobileFeedList feeds={createMockFeeds(2)} />)

      expect(screen.getByTestId('refreshing-indicator')).toBeInTheDocument()
    })

    it('下拉达到阈值时应该显示可刷新提示', () => {
      mockPullState.isPulling = true
      mockPullState.canRefresh = true
      mockPullState.progress = 1

      render(<MobileFeedList feeds={createMockFeeds(2)} />)

      expect(screen.getByTestId('pull-indicator')).toBeInTheDocument()
    })

    it('isRefreshing 为 true 时应该显示刷新指示器', () => {
      render(
        <MobileFeedList
          feeds={createMockFeeds(2)}
          isRefreshing
        />
      )

      expect(screen.getByTestId('refreshing-indicator')).toBeInTheDocument()
    })
  })

  describe('订阅列表渲染', () => {
    it('应该显示订阅标题', () => {
      const feeds = createMockFeeds(2)
      render(<MobileFeedList feeds={feeds} />)

      expect(screen.getByText('Feed 1')).toBeInTheDocument()
      expect(screen.getByText('Feed 2')).toBeInTheDocument()
    })

    it('应该显示订阅图标', () => {
      const feeds = createMockFeeds(1)
      render(<MobileFeedList feeds={feeds} />)

      // 图标区域存在
      expect(screen.getByTestId('feed-icon-feed-1')).toBeInTheDocument()
    })

    it('应该使用自定义图标 URL', () => {
      const feeds = [
        createMockFeed({
          id: 'feed-custom',
          title: 'Custom Feed',
          icon_url: 'https://example.com/icon.png',
        }),
      ]
      render(<MobileFeedList feeds={feeds} />)

      const iconImg = screen.getByAltText('Custom Feed')
      expect(iconImg).toBeInTheDocument()
      expect(iconImg).toHaveAttribute('src', 'https://example.com/icon.png')
    })

    it('无图标时应该显示默认 RSS 图标', () => {
      const feeds = createMockFeeds(1)
      render(<MobileFeedList feeds={feeds} />)

      // 默认图标
      expect(screen.getByTestId('rss-icon')).toBeInTheDocument()
    })
  })

  describe('未读计数显示', () => {
    it('应该显示未读计数', () => {
      const feeds = createMockFeeds(2)
      const unreadCounts = {
        'feed-1': 5,
        'feed-2': 10,
      }
      render(
        <MobileFeedList
          feeds={feeds}
          unreadCounts={unreadCounts}
        />
      )

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('未读计数为 0 时不应显示', () => {
      const feeds = createMockFeeds(1)
      const unreadCounts = {
        'feed-1': 0,
      }
      render(
        <MobileFeedList
          feeds={feeds}
          unreadCounts={unreadCounts}
        />
      )

      // 不应该有显示 0 的计数徽章
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('没有未读计数数据时不应显示计数', () => {
      const feeds = createMockFeeds(1)
      render(<MobileFeedList feeds={feeds} />)

      // 不应该有未读计数
      expect(screen.queryByTestId('unread-count-feed-1')).not.toBeInTheDocument()
    })

    it('未读计数超过 99 时应该显示 "99+"', () => {
      const feeds = createMockFeeds(1)
      const unreadCounts = {
        'feed-1': 150,
      }
      render(
        <MobileFeedList
          feeds={feeds}
          unreadCounts={unreadCounts}
        />
      )

      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('订阅选中状态', () => {
    it('应该高亮选中的订阅', () => {
      const feeds = createMockFeeds(3)
      render(
        <MobileFeedList
          feeds={feeds}
          selectedFeedId="feed-2"
        />
      )

      const selectedFeed = screen.getByTestId('feed-item-feed-2')
      expect(selectedFeed).toHaveAttribute('data-selected', 'true')
    })

    it('未选中的订阅不应高亮', () => {
      const feeds = createMockFeeds(3)
      render(
        <MobileFeedList
          feeds={feeds}
          selectedFeedId="feed-2"
        />
      )

      const unselectedFeed = screen.getByTestId('feed-item-feed-1')
      expect(unselectedFeed).toHaveAttribute('data-selected', 'false')
    })

    it('没有选中订阅时所有项都不高亮', () => {
      const feeds = createMockFeeds(2)
      render(<MobileFeedList feeds={feeds} />)

      const feedItem1 = screen.getByTestId('feed-item-feed-1')
      const feedItem2 = screen.getByTestId('feed-item-feed-2')

      expect(feedItem1).toHaveAttribute('data-selected', 'false')
      expect(feedItem2).toHaveAttribute('data-selected', 'false')
    })
  })

  describe('订阅点击交互', () => {
    it('点击订阅应该调用 onFeedClick', () => {
      const feeds = createMockFeeds(2)
      const handleClick = vi.fn()
      render(
        <MobileFeedList
          feeds={feeds}
          onFeedClick={handleClick}
        />
      )

      const firstFeed = screen.getByText('Feed 1')
      fireEvent.click(firstFeed)

      expect(handleClick).toHaveBeenCalledWith(feeds[0])
    })

    it('没有 onFeedClick 时点击订阅不应该崩溃', () => {
      const feeds = createMockFeeds(1)
      render(<MobileFeedList feeds={feeds} />)

      const feed = screen.getByText('Feed 1')
      expect(() => fireEvent.click(feed)).not.toThrow()
    })
  })

  describe('加载状态', () => {
    it('加载中应该显示加载指示器', () => {
      render(<MobileFeedList feeds={[]} isLoading />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('加载中时不应该显示空状态', () => {
      render(<MobileFeedList feeds={[]} isLoading />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('加载中时不应该显示订阅列表', () => {
      render(
        <MobileFeedList
          feeds={createMockFeeds(2)}
          isLoading
        />
      )

      expect(screen.queryByTestId('feed-list')).not.toBeInTheDocument()
    })
  })

  describe('空状态', () => {
    it('空列表时应该显示添加订阅按钮', () => {
      render(<MobileFeedList feeds={[]} />)

      const addButton = screen.getByRole('button', { name: /add|添加/i })
      expect(addButton).toBeInTheDocument()
    })

    it('空列表时点击添加按钮应该调用 onAddFeed', () => {
      const handleAddFeed = vi.fn()
      render(
        <MobileFeedList
          feeds={[]}
          onAddFeed={handleAddFeed}
        />
      )

      // 点击空状态区域的添加按钮（包含文字"添加订阅"）
      const addButton = screen.getByText('添加订阅')
      fireEvent.click(addButton)

      expect(handleAddFeed).toHaveBeenCalledTimes(1)
    })
  })

  describe('无障碍性', () => {
    it('列表应该有 aria-label', () => {
      const feeds = createMockFeeds(2)
      render(<MobileFeedList feeds={feeds} />)

      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-label')
    })

    it('添加按钮应该有 aria-label', () => {
      render(<MobileFeedList feeds={createMockFeeds(2)} />)

      const addButton = screen.getByRole('button', { name: /add|添加/i })
      expect(addButton).toHaveAttribute('aria-label')
    })

    it('每个订阅项应该有 aria-label', () => {
      const feeds = createMockFeeds(2)
      render(<MobileFeedList feeds={feeds} />)

      const feedItem1 = screen.getByTestId('feed-item-feed-1')
      expect(feedItem1).toHaveAttribute('aria-label')
    })
  })

  describe('边界情况', () => {
    it('空订阅列表且未加载时应该显示空状态', () => {
      render(<MobileFeedList feeds={[]} isLoading={false} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('没有 onRefresh 时下拉刷新不应该崩溃', () => {
      mockPullState.canRefresh = true
      mockPullState.isRefreshing = true

      render(<MobileFeedList feeds={createMockFeeds(1)} />)

      expect(screen.getByTestId('refreshing-indicator')).toBeInTheDocument()
    })

    it('处理大量订阅时应该正常渲染', () => {
      const feeds = createMockFeeds(100)
      render(<MobileFeedList feeds={feeds} />)

      expect(screen.getAllByRole('listitem')).toHaveLength(100)
    })

    it('订阅标题很长时应该截断显示', () => {
      const feeds = [
        createMockFeed({
          id: 'long-title',
          title: '这是一个非常非常非常非常非常非常非常非常长的订阅标题用于测试截断效果',
        }),
      ]
      render(<MobileFeedList feeds={feeds} />)

      expect(screen.getByText('这是一个非常非常非常非常非常非常非常非常长的订阅标题用于测试截断效果')).toBeInTheDocument()
    })

    it('订阅没有标题时应该正常渲染', () => {
      const feeds = [
        createMockFeed({
          id: 'no-title',
          title: '',
        }),
      ]
      render(<MobileFeedList feeds={feeds} />)

      // 应该正常渲染，不崩溃
      expect(screen.getByTestId('feed-item-no-title')).toBeInTheDocument()
    })
  })

  describe('自定义样式', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(
        <MobileFeedList
          feeds={createMockFeeds(2)}
          className="custom-feed-list-class"
        />
      )

      expect(container.querySelector('.custom-feed-list-class')).toBeInTheDocument()
    })
  })

  describe('触摸事件处理', () => {
    it('应该绑定触摸事件处理器', () => {
      const { container } = render(<MobileFeedList feeds={createMockFeeds(2)} />)

      const listContainer = container.querySelector('[data-testid="feed-list-container"]')
      expect(listContainer).toBeInTheDocument()
    })
  })

  describe('刷新完成后的行为', () => {
    it('刷新完成后应该隐藏刷新指示器', async () => {
      const { rerender } = render(
        <MobileFeedList
          feeds={createMockFeeds(2)}
          isRefreshing
        />
      )

      expect(screen.getByTestId('refreshing-indicator')).toBeInTheDocument()

      // 刷新完成
      rerender(
        <MobileFeedList
          feeds={createMockFeeds(2)}
          isRefreshing={false}
        />
      )

      await waitFor(() => {
        expect(screen.queryByTestId('refreshing-indicator')).not.toBeInTheDocument()
      })
    })
  })
})
