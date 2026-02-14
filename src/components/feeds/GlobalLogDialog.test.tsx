import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GlobalLogDialog } from './GlobalLogDialog'
import { RssApi } from '../../lib/api'
import type { FeedLog } from '../../types'

vi.mock('../../lib/api', () => ({
  RssApi: {
    getAllFeedLogs: vi.fn(),
  },
}))

vi.mock('lucide-react', () => ({
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="link-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-close" {...props} />,
}))

const makeLogs = (): FeedLog[] => [
  {
    id: 'log-1',
    feed_id: 'feed-1',
    feed_title: 'Tech Blog',
    timestamp: '2026-01-15T10:30:00Z',
    success: true,
    new_article_count: 2,
    new_articles: [
      { title: 'Article A', link: 'https://example.com/a' },
    ],
    error: null,
    duration_ms: 100,
  },
  {
    id: 'log-2',
    feed_id: 'feed-1',
    feed_title: 'Tech Blog',
    timestamp: '2026-01-15T11:00:00Z',
    success: false,
    new_article_count: 0,
    new_articles: [],
    error: 'Timeout',
    duration_ms: 5000,
  },
]

describe('GlobalLogDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render content when closed', () => {
    render(<GlobalLogDialog isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('全局刷新日志')).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(RssApi.getAllFeedLogs).mockReturnValue(new Promise(() => {}))
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('shows empty state when no logs', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue([])
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('暂无刷新日志')).toBeInTheDocument()
    })
  })

  it('groups logs by feed', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue(makeLogs())
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Tech Blog')).toBeInTheDocument()
    })
  })

  it('shows success and fail counts', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue(makeLogs())
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('1✓')).toBeInTheDocument()
      expect(screen.getByText('1✗')).toBeInTheDocument()
    })
  })

  it('collapses feed group on click', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue(makeLogs())
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('100ms')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Tech Blog'))
    expect(screen.queryByText('100ms')).not.toBeInTheDocument()
  })

  it('expands collapsed feed group on second click', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue(makeLogs())
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('100ms')).toBeInTheDocument()
    })
    const feedBtn = screen.getByText('Tech Blog')
    fireEvent.click(feedBtn)
    fireEvent.click(feedBtn)
    expect(screen.getByText('100ms')).toBeInTheDocument()
  })

  it('shows error message for failed logs', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue(makeLogs())
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Timeout')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockRejectedValue(new Error('fail'))
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('暂无刷新日志')).toBeInTheDocument()
    })
  })

  it('calls getAllFeedLogs with limit 200', () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue([])
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    expect(RssApi.getAllFeedLogs).toHaveBeenCalledWith(200)
  })

  it('expands log entry articles on click', async () => {
    vi.mocked(RssApi.getAllFeedLogs).mockResolvedValue(makeLogs())
    render(<GlobalLogDialog isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('+2 篇')).toBeInTheDocument()
    })
    const logRow = screen.getByText('+2 篇').closest('[role="button"]')!
    fireEvent.click(logRow)
    expect(screen.getByText('Article A')).toBeInTheDocument()
  })
})
