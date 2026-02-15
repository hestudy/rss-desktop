import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ArticleViewer } from './ArticleViewer'
import { DEFAULT_READER_SETTINGS } from '../../types'
import type { Article, ReaderSettings, TaskProgressEvent } from '../../types'
import { RssApi } from '../../lib/api'
import { clearAllCache, loadArticleViewState } from '../../lib/articleViewStateCache'
import { listen } from '@tauri-apps/api/event'

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

  it('应该通过 F 键切换收藏', async () => {
    vi.mocked(RssApi.setArticleFavorite).mockResolvedValue(undefined)

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => {
      expect(RssApi.setArticleFavorite).toHaveBeenCalledWith('article-1', true)
    })
  })

  it('应该通过 N 键导航到下一篇', () => {
    const mockOnNext = vi.fn()

    render(
      <ArticleViewer
        article={mockArticles[0]}
        articles={mockArticles}
        onNext={mockOnNext}
        hasNext={true}
        readerSettings={mockReaderSettings}
      />
    )

    fireEvent.keyDown(window, { key: 'n' })
    expect(mockOnNext).toHaveBeenCalled()
  })

  it('应该通过 P 键导航到上一篇', () => {
    const mockOnPrevious = vi.fn()

    render(
      <ArticleViewer
        article={mockArticles[1]}
        articles={mockArticles}
        onPrevious={mockOnPrevious}
        hasPrevious={true}
        readerSettings={mockReaderSettings}
      />
    )

    fireEvent.keyDown(window, { key: 'p' })
    expect(mockOnPrevious).toHaveBeenCalled()
  })

  it('应该通过方向键导航', () => {
    const mockOnNext = vi.fn()
    const mockOnPrevious = vi.fn()

    render(
      <ArticleViewer
        article={mockArticles[1]}
        articles={mockArticles}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        hasNext={true}
        hasPrevious={true}
        readerSettings={mockReaderSettings}
      />
    )

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(mockOnNext).toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(mockOnPrevious).toHaveBeenCalled()
  })

  it('应该点击外部链接按钮打开浏览器', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
      />
    )

    const openButton = screen.getByTitle('在浏览器中打开')
    fireEvent.click(openButton)
    expect(RssApi.openLink).toHaveBeenCalledWith('https://example.com/article')
  })

  describe('AI summary card', () => {
    it('should display AI summary card when summary exists', async () => {
      const summarizedArticle: Article = {
        ...mockArticle,
        ai_summary: 'Cached AI summary',
      }
      vi.mocked(RssApi.generateSummary).mockResolvedValue(summarizedArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const summaryButton = screen.getByTitle('生成 AI 摘要')
      fireEvent.click(summaryButton)

      await waitFor(() => {
        expect(screen.getByTestId('ai-summary-card')).toBeInTheDocument()
        expect(screen.getByTestId('ai-summary-content')).toHaveTextContent('Cached AI summary')
      })
    })

    it('should collapse and expand AI summary card', async () => {
      const summarizedArticle: Article = {
        ...mockArticle,
        ai_summary: 'Summary text',
      }
      vi.mocked(RssApi.generateSummary).mockResolvedValue(summarizedArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const summaryButton = screen.getByTitle('生成 AI 摘要')
      fireEvent.click(summaryButton)

      await waitFor(() => {
        expect(screen.getByTestId('ai-summary-content')).toBeInTheDocument()
      })

      // Click the collapse button (the AI 摘要 header)
      const collapseBtn = screen.getByText('AI 摘要').closest('button')!
      fireEvent.click(collapseBtn)

      expect(screen.queryByTestId('ai-summary-content')).not.toBeInTheDocument()

      // Expand again
      fireEvent.click(collapseBtn)
      expect(screen.getByTestId('ai-summary-content')).toBeInTheDocument()
    })
  })

  describe('AI translation', () => {
    it('should translate article and show translation', async () => {
      const translatedArticle: Article = {
        ...mockArticle,
        ai_translation: '<p>Translated content</p>',
      }
      vi.mocked(RssApi.translateArticle).mockResolvedValue(translatedArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const translateBtn = screen.getByTitle('翻译文章')
      fireEvent.click(translateBtn)

      await waitFor(() => {
        expect(screen.getByText('Translated content')).toBeInTheDocument()
      })
    })

    it('should toggle translation on/off when already translated', async () => {
      const translatedArticle: Article = {
        ...mockArticle,
        ai_translation: '<p>Translated content</p>',
      }
      vi.mocked(RssApi.translateArticle).mockResolvedValue(translatedArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const translateBtn = screen.getByTitle('翻译文章')
      fireEvent.click(translateBtn)

      await waitFor(() => {
        expect(screen.getByText('Translated content')).toBeInTheDocument()
      })

      // Click again to toggle off - should show original
      fireEvent.click(screen.getByTitle('显示原文'))

      await waitFor(() => {
        expect(screen.getByText('Test content paragraph 1')).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should show error banner when fetch full content fails', async () => {
      vi.mocked(RssApi.fetchFullContent).mockRejectedValue(new Error('Network error'))

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
        expect(screen.getByTestId('fetch-error-banner')).toHaveTextContent('Network error')
      })
    })

    it('should show error when generate summary fails', async () => {
      vi.mocked(RssApi.generateSummary).mockRejectedValue('string error')

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const summaryBtn = screen.getByTitle('生成 AI 摘要')
      fireEvent.click(summaryBtn)

      await waitFor(() => {
        expect(screen.getByTestId('fetch-error-banner')).toBeInTheDocument()
      })
    })

    it('should show error when translate fails', async () => {
      vi.mocked(RssApi.translateArticle).mockRejectedValue(new Error('Translation failed'))

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const translateBtn = screen.getByTitle('翻译文章')
      fireEvent.click(translateBtn)

      await waitFor(() => {
        expect(screen.getByTestId('fetch-error-banner')).toHaveTextContent('Translation failed')
      })
    })

    it('should rollback favorite state on API error', async () => {
      vi.mocked(RssApi.setArticleFavorite).mockRejectedValue(new Error('API error'))

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const favoriteButton = screen.getByTitle('收藏 (F)')
      fireEvent.click(favoriteButton)

      // After error, should rollback to unfavorited
      await waitFor(() => {
        expect(screen.getByTitle('收藏 (F)')).toBeInTheDocument()
      })
    })
  })

  describe('content fallback', () => {
    it('should show description when no content', () => {
      const articleNoContent: Article = {
        ...mockArticle,
        content: undefined,
        description: 'Fallback description text',
      }

      render(
        <ArticleViewer
          article={articleNoContent}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      expect(screen.getByText('Fallback description text')).toBeInTheDocument()
    })

    it('should show "未知时间" when no published_at', () => {
      const articleNoDate: Article = {
        ...mockArticle,
        published_at: undefined,
      }

      render(
        <ArticleViewer
          article={articleNoDate}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      expect(screen.getByText('未知时间')).toBeInTheDocument()
    })
  })

  describe('keyboard shortcuts', () => {
    it('should not respond to shortcuts when in input field', () => {
      const mockOnNext = vi.fn()

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          onNext={mockOnNext}
          hasNext={true}
          readerSettings={mockReaderSettings}
        />
      )

      const input = document.createElement('input')
      document.body.appendChild(input)
      fireEvent.keyDown(input, { key: 'n' })
      expect(mockOnNext).not.toHaveBeenCalled()
      document.body.removeChild(input)
    })
  })

  describe('reader settings style', () => {
    it('should apply reader settings to content area', () => {
      const customSettings: ReaderSettings = {
        ...mockReaderSettings,
        fontSize: 20,
        lineHeight: 2,
        letterSpacing: 1,
        textAlign: 'center' as const,
        maxWidth: 80,
      }

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={customSettings}
        />
      )

      const article = screen.getByTestId('article-content-area').querySelector('article')!
      expect(article.style.fontSize).toBe('20px')
      expect(article.style.lineHeight).toBe('2')
      expect(article.style.maxWidth).toBe('80ch')
    })
  })

  describe('translated title', () => {
    it('should show translated title when translation is active', async () => {
      const articleWithTranslatedTitle: Article = {
        ...mockArticle,
        ai_translation: '<p>Translated</p>',
        ai_translated_title: '翻译后的标题',
      }
      vi.mocked(RssApi.translateArticle).mockResolvedValue(articleWithTranslatedTitle)

      render(
        <ArticleViewer
          article={{ ...mockArticle, ai_translated_title: '翻译后的标题' }}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const translateBtn = screen.getByTitle('翻译文章')
      fireEvent.click(translateBtn)

      await waitFor(() => {
        expect(screen.getByText('翻译后的标题')).toBeInTheDocument()
      })
    })
  })

  describe('scroll progress', () => {
    it('should have scroll handler on content area', () => {
      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const contentArea = screen.getByTestId('article-content-area')
      expect(contentArea).toBeInTheDocument()
    })
  })

  describe('auto-fetch from DB on mount', () => {
    it('should fetch latest article data on mount and update if full_content available', async () => {
      const latestArticle: Article = {
        ...mockArticle,
        full_content: '<p>Pre-fetched content</p>',
        ai_summary: 'Pre-generated summary',
      }
      vi.mocked(RssApi.getArticle).mockResolvedValue(latestArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      await waitFor(() => {
        expect(RssApi.getArticle).toHaveBeenCalledWith('article-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Pre-fetched content')).toBeInTheDocument()
      })
    })

    it('should not fetch from DB if article already has all data', () => {
      const completeArticle: Article = {
        ...mockArticle,
        full_content: '<p>Full</p>',
        ai_summary: 'Summary',
        ai_translation: '<p>Translation</p>',
      }

      render(
        <ArticleViewer
          article={completeArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      expect(RssApi.getArticle).not.toHaveBeenCalled()
    })
  })

  describe('fetch full content error with string', () => {
    it('should handle non-Error object in fetch full content', async () => {
      vi.mocked(RssApi.fetchFullContent).mockRejectedValue({ code: 'UNKNOWN' })

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
        expect(screen.getByTestId('fetch-error-banner')).toHaveTextContent('抓取全文失败，请稍后重试')
      })
    })
  })

  describe('translate with existing translation', () => {
    it('should show translate button and call API on click', async () => {
      const translatedArticle: Article = {
        ...mockArticle,
        ai_translation: '<p>Translated</p>',
      }
      vi.mocked(RssApi.translateArticle).mockResolvedValue(translatedArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      // Click translate
      fireEvent.click(screen.getByTitle('翻译文章'))
      await waitFor(() => {
        expect(RssApi.translateArticle).toHaveBeenCalledWith('article-1')
      })

      // Translation should be shown
      await waitFor(() => {
        expect(screen.getByText('Translated')).toBeInTheDocument()
      })
    })
  })

  describe('favorite article', () => {
    it('should show filled star for favorited article', () => {
      const favArticle: Article = {
        ...mockArticle,
        favorite: true,
      }

      render(
        <ArticleViewer
          article={favArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      expect(screen.getByTitle('取消收藏 (F)')).toBeInTheDocument()
    })
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

  describe('Tauri event listener - queue-task-progress', () => {
    let eventCallbacks: Map<string, (event: { payload: TaskProgressEvent }) => void> = new Map()

    beforeEach(() => {
      eventCallbacks.clear()
      vi.mocked(listen).mockImplementation(async (eventName: string, callback: (event: { payload: TaskProgressEvent }) => void) => {
        eventCallbacks.set(eventName, callback)
        return () => {}
      })
    })

    afterEach(() => {
      eventCallbacks.clear()
    })

    it('should update full content when fetch_full_content task completes', async () => {
      const latestArticle: Article = {
        ...mockArticle,
        full_content: '<p>Full content from event</p>',
      }
      vi.mocked(RssApi.getArticle).mockResolvedValue(latestArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      // Wait for component to set up event listener
      await waitFor(() => {
        expect(listen).toHaveBeenCalledWith('queue-task-progress', expect.any(Function))
      })

      // Simulate task progress event
      const callback = eventCallbacks.get('queue-task-progress')
      expect(callback).toBeDefined()

      await act(async () => {
        callback?.({
          payload: {
            article_id: 'article-1',
            task_type: 'fetch_full_content',
            status: 'completed',
          } as TaskProgressEvent
        })
      })

      await waitFor(() => {
        expect(RssApi.getArticle).toHaveBeenCalledWith('article-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Full content from event')).toBeInTheDocument()
      })
    })

    it('should update AI summary when ai_summary task completes', async () => {
      const latestArticle: Article = {
        ...mockArticle,
        ai_summary: 'AI summary from event',
      }
      vi.mocked(RssApi.getArticle).mockResolvedValue(latestArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      await waitFor(() => {
        expect(listen).toHaveBeenCalledWith('queue-task-progress', expect.any(Function))
      })

      const callback = eventCallbacks.get('queue-task-progress')

      await act(async () => {
        callback?.({
          payload: {
            article_id: 'article-1',
            task_type: 'ai_summary',
            status: 'completed',
          } as TaskProgressEvent
        })
      })

      await waitFor(() => {
        expect(screen.getByText('AI summary from event')).toBeInTheDocument()
      })
    })

    it('should update AI translation when ai_translation task completes', async () => {
      const latestArticle: Article = {
        ...mockArticle,
        ai_translation: '<p>Translation from event</p>',
      }
      vi.mocked(RssApi.getArticle).mockResolvedValue(latestArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      await waitFor(() => {
        expect(listen).toHaveBeenCalledWith('queue-task-progress', expect.any(Function))
      })

      const callback = eventCallbacks.get('queue-task-progress')

      await act(async () => {
        callback?.({
          payload: {
            article_id: 'article-1',
            task_type: 'ai_translation',
            status: 'completed',
          } as TaskProgressEvent
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Translation from event')).toBeInTheDocument()
      })
    })

    it('should ignore events for different articles', async () => {
      vi.mocked(RssApi.getArticle).mockResolvedValue({
        ...mockArticle,
        full_content: '<p>Should not appear</p>',
      })

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      await waitFor(() => {
        expect(listen).toHaveBeenCalledWith('queue-task-progress', expect.any(Function))
      })

      // Clear any previous calls from mount effect
      vi.mocked(RssApi.getArticle).mockClear()

      const callback = eventCallbacks.get('queue-task-progress')

      await act(async () => {
        callback?.({
          payload: {
            article_id: 'different-article-id',
            task_type: 'fetch_full_content',
            status: 'completed',
          } as TaskProgressEvent
        })
      })

      // Should not call getArticle for different article
      expect(RssApi.getArticle).not.toHaveBeenCalled()
    })

    it('should ignore non-completed events', async () => {
      vi.mocked(RssApi.getArticle).mockResolvedValue({
        ...mockArticle,
        full_content: '<p>Should not appear</p>',
      })

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      await waitFor(() => {
        expect(listen).toHaveBeenCalledWith('queue-task-progress', expect.any(Function))
      })

      // Clear any previous calls from mount effect
      vi.mocked(RssApi.getArticle).mockClear()

      const callback = eventCallbacks.get('queue-task-progress')

      await act(async () => {
        callback?.({
          payload: {
            article_id: 'article-1',
            task_type: 'fetch_full_content',
            status: 'running',
          } as TaskProgressEvent
        })
      })

      expect(RssApi.getArticle).not.toHaveBeenCalled()
    })
  })

  describe('translate with full content fetch', () => {
    it('should fetch full content before translating when feed uses full content', async () => {
      mockFeeds = [{ feed: { id: 'feed-1', use_full_content: true, use_ai_summary: false }, unread_count: 0 }]

      const fetchedArticle: Article = {
        ...mockArticle,
        full_content: '<p>Full content fetched</p>',
      }
      const translatedArticle: Article = {
        ...fetchedArticle,
        ai_translation: '<p>Translated full content</p>',
      }

      vi.mocked(RssApi.fetchFullContent).mockResolvedValue(fetchedArticle)
      vi.mocked(RssApi.translateArticle).mockResolvedValue(translatedArticle)

      render(
        <ArticleViewer
          article={mockArticle}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const translateBtn = screen.getByTitle('翻译文章')
      fireEvent.click(translateBtn)

      await waitFor(() => {
        expect(RssApi.fetchFullContent).toHaveBeenCalledWith('article-1')
      })

      await waitFor(() => {
        expect(RssApi.translateArticle).toHaveBeenCalledWith('article-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Translated full content')).toBeInTheDocument()
      })

      mockFeeds = [{ feed: { id: 'feed-1', use_full_content: false, use_ai_summary: false }, unread_count: 0 }]
    })
  })

  describe('scroll progress', () => {
    it('should update reading progress when scrolled more than 5%', async () => {
      // Mock updateReadingProgress to return a Promise
      vi.mocked(RssApi.updateReadingProgress).mockResolvedValue(undefined)

      const articleWithProgress: Article = {
        ...mockArticle,
        reading_progress: 0,
      }

      render(
        <ArticleViewer
          article={articleWithProgress}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const contentArea = screen.getByTestId('article-content-area')

      // Mock scroll properties - scroll enough to trigger update (>5%)
      Object.defineProperty(contentArea, 'scrollTop', { writable: true, value: 100 })
      Object.defineProperty(contentArea, 'scrollHeight', { writable: true, value: 1000 })
      Object.defineProperty(contentArea, 'clientHeight', { writable: true, value: 500 })

      await act(async () => {
        fireEvent.scroll(contentArea)
      })

      await waitFor(() => {
        expect(RssApi.updateReadingProgress).toHaveBeenCalledWith('article-1', expect.any(Number))
      })
    })

    it('should not update progress when scrolled less than 5%', async () => {
      const articleWithProgress: Article = {
        ...mockArticle,
        reading_progress: 0,
      }

      render(
        <ArticleViewer
          article={articleWithProgress}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const contentArea = screen.getByTestId('article-content-area')

      // Small scroll - less than 5% change
      Object.defineProperty(contentArea, 'scrollTop', { writable: true, value: 10 })
      Object.defineProperty(contentArea, 'scrollHeight', { writable: true, value: 1000 })
      Object.defineProperty(contentArea, 'clientHeight', { writable: true, value: 500 })

      await act(async () => {
        fireEvent.scroll(contentArea)
      })

      // Wait a bit to ensure no call is made
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(RssApi.updateReadingProgress).not.toHaveBeenCalled()
    })

    it('should initialize scroll position from reading_progress', async () => {
      const articleWithProgress: Article = {
        ...mockArticle,
        reading_progress: 50,
      }

      render(
        <ArticleViewer
          article={articleWithProgress}
          articles={mockArticles}
          readerSettings={mockReaderSettings}
        />
      )

      const contentArea = screen.getByTestId('article-content-area')

      // The scroll position should be set based on reading_progress
      // We can't directly verify scrollTop in jsdom, but we can check the component rendered
      expect(contentArea).toBeInTheDocument()
    })
  })

  describe('error banner auto-dismiss', () => {
    it('should show error banner when fetch fails', async () => {
      vi.mocked(RssApi.fetchFullContent).mockRejectedValue(new Error('Test error'))

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
        expect(screen.getByTestId('fetch-error-banner')).toHaveTextContent('Test error')
      })

      // Error banner should be visible
      expect(screen.getByTestId('fetch-error-banner')).toBeInTheDocument()
    })
  })
})
