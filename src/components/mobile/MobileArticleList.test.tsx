import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileArticleList } from './MobileArticleList'
import type { Article } from '@/types'

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

// Mock MobileArticleCard component
vi.mock('./MobileArticleCard', () => ({
  MobileArticleCard: vi.fn(({ article, onClick, onMarkRead, onToggleFavorite, showThumbnail, isSelected }) => (
    <div
      data-testid={`mobile-article-card-${article.id}`}
      data-read={article.read}
      data-selected={isSelected}
      data-show-thumbnail={showThumbnail}
      onClick={onClick}
      role="article"
      aria-label={article.title}
    >
      <span>{article.title}</span>
      {onMarkRead && (
        <button
          data-testid={`mark-read-${article.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onMarkRead()
          }}
        >
          Mark Read
        </button>
      )}
      {onToggleFavorite && (
        <button
          data-testid={`toggle-favorite-${article.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
        >
          Toggle Favorite
        </button>
      )}
    </div>
  )),
}))

// Helper to create mock article
function createMockArticle(overrides?: Partial<Article>): Article {
  return {
    id: `article-${Math.random().toString(36).slice(2, 9)}`,
    feed_id: 'feed-1',
    title: `Test Article ${Math.random().toString(36).slice(2, 5)}`,
    link: 'https://example.com/article/1',
    description: 'Test description',
    published_at: '2025-02-20T10:00:00Z',
    read: false,
    created_at: '2025-02-20T10:00:00Z',
    ...overrides,
  }
}

// Helper to create multiple articles
function createMockArticles(count: number): Article[] {
  return Array.from({ length: count }, (_, i) =>
    createMockArticle({
      id: `article-${i + 1}`,
      title: `Article ${i + 1}`,
    })
  )
}

describe('MobileArticleList', () => {
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
      render(<MobileArticleList articles={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('应该显示自定义空状态提示', () => {
      render(
        <MobileArticleList
          articles={[]}
          emptyMessage="暂无文章"
        />
      )

      expect(screen.getByText('暂无文章')).toBeInTheDocument()
    })

    it('应该渲染文章列表', () => {
      const articles = createMockArticles(3)
      render(<MobileArticleList articles={articles} />)

      expect(screen.getByTestId('article-list')).toBeInTheDocument()
      expect(screen.getByText('Article 1')).toBeInTheDocument()
      expect(screen.getByText('Article 2')).toBeInTheDocument()
      expect(screen.getByText('Article 3')).toBeInTheDocument()
    })

    it('应该有正确的列表容器角色', () => {
      const articles = createMockArticles(2)
      render(<MobileArticleList articles={articles} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('工具栏', () => {
    it('应该显示标题', () => {
      render(
        <MobileArticleList
          articles={createMockArticles(2)}
          title="我的订阅"
        />
      )

      expect(screen.getByText('我的订阅')).toBeInTheDocument()
    })

    it('应该显示返回按钮当有 onBack 回调时', () => {
      const handleBack = vi.fn()
      render(
        <MobileArticleList
          articles={createMockArticles(2)}
          onBack={handleBack}
        />
      )

      const backButton = screen.getByRole('button', { name: /back|返回/i })
      expect(backButton).toBeInTheDocument()
    })

    it('点击返回按钮应该调用 onBack', () => {
      const handleBack = vi.fn()
      render(
        <MobileArticleList
          articles={createMockArticles(2)}
          onBack={handleBack}
        />
      )

      const backButton = screen.getByRole('button', { name: /back|返回/i })
      fireEvent.click(backButton)

      expect(handleBack).toHaveBeenCalledTimes(1)
    })

    it('应该显示刷新按钮', () => {
      render(<MobileArticleList articles={createMockArticles(2)} />)

      const refreshButton = screen.getByRole('button', { name: /refresh|刷新/i })
      expect(refreshButton).toBeInTheDocument()
    })

    it('点击刷新按钮应该调用 onRefresh', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)
      render(
        <MobileArticleList
          articles={createMockArticles(2)}
          onRefresh={handleRefresh}
        />
      )

      const refreshButton = screen.getByRole('button', { name: /refresh|刷新/i })
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(handleRefresh).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('下拉刷新', () => {
    it('下拉时应该显示刷新指示器', () => {
      mockPullState.isPulling = true
      mockPullState.progress = 0.5
      mockPullState.distance = 40

      render(<MobileArticleList articles={createMockArticles(2)} />)

      expect(screen.getByTestId('pull-indicator')).toBeInTheDocument()
    })

    it('刷新中应该显示加载状态', () => {
      mockPullState.isRefreshing = true

      render(<MobileArticleList articles={createMockArticles(2)} />)

      expect(screen.getByTestId('refreshing-indicator')).toBeInTheDocument()
    })

    it('下拉达到阈值时应该显示可刷新提示', () => {
      mockPullState.isPulling = true
      mockPullState.canRefresh = true
      mockPullState.progress = 1

      render(<MobileArticleList articles={createMockArticles(2)} />)

      expect(screen.getByTestId('pull-indicator')).toBeInTheDocument()
    })
  })

  describe('文章交互', () => {
    it('点击文章应该调用 onArticleClick', () => {
      const articles = createMockArticles(2)
      const handleClick = vi.fn()
      render(
        <MobileArticleList
          articles={articles}
          onArticleClick={handleClick}
        />
      )

      const firstArticle = screen.getByText('Article 1')
      fireEvent.click(firstArticle)

      expect(handleClick).toHaveBeenCalledWith(articles[0])
    })

    it('应该高亮选中的文章', () => {
      const articles = createMockArticles(3)
      render(
        <MobileArticleList
          articles={articles}
          selectedArticleId="article-2"
        />
      )

      const selectedCard = screen.getByTestId('mobile-article-card-article-2')
      expect(selectedCard).toHaveAttribute('data-selected', 'true')
    })

    it('应该传递 showThumbnails 到 MobileArticleCard', () => {
      const articles = createMockArticles(1)
      render(
        <MobileArticleList
          articles={articles}
          showThumbnails={false}
        />
      )

      const card = screen.getByTestId('mobile-article-card-article-1')
      expect(card).toHaveAttribute('data-show-thumbnail', 'false')
    })
  })

  describe('滑动操作', () => {
    it('应该传递 onMarkRead 回调到 MobileArticleCard', () => {
      const articles = createMockArticles(1)
      const handleMarkRead = vi.fn()
      render(
        <MobileArticleList
          articles={articles}
          onMarkRead={handleMarkRead}
        />
      )

      const markReadBtn = screen.getByTestId('mark-read-article-1')
      fireEvent.click(markReadBtn)

      expect(handleMarkRead).toHaveBeenCalledWith('article-1')
    })

    it('应该传递 onToggleFavorite 回调到 MobileArticleCard', () => {
      const articles = createMockArticles(1)
      const handleToggleFavorite = vi.fn()
      render(
        <MobileArticleList
          articles={articles}
          onToggleFavorite={handleToggleFavorite}
        />
      )

      const favoriteBtn = screen.getByTestId('toggle-favorite-article-1')
      fireEvent.click(favoriteBtn)

      expect(handleToggleFavorite).toHaveBeenCalledWith('article-1')
    })
  })

  describe('加载状态', () => {
    it('加载中应该显示加载指示器', () => {
      render(<MobileArticleList articles={[]} isLoading />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('加载中时不应该显示空状态', () => {
      render(<MobileArticleList articles={[]} isLoading />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('isRefreshing 为 true 时应该显示刷新指示器', () => {
      render(
        <MobileArticleList
          articles={createMockArticles(2)}
          isRefreshing
        />
      )

      expect(screen.getByTestId('refreshing-indicator')).toBeInTheDocument()
    })
  })

  describe('无障碍性', () => {
    it('列表应该有 aria-label', () => {
      render(<MobileArticleList articles={createMockArticles(2)} />)

      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-label')
    })

    it('刷新按钮应该有 aria-label', () => {
      render(<MobileArticleList articles={createMockArticles(2)} />)

      const refreshButton = screen.getByRole('button', { name: /refresh|刷新/i })
      expect(refreshButton).toHaveAttribute('aria-label')
    })
  })

  describe('边界情况', () => {
    it('空文章列表且未加载时应该显示空状态', () => {
      render(<MobileArticleList articles={[]} isLoading={false} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('没有 onArticleClick 时不应该崩溃', () => {
      const articles = createMockArticles(1)
      render(<MobileArticleList articles={articles} />)

      const article = screen.getByText('Article 1')
      expect(() => fireEvent.click(article)).not.toThrow()
    })

    it('没有 onRefresh 时点击刷新按钮不应该崩溃', () => {
      render(<MobileArticleList articles={createMockArticles(1)} />)

      const refreshButton = screen.getByRole('button', { name: /refresh|刷新/i })
      expect(() => fireEvent.click(refreshButton)).not.toThrow()
    })

    it('没有 onMarkRead 时应该正常渲染', () => {
      const articles = createMockArticles(1)
      render(<MobileArticleList articles={articles} />)

      expect(screen.getByTestId('mobile-article-card-article-1')).toBeInTheDocument()
    })

    it('没有 onToggleFavorite 时应该正常渲染', () => {
      const articles = createMockArticles(1)
      render(<MobileArticleList articles={articles} />)

      expect(screen.getByTestId('mobile-article-card-article-1')).toBeInTheDocument()
    })

    it('处理大量文章时应该正常渲染', () => {
      const articles = createMockArticles(100)
      render(<MobileArticleList articles={articles} />)

      expect(screen.getAllByRole('article')).toHaveLength(100)
    })
  })

  describe('自定义样式', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(
        <MobileArticleList
          articles={createMockArticles(2)}
          className="custom-list-class"
        />
      )

      expect(container.querySelector('.custom-list-class')).toBeInTheDocument()
    })
  })
})
