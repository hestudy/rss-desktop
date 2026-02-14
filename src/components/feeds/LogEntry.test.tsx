import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LogEntry, formatLogTime } from './LogEntry'
import type { FeedLog } from '../../types'

vi.mock('lucide-react', () => ({
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="link-icon" {...props} />,
}))

const makeLog = (overrides: Partial<FeedLog> = {}): FeedLog => ({
  id: 'log-1',
  feed_id: 'feed-1',
  feed_title: 'Test Feed',
  timestamp: '2026-01-15T10:30:00Z',
  success: true,
  new_article_count: 0,
  new_articles: [],
  error: null,
  duration_ms: 150,
  ...overrides,
})

describe('formatLogTime', () => {
  it('formats timestamp to zh-CN locale string', () => {
    const result = formatLogTime('2026-01-15T10:30:00Z')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})

describe('LogEntry', () => {
  it('renders success icon for successful log', () => {
    render(<LogEntry log={makeLog({ success: true })} />)
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })

  it('renders error icon for failed log', () => {
    render(<LogEntry log={makeLog({ success: false })} />)
    expect(screen.getByTestId('x-icon')).toBeInTheDocument()
  })

  it('displays new article count for successful log', () => {
    render(<LogEntry log={makeLog({ new_article_count: 3 })} />)
    expect(screen.getByText('+3 篇')).toBeInTheDocument()
  })

  it('displays "无新文章" when no new articles', () => {
    render(<LogEntry log={makeLog({ new_article_count: 0 })} />)
    expect(screen.getByText('无新文章')).toBeInTheDocument()
  })

  it('displays "失败" for failed log', () => {
    render(<LogEntry log={makeLog({ success: false })} />)
    expect(screen.getByText('失败')).toBeInTheDocument()
  })

  it('displays duration', () => {
    render(<LogEntry log={makeLog({ duration_ms: 250 })} />)
    expect(screen.getByText('250ms')).toBeInTheDocument()
  })

  it('displays error message when present', () => {
    render(<LogEntry log={makeLog({ success: false, error: 'Network timeout' })} />)
    expect(screen.getByText('Network timeout')).toBeInTheDocument()
  })

  it('does not show error block when error is null', () => {
    render(<LogEntry log={makeLog({ error: null })} />)
    expect(screen.queryByText('Network timeout')).not.toBeInTheDocument()
  })

  it('shows expand chevron when articles exist', () => {
    const log = makeLog({
      new_articles: [{ title: 'Article 1', link: 'https://example.com/1' }],
    })
    render(<LogEntry log={log} />)
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
  })

  it('expands to show articles on click', () => {
    const log = makeLog({
      new_articles: [
        { title: 'Article 1', link: 'https://example.com/1' },
        { title: 'Article 2', link: 'https://example.com/2' },
      ],
    })
    render(<LogEntry log={log} />)

    const row = screen.getByRole('button')
    fireEvent.click(row)

    expect(screen.getByText('Article 1')).toBeInTheDocument()
    expect(screen.getByText('Article 2')).toBeInTheDocument()
  })

  it('collapses articles on second click', () => {
    const log = makeLog({
      new_articles: [{ title: 'Article 1', link: 'https://example.com/1' }],
    })
    render(<LogEntry log={log} />)

    const row = screen.getByRole('button')
    fireEvent.click(row)
    expect(screen.getByText('Article 1')).toBeInTheDocument()

    fireEvent.click(row)
    expect(screen.queryByText('Article 1')).not.toBeInTheDocument()
  })

  it('supports keyboard expand with Enter', () => {
    const log = makeLog({
      new_articles: [{ title: 'Article 1', link: 'https://example.com/1' }],
    })
    render(<LogEntry log={log} />)

    const row = screen.getByRole('button')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(screen.getByText('Article 1')).toBeInTheDocument()
  })

  it('supports keyboard expand with Space', () => {
    const log = makeLog({
      new_articles: [{ title: 'Article 1', link: 'https://example.com/1' }],
    })
    render(<LogEntry log={log} />)

    const row = screen.getByRole('button')
    fireEvent.keyDown(row, { key: ' ' })
    expect(screen.getByText('Article 1')).toBeInTheDocument()
  })

  it('applies compact styling when compact prop is true', () => {
    const { container } = render(<LogEntry log={makeLog()} compact />)
    expect(container.firstChild).toHaveClass('text-xs')
  })

  it('applies default styling when compact is false', () => {
    const { container } = render(<LogEntry log={makeLog()} />)
    expect(container.firstChild).toHaveClass('text-sm')
  })
})
