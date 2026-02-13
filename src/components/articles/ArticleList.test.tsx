import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    articles: mockArticles,
    selectedFeedId: mockSelectedFeedId,
    isLoading: false,
    markArticleRead: mockMarkArticleRead,
    openLink: mockOpenLink,
    loadArticles: mockLoadArticles,
    markAllRead: mockMarkAllRead,
    feeds: [],
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
}))

describe('ArticleList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedFeedId = null
    mockShowFavoritesOnly = false
    mockArticles = []
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
})
