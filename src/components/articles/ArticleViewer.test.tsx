import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ArticleViewer } from './ArticleViewer'
import { DEFAULT_READER_SETTINGS } from '../../types'
import type { Article, ReaderSettings } from '../../types'
import { RssApi } from '../../lib/api'
import { clearAllCache, loadArticleViewState } from '../../lib/articleViewStateCache'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Star: () => 'Star',
  StarOff: () => 'StarOff',
  ExternalLink: () => 'ExternalLink',
  ChevronLeft: () => 'ChevronLeft',
  ChevronRight: () => 'ChevronRight',
  ChevronDown: () => 'ChevronDown',
  Settings: () => 'Settings',
  Clock: () => 'Clock',
  FileText: () => 'FileText',
  Loader2: () => 'Loader2',
  ArrowLeftRight: () => 'ArrowLeftRight',
  Sparkles: () => 'Sparkles',
  Languages: () => 'Languages',
}))

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}))

// Mock RssApi
vi.mock('../../lib/api', () => ({
  RssApi: {
    updateReadingProgress: vi.fn(),
    setArticleFavorite: vi.fn(),
    openLink: vi.fn(),
    fetchFullContent: vi.fn(),
    generateSummary: vi.fn(),
    translateArticle: vi.fn(),
    getArticle: vi.fn().mockResolvedValue(null),
  },
}))

// Mock useReader
const mockSelectArticle = vi.fn()
vi.mock('../../contexts/ReaderContext', () => ({
  useReader: () => ({
    selectedArticleId: 'article-1',
    selectArticle: mockSelectArticle,
    readerSettings: DEFAULT_READER_SETTINGS,
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  }),
}))

// Mock useUnifiedSettings
const mockOpenSettings = vi.fn()
vi.mock('../settings/UnifiedSettings', () => ({
  useUnifiedSettings: () => ({
    open: false,
    openSettings: mockOpenSettings,
    closeSettings: vi.fn(),
  }),
}))

// Mock useTheme
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    theme: 'light',
    setTheme: vi.fn(),
  }),
}))

const mockUpdateArticleInList = vi.fn()
let mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    updateArticleInList: mockUpdateArticleInList,
    get feeds() {
      return mockFeeds
    },
  }),
}))

const mockArticle: Article = {
  id: 'article-1',
  feed_id: 'feed-1',
  title: 'Test Article Title',
  link: 'https://example.com/article',
  description: 'Test description',
  content: '<p>Test content paragraph 1</p><p>Test content paragraph 2</p>',
  published_at: '2024-01-01T00:00:00Z',
  read: false,
  created_at: '2024-01-01T00:00:00Z',
  reading_progress: 0,
  favorite: false,
}

const mockArticles: Article[] = [
  mockArticle,
  {
    ...mockArticle,
    id: 'article-2',
    title: 'Second Article',
  },
  {
    ...mockArticle,
    id: 'article-3',
    title: 'Third Article',
  },
]

const mockReaderSettings: ReaderSettings = DEFAULT_READER_SETTINGS

describe('ArticleViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllCache()
    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
  })

  it('应该渲染文章标题', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
  })

  it('应该渲染文章内容', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    expect(screen.getByText('Test content paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Test content paragraph 2')).toBeInTheDocument()
  })

  it('应该调用 selectArticle(null) 当按 Escape 键', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockSelectArticle).toHaveBeenCalledWith(null)
  })

  it('应该显示收藏按钮并可以切换收藏状态', async () => {
    vi.mocked(RssApi.setArticleFavorite).mockResolvedValue(undefined)

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    // 初始状态未收藏
    const favoriteButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === '收藏 (F)'
    )
    expect(favoriteButton).toBeInTheDocument()

    if (favoriteButton) {
      fireEvent.click(favoriteButton)
      await waitFor(() => {
        expect(RssApi.setArticleFavorite).toHaveBeenCalledWith('article-1', true)
      })
    }
  })

  it('应该显示当前文章在列表中的位置', () => {
    render(
      <ArticleViewer
        article={mockArticles[0]}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('应该调用 onNext 当点击下一篇文章按钮', () => {
    const mockOnNext = vi.fn()

    render(
      <ArticleViewer
        article={mockArticles[0]}
        articles={mockArticles}
        onNext={mockOnNext}
        hasNext={true}
        hasPrevious={false}
        readerSettings={mockReaderSettings}
      />
    )

    const nextButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === '下一篇文章 (N 或 →)'
    )
    expect(nextButton).toBeInTheDocument()

    if (nextButton) {
      fireEvent.click(nextButton)
      expect(mockOnNext).toHaveBeenCalledTimes(1)
    }
  })

  it('应该调用 onPrevious 当点击上一篇文章按钮', () => {
    const mockOnPrevious = vi.fn()

    render(
      <ArticleViewer
        article={mockArticles[1]}
        articles={mockArticles}
        onPrevious={mockOnPrevious}
        hasNext={false}
        hasPrevious={true}
        readerSettings={mockReaderSettings}
      />
    )

    const prevButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === '上一篇文章 (P 或 ←)'
    )
    expect(prevButton).toBeInTheDocument()

    if (prevButton) {
      fireEvent.click(prevButton)
      expect(mockOnPrevious).toHaveBeenCalledTimes(1)
    }
  })

  it('应该不显示上一篇文章按钮当没有上一篇文章时', () => {
    render(
      <ArticleViewer
        article={mockArticles[0]}
        articles={mockArticles}
        hasNext={true}
        hasPrevious={false}
        readerSettings={mockReaderSettings}
      />
    )

    const prevButton = screen.queryByTitle('上一篇文章 (P 或 ←)')
    expect(prevButton).not.toBeInTheDocument()
  })

  it('应该不显示下一篇文章按钮当没有下一篇文章时', () => {
    render(
      <ArticleViewer
        article={mockArticles[2]}
        articles={mockArticles}
        hasNext={false}
        hasPrevious={true}
        readerSettings={mockReaderSettings}
      />
    )

    const nextButton = screen.queryByTitle('下一篇文章 (N 或 →)')
    expect(nextButton).not.toBeInTheDocument()
  })

  it('应该调用 openSettings 当点击设置按钮', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    const settingsButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === '阅读设置'
    )

    if (settingsButton) {
      fireEvent.click(settingsButton)
      expect(mockOpenSettings).toHaveBeenCalledWith('reading')
    }
  })

  it('应该移除 script 标签以防止 XSS', () => {
    const articleWithScript: Article = {
      ...mockArticle,
      content: '<p>Valid content</p><script>alert("XSS")</script>',
    }

    render(
      <ArticleViewer
        article={articleWithScript}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    expect(screen.getByText('Valid content')).toBeInTheDocument()
    expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument()
  })

  it('应该显示阅读进度条', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    // 进度条应该存在
    const progressBar = document.querySelector('.bg-primary')
    expect(progressBar).toBeInTheDocument()
  })

  it('应该不显示阅读进度条当 showProgress 为 false', () => {
    const settingsWithoutProgress: ReaderSettings = {
      ...mockReaderSettings,
      showProgress: false,
    }

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={settingsWithoutProgress}
      />
    )

    // 进度条容器应该不存在
    const progressContainer = document.querySelector('.h-1.bg-muted')
    expect(progressContainer).not.toBeInTheDocument()
  })

  it('应该自动显示已缓存的全文内容', () => {
    const articleWithFullContent: Article = {
      ...mockArticle,
      content: '<p>Original RSS content</p>',
      full_content: '<p>Full text fetched from web</p>',
    }

    render(
      <ArticleViewer
        article={articleWithFullContent}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    expect(screen.getByText('Full text fetched from web')).toBeInTheDocument()
    expect(screen.queryByText('Original RSS content')).not.toBeInTheDocument()
  })

  it('应该显示切换按钮当文章有全文内容时', () => {
    const articleWithFullContent: Article = {
      ...mockArticle,
      full_content: '<p>Full text</p>',
    }

    render(
      <ArticleViewer
        article={articleWithFullContent}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    const toggleButton = screen.getByTitle('切换为原始内容')
    expect(toggleButton).toBeInTheDocument()
  })

  it('应该不显示切换按钮当文章没有全文内容时', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    const toggleButton = screen.queryByTitle('切换为原始内容')
    expect(toggleButton).not.toBeInTheDocument()
    const toggleButton2 = screen.queryByTitle('切换为全文内容')
    expect(toggleButton2).not.toBeInTheDocument()
  })

  it('应该在点击切换按钮后显示原始内容', () => {
    const articleWithFullContent: Article = {
      ...mockArticle,
      content: '<p>Original RSS content</p>',
      full_content: '<p>Full text fetched from web</p>',
    }

    render(
      <ArticleViewer
        article={articleWithFullContent}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    const toggleButton = screen.getByTitle('切换为原始内容')
    fireEvent.click(toggleButton)

    expect(screen.getByText('Original RSS content')).toBeInTheDocument()
    expect(screen.queryByText('Full text fetched from web')).not.toBeInTheDocument()
  })

  it('应该在抓取全文后自动切换到全文显示', async () => {
    const fetchedArticle: Article = {
      ...mockArticle,
      full_content: '<p>Newly fetched full content</p>',
    }
    vi.mocked(RssApi.fetchFullContent).mockResolvedValue(fetchedArticle)

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    const fetchButton = screen.getByTitle('抓取全文')
    fireEvent.click(fetchButton)

    await waitFor(() => {
      expect(screen.getByText('Newly fetched full content')).toBeInTheDocument()
    })

    expect(mockUpdateArticleInList).toHaveBeenCalledWith(fetchedArticle)
  })

  it('应该在 feed 开启全文抓取时自动抓取全文', async () => {
    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: true, use_ai_summary: false }, unread_count: 0 }]

    const fetchedArticle: Article = {
      ...mockArticle,
      full_content: '<p>Auto fetched full content</p>',
    }
    vi.mocked(RssApi.fetchFullContent).mockResolvedValue(fetchedArticle)

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    await waitFor(() => {
      expect(RssApi.fetchFullContent).toHaveBeenCalledWith('article-1')
    })

    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
  })

  it('应该在 feed 未开启全文抓取时不自动抓取', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    expect(RssApi.fetchFullContent).not.toHaveBeenCalled()
  })

  it('应该在 feed 开启 AI 总结时自动生成 AI 摘要', async () => {
    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: true }, unread_count: 0 }]

    const summarizedArticle: Article = {
      ...mockArticle,
      ai_summary: '这是 AI 生成的摘要',
    }
    vi.mocked(RssApi.generateSummary).mockResolvedValue(summarizedArticle)

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    await waitFor(() => {
      expect(RssApi.generateSummary).toHaveBeenCalledWith('article-1')
    })

    expect(mockUpdateArticleInList).toHaveBeenCalledWith(summarizedArticle)

    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
  })

  it('应该在 feed 未开启 AI 总结时不自动生成摘要', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    expect(RssApi.generateSummary).not.toHaveBeenCalled()
  })

  it('应该在同时开启全文抓取和 AI 总结时，先抓取全文再生成摘要', async () => {
    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: true, use_ai_summary: true }, unread_count: 0 }]

    const fetchedArticle: Article = {
      ...mockArticle,
      full_content: '<p>Auto fetched full content</p>',
    }
    const summarizedArticle: Article = {
      ...fetchedArticle,
      ai_summary: '基于全文生成的摘要',
    }

    vi.mocked(RssApi.fetchFullContent).mockResolvedValue(fetchedArticle)
    vi.mocked(RssApi.generateSummary).mockResolvedValue(summarizedArticle)

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    await waitFor(() => {
      expect(RssApi.fetchFullContent).toHaveBeenCalledWith('article-1')
    })

    await waitFor(() => {
      expect(RssApi.generateSummary).toHaveBeenCalledWith('article-1')
    })

    expect(RssApi.fetchFullContent).toHaveBeenCalledBefore(vi.mocked(RssApi.generateSummary))

    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
  })

  it('应该在文章已有 AI 摘要时不重复生成', async () => {
    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: true }, unread_count: 0 }]

    const articleWithSummary: Article = {
      ...mockArticle,
      ai_summary: '已有的摘要',
    }

    render(
      <ArticleViewer
        article={articleWithSummary}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(RssApi.generateSummary).not.toHaveBeenCalled()

    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
  })

  it('应该在全文抓取失败时仍然尝试生成 AI 摘要', async () => {
    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: true, use_ai_summary: true }, unread_count: 0 }]

    vi.mocked(RssApi.fetchFullContent).mockRejectedValue(new Error('抓取失败'))
    const summarizedArticle: Article = {
      ...mockArticle,
      ai_summary: '基于原始内容生成的摘要',
    }
    vi.mocked(RssApi.generateSummary).mockResolvedValue(summarizedArticle)

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    await waitFor(() => {
      expect(RssApi.fetchFullContent).toHaveBeenCalledWith('article-1')
    })

    await waitFor(() => {
      expect(RssApi.generateSummary).toHaveBeenCalledWith('article-1')
    })

    mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
  })

  describe('state cache on article switch', () => {
    beforeEach(() => {
      clearAllCache()
    })

    it('should save state to cache when switching to a different article', async () => {
      const fetchedArticle: Article = {
        ...mockArticle,
        full_content: '<p>Fetched full content</p>',
      }
      vi.mocked(RssApi.fetchFullContent).mockResolvedValue(fetchedArticle)

      const { rerender } = render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const fetchButton = screen.getByTitle('抓取全文')
      fireEvent.click(fetchButton)

      await waitFor(() => {
        expect(screen.getByText('Fetched full content')).toBeInTheDocument()
      })

      rerender(
        <ArticleViewer
          article={mockArticles[1]}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const cached = loadArticleViewState('article-1')
      expect(cached).not.toBeNull()
      expect(cached?.fetchedFullContent).toBe('<p>Fetched full content</p>')
      expect(cached?.contentMode).toBe('fulltext')
    })

    it('should restore cached state when switching back to a previous article', async () => {
      const fetchedArticle: Article = {
        ...mockArticle,
        full_content: '<p>Fetched full content</p>',
      }
      vi.mocked(RssApi.fetchFullContent).mockResolvedValue(fetchedArticle)

      const { rerender } = render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const fetchButton = screen.getByTitle('抓取全文')
      fireEvent.click(fetchButton)

      await waitFor(() => {
        expect(screen.getByText('Fetched full content')).toBeInTheDocument()
      })

      rerender(
        <ArticleViewer
          article={mockArticles[1]}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      vi.mocked(RssApi.fetchFullContent).mockClear()

      rerender(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Fetched full content')).toBeInTheDocument()
      })

      expect(RssApi.fetchFullContent).not.toHaveBeenCalled()
    })

    it('should restore AI summary state when switching back', async () => {
      const summarizedArticle: Article = {
        ...mockArticle,
        ai_summary: 'Cached AI summary',
      }
      vi.mocked(RssApi.generateSummary).mockResolvedValue(summarizedArticle)

      const { rerender } = render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const summaryButton = screen.getByTitle('生成 AI 摘要')
      fireEvent.click(summaryButton)

      await waitFor(() => {
        expect(screen.getByText('Cached AI summary')).toBeInTheDocument()
      })

      rerender(
        <ArticleViewer
          article={mockArticles[1]}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      vi.mocked(RssApi.generateSummary).mockClear()

      rerender(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Cached AI summary')).toBeInTheDocument()
      })

      expect(RssApi.generateSummary).not.toHaveBeenCalled()
    })
  })
})
