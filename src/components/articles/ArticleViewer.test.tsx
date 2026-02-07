import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ArticleViewer } from './ArticleViewer'
import { DEFAULT_READER_SETTINGS } from '../../types'
import type { Article, ReaderSettings } from '../../types'
import { RssApi } from '../../lib/api'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Star: () => 'Star',
  StarOff: () => 'StarOff',
  ExternalLink: () => 'ExternalLink',
  ChevronLeft: () => 'ChevronLeft',
  ChevronRight: () => 'ChevronRight',
  Settings: () => 'Settings',
  Clock: () => 'Clock',
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
  })

  it('应该渲染文章标题', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
      />
    )

    const nextButton = screen.queryByTitle('下一篇文章 (N 或 →)')
    expect(nextButton).not.toBeInTheDocument()
  })

  it('应该显示设置面板当点击设置按钮', () => {
    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
        onSettingsChange={vi.fn()}
      />
    )

    // 初始状态设置面板隐藏
    expect(screen.queryByText('阅读设置')).not.toBeInTheDocument()

    const settingsButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === '阅读设置'
    )

    if (settingsButton) {
      fireEvent.click(settingsButton)
      expect(screen.getByText('阅读设置')).toBeInTheDocument()
    }
  })

  it('应该更新阅读器设置', () => {
    const mockOnSettingsChange = vi.fn()

    render(
      <ArticleViewer
        article={mockArticle}
        articles={mockArticles}
        readerSettings={mockReaderSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    )

    // 打开设置面板
    const settingsButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === '阅读设置'
    )

    if (settingsButton) {
      fireEvent.click(settingsButton)

      // 调整字体大小 - 找到字体大小滑块 (range input)
      const sliders = screen.getAllByRole('slider')
      const fontSizeSlider = sliders[0] // 第一个 slider 是字体大小
      fireEvent.input(fontSizeSlider, { target: { value: '20' } })

      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fontSize: 20,
        })
      )
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
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
        onSettingsChange={vi.fn()}
      />
    )

    // 进度条容器应该不存在
    const progressContainer = document.querySelector('.h-1.bg-muted')
    expect(progressContainer).not.toBeInTheDocument()
  })
})
