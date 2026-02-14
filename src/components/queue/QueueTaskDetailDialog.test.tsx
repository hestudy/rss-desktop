import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueueTaskDetailDialog } from './QueueTaskDetailDialog'
import type { QueueTask, Article, Feed, FeedWithUnreadCount } from '../../types'
import { RssApi } from '../../lib/api'

let mockFeeds: FeedWithUnreadCount[] = []

vi.mock('../../lib/api', () => ({
  RssApi: {
    getArticle: vi.fn(),
  },
}))

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    feeds: mockFeeds,
    articles: [],
    selectedFeedId: null,
    isLoading: false,
    error: null,
    showFavoritesOnly: false,
    loadFeeds: vi.fn(),
    loadArticles: vi.fn(),
    addFeed: vi.fn(),
    removeFeed: vi.fn(),
    updateFeed: vi.fn(),
    refreshFeed: vi.fn(),
    refreshAllFeeds: vi.fn(),
    silentRefreshAll: vi.fn(),
    selectFeed: vi.fn(),
    selectFeedAndLoad: vi.fn(),
    selectFavorites: vi.fn(),
    markArticleRead: vi.fn(),
    markAllRead: vi.fn(),
    openLink: vi.fn(),
    getGlobalUnreadCount: vi.fn(() => 0),
    updateArticleInList: vi.fn(),
  }),
}))

vi.mock('lucide-react', () => ({
  FileText: (props: Record<string, unknown>) => <svg data-testid="file-text-icon" {...props} />,
  Sparkles: (props: Record<string, unknown>) => <svg data-testid="sparkles-icon" {...props} />,
  Languages: (props: Record<string, unknown>) => <svg data-testid="languages-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="external-link-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}))

const makeTask = (overrides: Partial<QueueTask> & { id: string }): QueueTask => ({
  task_type: { type: 'ai_summary', article_id: 'art-1' },
  priority: 'normal',
  status: { status: 'pending' },
  created_at: '2026-01-01T00:00:00Z',
  started_at: null,
  completed_at: null,
  retries: 0,
  ...overrides,
})

const makeArticle = (overrides: Partial<Article> & { id: string; feed_id: string }): Article => ({
  title: 'Test Article',
  link: 'https://example.com/article',
  read: false,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const makeFeed = (overrides: Partial<Feed> & { id: string }): Feed => ({
  url: 'https://example.com/feed',
  title: 'Test Feed',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('QueueTaskDetailDialog', () => {
  const defaultProps = {
    task: null,
    open: false,
    onOpenChange: vi.fn(),
    onRetry: vi.fn(),
    onNavigateToArticle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFeeds = []
  })

  describe('dialog visibility', () => {
    it('should not render content when dialog is closed', () => {
      const task = makeTask({ id: 't1' })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={false} />
      )
      expect(screen.queryByText('任务详情')).not.toBeInTheDocument()
    })

    it('should render content when dialog is open', () => {
      const task = makeTask({ id: 't1' })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('任务详情')).toBeInTheDocument()
    })
  })

  describe('task type display', () => {
    it('should display task type label for fetch_full_content', () => {
      const task = makeTask({
        id: 't1',
        task_type: { type: 'fetch_full_content', article_id: 'a1', url: 'https://example.com' },
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('全文抓取')).toBeInTheDocument()
    })

    it('should display task type label for ai_summary', () => {
      const task = makeTask({
        id: 't1',
        task_type: { type: 'ai_summary', article_id: 'a1' },
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('AI 摘要')).toBeInTheDocument()
    })

    it('should display task type label for ai_translation', () => {
      const task = makeTask({
        id: 't1',
        task_type: { type: 'ai_translation', article_id: 'a1', target_lang: 'zh-CN' },
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('AI 翻译')).toBeInTheDocument()
    })
  })

  describe('task status display', () => {
    it('should display pending status', () => {
      const task = makeTask({ id: 't1', status: { status: 'pending' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('等待中')).toBeInTheDocument()
    })

    it('should display running status', () => {
      const task = makeTask({ id: 't1', status: { status: 'running' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('执行中')).toBeInTheDocument()
    })

    it('should display completed status', () => {
      const task = makeTask({ id: 't1', status: { status: 'completed' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('已完成')).toBeInTheDocument()
    })

    it('should display failed status', () => {
      const task = makeTask({
        id: 't1',
        status: { status: 'failed', error: 'Network error', retries: 3 },
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('失败')).toBeInTheDocument()
    })

    it('should display cancelled status', () => {
      const task = makeTask({ id: 't1', status: { status: 'cancelled' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('已取消')).toBeInTheDocument()
    })
  })

  describe('timestamp display', () => {
    it('should display created_at timestamp', () => {
      const task = makeTask({
        id: 't1',
        created_at: '2026-02-13T10:30:00Z',
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText(/创建时间/)).toBeInTheDocument()
    })

    it('should display started_at timestamp when available', () => {
      const task = makeTask({
        id: 't1',
        status: { status: 'running' },
        started_at: '2026-02-13T10:31:00Z',
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText(/开始时间/)).toBeInTheDocument()
    })

    it('should display completed_at timestamp when available', () => {
      const task = makeTask({
        id: 't1',
        status: { status: 'completed' },
        completed_at: '2026-02-13T10:32:00Z',
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText(/完成时间/)).toBeInTheDocument()
    })
  })

  describe('failed task error display', () => {
    it('should display error message for failed tasks', () => {
      const task = makeTask({
        id: 't1',
        status: { status: 'failed', error: 'Network timeout', retries: 3 },
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByText('Network timeout')).toBeInTheDocument()
    })

    it('should display retry button for failed tasks', () => {
      const task = makeTask({
        id: 't1',
        status: { status: 'failed', error: 'Network timeout', retries: 3 },
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument()
    })

    it('should not display retry button for non-failed tasks', () => {
      const task = makeTask({ id: 't1', status: { status: 'completed' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )
      expect(screen.queryByRole('button', { name: /重试/ })).not.toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn()
      const task = makeTask({
        id: 't1',
        status: { status: 'failed', error: 'Network timeout', retries: 3 },
      })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} onRetry={onRetry} />
      )
      const retryBtn = screen.getByRole('button', { name: /重试/ })
      fireEvent.click(retryBtn)
      expect(onRetry).toHaveBeenCalledWith(task)
    })
  })

  describe('article information display', () => {
    it('should display article title when article exists', async () => {
      const article = makeArticle({ id: 'a1', feed_id: 'f1', title: 'My Article' })
      vi.mocked(RssApi.getArticle).mockResolvedValue(article)

      const task = makeTask({ id: 't1', task_type: { type: 'ai_summary', article_id: 'a1' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )

      await waitFor(() => {
        expect(screen.getByText('My Article')).toBeInTheDocument()
      })
    })

    it('should display feed name when feed exists', async () => {
      const article = makeArticle({ id: 'a1', feed_id: 'f1' })
      const feed = makeFeed({ id: 'f1', title: 'My Feed' })
      vi.mocked(RssApi.getArticle).mockResolvedValue(article)
      mockFeeds = [{ feed, unread_count: 0 }]

      const task = makeTask({ id: 't1', task_type: { type: 'ai_summary', article_id: 'a1' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )

      await waitFor(() => {
        expect(screen.getByText('My Feed')).toBeInTheDocument()
      })
    })

    it('should display fallback when article does not exist', async () => {
      vi.mocked(RssApi.getArticle).mockResolvedValue(null)

      const task = makeTask({ id: 't1', task_type: { type: 'ai_summary', article_id: 'a1' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )

      await waitFor(() => {
        expect(screen.getByText('文章不存在')).toBeInTheDocument()
      })
    })

    it('should display fallback when feed does not exist', async () => {
      const article = makeArticle({ id: 'a1', feed_id: 'f1' })
      vi.mocked(RssApi.getArticle).mockResolvedValue(article)
      mockFeeds = []

      const task = makeTask({ id: 't1', task_type: { type: 'ai_summary', article_id: 'a1' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )

      await waitFor(() => {
        expect(screen.getByText('未知订阅')).toBeInTheDocument()
      })
    })
  })

  describe('navigate to article button', () => {
    it('should enable navigate button when article exists', async () => {
      const article = makeArticle({ id: 'a1', feed_id: 'f1' })
      vi.mocked(RssApi.getArticle).mockResolvedValue(article)

      const task = makeTask({ id: 't1', task_type: { type: 'ai_summary', article_id: 'a1' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /查看文章/ })
        expect(btn).not.toBeDisabled()
      })
    })

    it('should disable navigate button when article does not exist', async () => {
      vi.mocked(RssApi.getArticle).mockResolvedValue(null)

      const task = makeTask({ id: 't1', task_type: { type: 'ai_summary', article_id: 'a1' } })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} />
      )

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /查看文章/ })
        expect(btn).toBeDisabled()
      })
    })

    it('should call onNavigateToArticle when navigate button is clicked', async () => {
      const onNavigateToArticle = vi.fn()
      const article = makeArticle({ id: 'a1', feed_id: 'f1' })
      vi.mocked(RssApi.getArticle).mockResolvedValue(article)

      const task = makeTask({ id: 't1', task_type: { type: 'ai_summary', article_id: 'a1' } })
      render(
        <QueueTaskDetailDialog
          {...defaultProps}
          task={task}
          open={true}
          onNavigateToArticle={onNavigateToArticle}
        />
      )

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /查看文章/ })
        fireEvent.click(btn)
        expect(onNavigateToArticle).toHaveBeenCalledWith('f1', 'a1')
      })
    })
  })

  describe('dialog close', () => {
    it('should call onOpenChange when close button is clicked', () => {
      const onOpenChange = vi.fn()
      const task = makeTask({ id: 't1' })
      render(
        <QueueTaskDetailDialog {...defaultProps} task={task} open={true} onOpenChange={onOpenChange} />
      )

      const closeBtn = screen.getByRole('button', { name: '关闭' })
      fireEvent.click(closeBtn)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
