import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FeedLogDialog } from './FeedLogDialog'
import { RssApi } from '../../lib/api'
import type { FeedLog } from '../../types'

vi.mock('../../lib/api', () => ({
  RssApi: {
    getFeedLogs: vi.fn(),
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

const mockLog: FeedLog = {
  id: 'log-1',
  feed_id: 'feed-1',
  feed_title: 'Test Feed',
  timestamp: '2026-01-15T10:30:00Z',
  success: true,
  new_article_count: 2,
  new_articles: [
    { title: 'Article 1', link: 'https://example.com/1' },
  ],
  error: null,
  duration_ms: 150,
}

describe('FeedLogDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render content when closed', () => {
    render(
      <FeedLogDialog isOpen={false} onClose={vi.fn()} feedId="f1" feedTitle="Test" />
    )
    expect(screen.queryByText(/刷新日志/)).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(RssApi.getFeedLogs).mockReturnValue(new Promise(() => {}))
    render(
      <FeedLogDialog isOpen={true} onClose={vi.fn()} feedId="f1" feedTitle="Test" />
    )
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('shows empty state when no logs', async () => {
    vi.mocked(RssApi.getFeedLogs).mockResolvedValue([])
    render(
      <FeedLogDialog isOpen={true} onClose={vi.fn()} feedId="f1" feedTitle="Test" />
    )
    await waitFor(() => {
      expect(screen.getByText('暂无刷新日志')).toBeInTheDocument()
    })
  })

  it('renders logs when available', async () => {
    vi.mocked(RssApi.getFeedLogs).mockResolvedValue([mockLog])
    render(
      <FeedLogDialog isOpen={true} onClose={vi.fn()} feedId="f1" feedTitle="Test Feed" />
    )
    await waitFor(() => {
      expect(screen.getByText('150ms')).toBeInTheDocument()
    })
  })

  it('displays feed title in dialog title', () => {
    vi.mocked(RssApi.getFeedLogs).mockResolvedValue([])
    render(
      <FeedLogDialog isOpen={true} onClose={vi.fn()} feedId="f1" feedTitle="My Feed" />
    )
    expect(screen.getByText('My Feed - 刷新日志')).toBeInTheDocument()
  })

  it('calls getFeedLogs with correct params', () => {
    vi.mocked(RssApi.getFeedLogs).mockResolvedValue([])
    render(
      <FeedLogDialog isOpen={true} onClose={vi.fn()} feedId="feed-123" feedTitle="Test" />
    )
    expect(RssApi.getFeedLogs).toHaveBeenCalledWith('feed-123', 50)
  })

  it('handles API error gracefully', async () => {
    vi.mocked(RssApi.getFeedLogs).mockRejectedValue(new Error('fail'))
    render(
      <FeedLogDialog isOpen={true} onClose={vi.fn()} feedId="f1" feedTitle="Test" />
    )
    await waitFor(() => {
      expect(screen.getByText('暂无刷新日志')).toBeInTheDocument()
    })
  })
})
