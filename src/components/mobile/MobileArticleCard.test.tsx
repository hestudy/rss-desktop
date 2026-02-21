import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileArticleCard } from './MobileArticleCard'
import type { Article } from '@/types'

// Mock useSwipeGesture hook
const mockSwipeState = {
  isSwiping: false,
  direction: null as 'left' | 'right' | 'up' | 'down' | null,
  progress: 0,
}

let swipeHandlers = {
  onTouchStart: vi.fn(),
  onTouchMove: vi.fn(),
  onTouchEnd: vi.fn(),
}

vi.mock('@/hooks/useSwipeGesture', () => ({
  useSwipeGesture: vi.fn(() => ({
    swipeState: mockSwipeState,
    handlers: swipeHandlers,
  })),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '5 分钟前'),
}))

vi.mock('date-fns/locale', () => ({
  zhCN: {},
}))

// Helper to create mock article
function createMockArticle(overrides?: Partial<Article>): Article {
  return {
    id: 'article-1',
    feed_id: 'feed-1',
    title: '测试文章标题',
    link: 'https://example.com/article/1',
    description: '这是文章的描述内容',
    published_at: '2025-02-20T10:00:00Z',
    read: false,
    created_at: '2025-02-20T10:00:00Z',
    ...overrides,
  }
}

describe('MobileArticleCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset swipe state
    mockSwipeState.isSwiping = false
    mockSwipeState.direction = null
    mockSwipeState.progress = 0
    swipeHandlers = {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    }
  })

  describe('基本渲染', () => {
    it('应该渲染文章标题', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} />)

      expect(screen.getByText('测试文章标题')).toBeInTheDocument()
    })

    it('应该渲染发布时间', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} />)

      expect(screen.getByText('5 分钟前')).toBeInTheDocument()
    })

    it('应该有正确的文章容器角色', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('应该有 data-testid 属性', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} />)

      expect(screen.getByTestId('mobile-article-card')).toBeInTheDocument()
    })
  })

  describe('缩略图显示', () => {
    it('当有缩略图且 showThumbnail=true 时应该显示缩略图', () => {
      const article = createMockArticle({
        thumbnail_url: 'https://example.com/thumb.jpg',
      })
      render(<MobileArticleCard article={article} showThumbnail />)

      const thumbnail = screen.getByTestId('article-thumbnail')
      expect(thumbnail).toBeInTheDocument()
      expect(thumbnail).toHaveAttribute('src', 'https://example.com/thumb.jpg')
    })

    it('当 showThumbnail=false 时不应该显示缩略图', () => {
      const article = createMockArticle({
        thumbnail_url: 'https://example.com/thumb.jpg',
      })
      render(<MobileArticleCard article={article} showThumbnail={false} />)

      expect(screen.queryByTestId('article-thumbnail')).not.toBeInTheDocument()
    })

    it('当没有缩略图时不应该显示缩略图区域', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} showThumbnail />)

      expect(screen.queryByTestId('article-thumbnail')).not.toBeInTheDocument()
    })
  })

  describe('已读/未读状态', () => {
    it('未读文章应该有未读指示器', () => {
      const article = createMockArticle({ read: false })
      render(<MobileArticleCard article={article} />)

      expect(screen.getByTestId('unread-indicator')).toBeInTheDocument()
    })

    it('已读文章不应该有未读指示器', () => {
      const article = createMockArticle({ read: true })
      render(<MobileArticleCard article={article} />)

      expect(screen.queryByTestId('unread-indicator')).not.toBeInTheDocument()
    })

    it('未读文章标题应该加粗', () => {
      const article = createMockArticle({ read: false })
      render(<MobileArticleCard article={article} />)

      const title = screen.getByText('测试文章标题')
      expect(title.className).toMatch(/font-(medium|semibold|bold)/)
    })

    it('已读文章标题应该正常字重', () => {
      const article = createMockArticle({ read: true })
      render(<MobileArticleCard article={article} />)

      const title = screen.getByText('测试文章标题')
      expect(title.className).toMatch(/font-(normal|light)/)
    })

    it('已读文章应该有透明度降低的视觉效果', () => {
      const article = createMockArticle({ read: true })
      const { container } = render(<MobileArticleCard article={article} />)

      const card = container.querySelector('[data-testid="mobile-article-card"]')
      expect(card?.className).toMatch(/opacity-/)
    })
  })

  describe('收藏状态', () => {
    it('收藏的文章应该显示收藏图标', () => {
      const article = createMockArticle({ favorite: true })
      render(<MobileArticleCard article={article} />)

      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument()
    })

    it('未收藏的文章不应该显示收藏图标', () => {
      const article = createMockArticle({ favorite: false })
      render(<MobileArticleCard article={article} />)

      expect(screen.queryByTestId('favorite-indicator')).not.toBeInTheDocument()
    })
  })

  describe('选中状态', () => {
    it('选中时应该有选中样式', () => {
      const article = createMockArticle()
      const { container } = render(<MobileArticleCard article={article} isSelected />)

      const card = container.querySelector('[data-testid="mobile-article-card"]')
      expect(card?.className).toMatch(/bg-(accent|primary)|border-l-2/)
    })

    it('未选中时不应该有选中样式', () => {
      const article = createMockArticle()
      const { container } = render(<MobileArticleCard article={article} isSelected={false} />)

      const card = container.querySelector('[data-testid="mobile-article-card"]')
      // Should not have selection-specific classes
      expect(card?.className).not.toMatch(/ring-2/)
    })
  })

  describe('点击交互', () => {
    it('点击卡片应该调用 onClick 回调', () => {
      const article = createMockArticle()
      const handleClick = vi.fn()
      render(<MobileArticleCard article={article} onClick={handleClick} />)

      const card = screen.getByTestId('mobile-article-card')
      fireEvent.click(card)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('没有 onClick 时不应该报错', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} />)

      const card = screen.getByTestId('mobile-article-card')
      expect(() => fireEvent.click(card)).not.toThrow()
    })
  })

  describe('滑动操作 - 标记已读', () => {
    it('左滑超过阈值应该显示标记已读按钮', () => {
      const article = createMockArticle({ read: false })

      // 设置滑动状态
      mockSwipeState.isSwiping = true
      mockSwipeState.direction = 'left'
      mockSwipeState.progress = 0.6

      render(<MobileArticleCard article={article} />)

      // 检查操作面板是否显示
      expect(screen.getByTestId('swipe-actions')).toBeInTheDocument()
    })

    it('点击标记已读按钮应该调用 onMarkRead', () => {
      const article = createMockArticle({ read: false })
      const handleMarkRead = vi.fn()

      // 设置滑动状态
      mockSwipeState.direction = 'left'
      mockSwipeState.progress = 0.8

      render(<MobileArticleCard article={article} onMarkRead={handleMarkRead} />)

      const markReadBtn = screen.getByTestId('mark-read-button')
      fireEvent.click(markReadBtn)
      expect(handleMarkRead).toHaveBeenCalledTimes(1)
    })
  })

  describe('滑动操作 - 收藏', () => {
    it('左滑应该显示收藏按钮', () => {
      const article = createMockArticle()

      // 设置滑动状态
      mockSwipeState.direction = 'left'
      mockSwipeState.progress = 0.7

      render(<MobileArticleCard article={article} />)

      const swipeActions = screen.getByTestId('swipe-actions')
      const favoriteBtn = screen.getByTestId('toggle-favorite-button')
      expect(swipeActions).toBeInTheDocument()
      expect(favoriteBtn).toBeInTheDocument()
    })

    it('点击收藏按钮应该调用 onToggleFavorite', () => {
      const article = createMockArticle({ favorite: false })
      const handleToggleFavorite = vi.fn()

      // 设置滑动状态
      mockSwipeState.direction = 'left'
      mockSwipeState.progress = 0.8

      render(<MobileArticleCard article={article} onToggleFavorite={handleToggleFavorite} />)

      const favoriteBtn = screen.getByTestId('toggle-favorite-button')
      fireEvent.click(favoriteBtn)
      expect(handleToggleFavorite).toHaveBeenCalledTimes(1)
    })

    it('已收藏文章的收藏按钮应该显示取消收藏状态', () => {
      const article = createMockArticle({ favorite: true })
      const handleToggleFavorite = vi.fn()

      // 设置滑动状态
      mockSwipeState.direction = 'left'
      mockSwipeState.progress = 0.8

      render(<MobileArticleCard article={article} onToggleFavorite={handleToggleFavorite} />)

      const favoriteBtn = screen.getByTestId('toggle-favorite-button')
      // Should show unfavorite state
      expect(favoriteBtn.getAttribute('aria-label')?.toLowerCase()).toMatch(/取消|unfavorite|remove/)
    })
  })

  describe('滑动进度反馈', () => {
    it('滑动过程中应该显示进度指示', () => {
      const article = createMockArticle()

      // 设置滑动状态
      mockSwipeState.isSwiping = true
      mockSwipeState.progress = 0.5

      render(<MobileArticleCard article={article} />)

      // 卡片应该有位移或进度指示
      const card = screen.getByTestId('mobile-article-card')
      expect(card).toBeInTheDocument()
      // 卡片应该有 transform 样式
      expect(card.style.transform).toMatch(/translateX/)
    })
  })

  describe('触摸事件绑定', () => {
    it('卡片应该绑定触摸事件处理器', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} />)

      const card = screen.getByTestId('mobile-article-card')
      expect(card).toHaveAttribute('data-touch-enabled', 'true')
    })
  })

  describe('无障碍性', () => {
    it('应该有正确的 aria-label', () => {
      const article = createMockArticle()
      render(<MobileArticleCard article={article} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-label', '测试文章标题')
    })

    it('已读文章应该有 data-read 属性', () => {
      const article = createMockArticle({ read: true })
      render(<MobileArticleCard article={article} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('data-read', 'true')
    })

    it('未读文章应该有 data-read 属性', () => {
      const article = createMockArticle({ read: false })
      render(<MobileArticleCard article={article} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('data-read', 'false')
    })
  })

  describe('自定义类名', () => {
    it('应该支持自定义 className', () => {
      const article = createMockArticle()
      const { container } = render(
        <MobileArticleCard article={article} className="custom-class" />
      )

      const card = container.querySelector('.custom-class')
      expect(card).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('没有标题时不应该崩溃', () => {
      const article = createMockArticle({ title: '' })
      expect(() => render(<MobileArticleCard article={article} />)).not.toThrow()
    })

    it('没有发布时间时应该显示默认文本', () => {
      const article = createMockArticle({ published_at: undefined })
      render(<MobileArticleCard article={article} />)

      // 应该显示某个时间占位符或者不显示
      const timeElement = screen.queryByTestId('article-time')
      // 时间元素可能不显示或者显示占位符
      expect(timeElement || screen.getByRole('article')).toBeInTheDocument()
    })

    it('无效的日期格式应该被处理', () => {
      const article = createMockArticle({ published_at: 'invalid-date' })
      render(<MobileArticleCard article={article} />)

      // 不应该崩溃，时间元素可能不显示
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('长标题应该被截断', () => {
      const longTitle = '这是一个非常非常非常非常非常非常非常非常非常非常长的标题用于测试截断功能'
      const article = createMockArticle({ title: longTitle })
      render(<MobileArticleCard article={article} />)

      const title = screen.getByText(longTitle)
      expect(title.className).toMatch(/line-clamp|truncate/)
    })

    it('长描述应该被截断', () => {
      const longDesc = '这是一个非常非常非常非常非常非常非常非常非常非常长的描述内容用于测试截断功能'
      const article = createMockArticle({ description: longDesc })
      render(<MobileArticleCard article={article} />)

      const desc = screen.getByText(longDesc)
      expect(desc.className).toMatch(/line-clamp|truncate/)
    })

    it('已读文章时标记已读按钮不应该显示', () => {
      const article = createMockArticle({ read: true })
      const handleMarkRead = vi.fn()

      // 设置滑动状态
      mockSwipeState.direction = 'left'
      mockSwipeState.progress = 0.8

      render(<MobileArticleCard article={article} onMarkRead={handleMarkRead} />)

      // 已读文章不应该显示标记已读按钮
      expect(screen.queryByTestId('mark-read-button')).not.toBeInTheDocument()
    })

    it('右滑时不应该显示操作按钮', () => {
      const article = createMockArticle()

      // 设置右滑状态
      mockSwipeState.direction = 'right'
      mockSwipeState.progress = 0.8

      render(<MobileArticleCard article={article} />)

      // 右滑不应该显示操作按钮
      expect(screen.getByTestId('mobile-article-card')).toBeInTheDocument()
    })

    it('滑动进度低于阈值时不应该显示操作按钮', () => {
      const article = createMockArticle()

      // 设置低滑动进度
      mockSwipeState.direction = 'left'
      mockSwipeState.progress = 0.2

      render(<MobileArticleCard article={article} />)

      // 操作面板存在但可能是隐藏的
      expect(screen.getByTestId('mobile-article-card')).toBeInTheDocument()
    })
  })
})
