import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArticleList } from './ArticleList'

const mockLoadArticles = vi.fn()
const mockMarkArticleRead = vi.fn()
const mockOpenLink = vi.fn()
const mockMarkAllRead = vi.fn()
const mockRefreshFeed = vi.fn()
const mockRefreshAllFeeds = vi.fn()

let mockSelectedFeedId: string | null = null
let mockShowFavoritesOnly = false
let mockArticles: unknown[] = []

let mockIsLoading = false

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    articles: mockArticles,
    selectedFeedId: mockSelectedFeedId,
    isLoading: mockIsLoading,
    markArticleRead: mockMarkArticleRead,
    openLink: mockOpenLink,
    loadArticles: mockLoadArticles,
    markAllRead: mockMarkAllRead,
    feeds: [
      { feed: { id: 'feed-1', title: 'Tech Blog', url: '' }, unread_count: 2 },
    ],
    showFavoritesOnly: mockShowFavoritesOnly,
    refreshFeed: mockRefreshFeed,
    refreshAllFeeds: mockRefreshAllFeeds,
    refreshProgress: { isRefreshing: false, current: 0, total: 0, currentFeedTitle: '' },
  }),
}))

vi.mock('../../contexts/ReaderContext', () => ({
  useReader: () => ({
    selectedArticleId: null,
    selectArticle: vi.fn(),
  }),
}))

vi.mock('lucide-react', () => ({
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
  CheckCheck: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Filter: (props: Record<string, unknown>) => <svg data-testid="filter-icon" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="external-icon" {...props} />,
  Star: (props: Record<string, unknown>) => <svg data-testid="star-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
}))

describe('ArticleList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedFeedId = null
    mockShowFavoritesOnly = false
    mockArticles = []
    mockIsLoading = false
  })

  it('应该在初始挂载时加载全部文章（selectedFeedId 为 null）', () => {
    mockSelectedFeedId = null
    mockShowFavoritesOnly = false

    render(<ArticleList />)

    expect(mockLoadArticles).toHaveBeenCalled()
  })

  it('应该在选中特定 feed 时加载该 feed 的文章', () => {
    mockSelectedFeedId = 'feed-1'

    render(<ArticleList />)

    expect(mockLoadArticles).toHaveBeenCalledWith('feed-1')
  })

  it('应该在收藏模式下不调用 loadArticles', () => {
    mockSelectedFeedId = null
    mockShowFavoritesOnly = true

    render(<ArticleList />)

    expect(mockLoadArticles).not.toHaveBeenCalled()
  })

  it('应该显示"全部文章"标题当 selectedFeedId 为 null', () => {
    mockSelectedFeedId = null
    mockShowFavoritesOnly = false

    render(<ArticleList />)

    expect(screen.getByText('全部文章')).toBeInTheDocument()
  })

  it('应该显示"收藏文章"标题当 showFavoritesOnly 为 true', () => {
    mockShowFavoritesOnly = true

    render(<ArticleList />)

    expect(screen.getByText('收藏文章')).toBeInTheDocument()
  })

  it('应该显示加载状态', () => {
    mockIsLoading = true
    render(<ArticleList />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('应该显示空状态', () => {
    mockArticles = []
    render(<ArticleList />)
    expect(screen.getByText('暂无文章')).toBeInTheDocument()
  })

  it('应该显示收藏空状态', () => {
    mockShowFavoritesOnly = true
    mockArticles = []
    render(<ArticleList />)
    expect(screen.getByText('暂无收藏文章')).toBeInTheDocument()
  })

  it('应该渲染文章列表', () => {
    mockArticles = [
      {
        id: 'a1',
        feed_id: 'feed-1',
        title: 'Test Article',
        link: 'https://example.com',
        read: false,
        created_at: '2026-01-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
      },
    ]
    render(<ArticleList />)
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('应该在选中 feed 时显示 feed 标题', () => {
    mockSelectedFeedId = 'feed-1'
    render(<ArticleList />)
    expect(screen.getByText('Tech Blog')).toBeInTheDocument()
  })

  it('应该在全部文章模式下显示 feed 名称', () => {
    mockSelectedFeedId = null
    mockShowFavoritesOnly = false
    mockArticles = [
      {
        id: 'a1',
        feed_id: 'feed-1',
        title: 'Test Article',
        link: 'https://example.com',
        read: false,
        created_at: '2026-01-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
      },
    ]
    render(<ArticleList />)
    expect(screen.getByText('Tech Blog')).toBeInTheDocument()
  })

  it('应该点击刷新按钮时调用 refreshAllFeeds', () => {
    mockSelectedFeedId = null
    render(<ArticleList />)
    const refreshBtn = screen.getByLabelText('Refresh')
    fireEvent.click(refreshBtn)
    expect(mockRefreshAllFeeds).toHaveBeenCalled()
  })

  it('应该在选中 feed 时点击刷新调用 refreshFeed', async () => {
    mockSelectedFeedId = 'feed-1'
    mockRefreshFeed.mockResolvedValue(undefined)
    render(<ArticleList />)
    const refreshBtn = screen.getByLabelText('Refresh')
    fireEvent.click(refreshBtn)
    expect(mockRefreshFeed).toHaveBeenCalledWith('feed-1')
  })

  it('应该点击全部已读按钮时调用 markAllRead', () => {
    mockSelectedFeedId = 'feed-1'
    render(<ArticleList />)
    const markAllBtn = screen.getByLabelText('Mark all as read')
    fireEvent.click(markAllBtn)
    expect(mockMarkAllRead).toHaveBeenCalledWith('feed-1')
  })

  it('应该在点击文章时选中文章并标记为已读', () => {
    mockArticles = [
      {
        id: 'a1',
        feed_id: 'feed-1',
        title: 'Unread Article',
        link: 'https://example.com',
        read: false,
        created_at: '2026-01-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
      },
    ]
    render(<ArticleList />)
    fireEvent.click(screen.getByText('Unread Article'))
    expect(mockMarkArticleRead).toHaveBeenCalledWith('a1', true)
  })

  it('应该在收藏模式下不显示 feed 名称', () => {
    mockShowFavoritesOnly = true
    mockArticles = [
      {
        id: 'a1',
        feed_id: 'feed-1',
        title: 'Fav Article',
        link: 'https://example.com',
        read: false,
        created_at: '2026-01-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
      },
    ]
    render(<ArticleList />)
    // In favorites mode, feed name should not be shown in article cards
    expect(screen.queryAllByText('Tech Blog')).toHaveLength(0)
    // The header shows "收藏文章", not "Tech Blog"
    expect(screen.getByText('收藏文章')).toBeInTheDocument()
  })

  it('应该在选中特定 feed 时不显示 feed 名称', () => {
    mockSelectedFeedId = 'feed-1'
    mockArticles = [
      {
        id: 'a1',
        feed_id: 'feed-1',
        title: 'Feed Article',
        link: 'https://example.com',
        read: false,
        created_at: '2026-01-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
      },
    ]
    render(<ArticleList />)
    // Header shows feed title
    expect(screen.getByText('Tech Blog')).toBeInTheDocument()
  })
})
