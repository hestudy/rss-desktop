import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueueIndicator } from './QueueIndicator'
import type { QueueStatusSnapshot, QueueTask } from '../../types'

const emptySnapshot: QueueStatusSnapshot = {
  pending_count: 0,
  running_count: 0,
  completed_count: 0,
  failed_count: 0,
  tasks: [],
}

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

const activeSnapshot: QueueStatusSnapshot = {
  pending_count: 2,
  running_count: 1,
  completed_count: 0,
  failed_count: 0,
  tasks: [
    makeTask({
      id: 'task-1',
      task_type: { type: 'ai_summary', article_id: 'art-1' },
      priority: 'high',
      status: { status: 'running' },
      started_at: '2026-01-01T00:00:01Z',
    }),
  ],
}

const mockCancelTask = vi.fn()
const mockClearCompleted = vi.fn()
const mockSelectFeedAndLoad = vi.fn()
const mockSelectArticle = vi.fn()

let mockStatus: QueueStatusSnapshot | null = emptySnapshot
let mockActiveCount = 0

vi.mock('../../hooks/useQueueStatus', () => ({
  useQueueStatus: () => ({
    status: mockStatus,
    activeCount: mockActiveCount,
    cancelTask: mockCancelTask,
    clearCompleted: mockClearCompleted,
  }),
}))

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    selectFeedAndLoad: mockSelectFeedAndLoad,
    feeds: [],
  }),
}))

vi.mock('../../contexts/ReaderContext', () => ({
  useReader: () => ({
    selectArticle: mockSelectArticle,
  }),
}))

vi.mock('../../lib/api', () => ({
  RssApi: {
    queueAddTask: vi.fn(),
  },
}))

vi.mock('lucide-react', () => ({
  ListTodo: (props: Record<string, unknown>) => <svg data-testid="list-todo-icon" {...props} />,
  FileText: (props: Record<string, unknown>) => <svg data-testid="file-text-icon" {...props} />,
  Sparkles: (props: Record<string, unknown>) => <svg data-testid="sparkles-icon" {...props} />,
  Languages: (props: Record<string, unknown>) => <svg data-testid="languages-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="external-link-icon" {...props} />,
}))

const mockOnRetry = vi.fn()
const mockOnNavigateToArticle = vi.fn()

vi.mock('./QueueTaskDetailDialog', () => ({
  QueueTaskDetailDialog: ({ task, open, onRetry, onNavigateToArticle }: {
    task: QueueTask | null
    open: boolean
    onRetry: (task: QueueTask) => void
    onNavigateToArticle: (feedId: string, articleId: string) => void
  }) => {
    if (!open || !task) return null
    return (
      <div data-testid="queue-task-detail-dialog">
        <div data-testid="dialog-task-id">{task.id}</div>
        <button onClick={() => onRetry(task)}>重试</button>
        <button onClick={() => onNavigateToArticle('feed-1', task.task_type.article_id)}>查看文章</button>
      </div>
    )
  },
}))

describe('QueueIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus = emptySnapshot
    mockActiveCount = 0
    mockOnRetry.mockClear()
    mockOnNavigateToArticle.mockClear()
  })

  describe('icon button', () => {
    it('should always render the queue icon button', () => {
      render(<QueueIndicator />)
      expect(screen.getByRole('button', { name: '任务队列' })).toBeInTheDocument()
    })
  })

  describe('badge', () => {
    it('should not show badge when no active tasks', () => {
      mockActiveCount = 0
      render(<QueueIndicator />)
      expect(screen.queryByTestId('queue-badge')).not.toBeInTheDocument()
    })

    it('should show badge with count when active tasks exist', () => {
      mockActiveCount = 3
      mockStatus = activeSnapshot
      render(<QueueIndicator />)
      const badge = screen.getByTestId('queue-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('3')
    })
  })

  describe('popover toggle', () => {
    it('should not show panel by default', () => {
      render(<QueueIndicator />)
      expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
    })

    it('should show panel when button is clicked', async () => {
      render(<QueueIndicator />)
      fireEvent.click(screen.getByRole('button', { name: '任务队列' }))
      await waitFor(() => {
        expect(screen.getByText('暂无任务')).toBeInTheDocument()
      })
    })

    it('should hide panel when button is clicked again', async () => {
      render(<QueueIndicator />)
      const btn = screen.getByRole('button', { name: '任务队列' })

      fireEvent.click(btn)
      await waitFor(() => {
        expect(screen.getByText('暂无任务')).toBeInTheDocument()
      })

      fireEvent.click(btn)
      await waitFor(() => {
        expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
      })
    })
  })

  describe('task detail dialog', () => {
    it('should not show dialog by default', () => {
      mockStatus = activeSnapshot
      render(<QueueIndicator />)
      expect(screen.queryByTestId('queue-task-detail-dialog')).not.toBeInTheDocument()
    })

    it('should open dialog when task item is clicked', async () => {
      mockStatus = activeSnapshot
      render(<QueueIndicator />)

      fireEvent.click(screen.getByRole('button', { name: '任务队列' }))
      await waitFor(() => {
        expect(screen.getByTestId('queue-task-item')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('queue-task-item'))
      await waitFor(() => {
        expect(screen.getByTestId('queue-task-detail-dialog')).toBeInTheDocument()
        expect(screen.getByTestId('dialog-task-id')).toHaveTextContent('task-1')
      })
    })

    it('should navigate to article when clicking navigate button', async () => {
      mockStatus = activeSnapshot
      mockSelectFeedAndLoad.mockResolvedValue(undefined)
      render(<QueueIndicator />)

      fireEvent.click(screen.getByRole('button', { name: '任务队列' }))
      await waitFor(() => {
        expect(screen.getByTestId('queue-task-item')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('queue-task-item'))
      await waitFor(() => {
        expect(screen.getByText('查看文章')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('查看文章'))
      await waitFor(() => {
        expect(mockSelectFeedAndLoad).toHaveBeenCalledWith('feed-1')
        expect(mockSelectArticle).toHaveBeenCalledWith('art-1')
      })
    })
  })

  describe('keyboard and click-outside', () => {
    it('should close panel on Escape key', async () => {
      render(<QueueIndicator />)
      fireEvent.click(screen.getByRole('button', { name: '任务队列' }))
      await waitFor(() => {
        expect(screen.getByText('暂无任务')).toBeInTheDocument()
      })

      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => {
        expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
      })
    })

    it('should close panel on outside click', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <QueueIndicator />
        </div>
      )
      fireEvent.click(screen.getByRole('button', { name: '任务队列' }))
      await waitFor(() => {
        expect(screen.getByText('暂无任务')).toBeInTheDocument()
      })

      fireEvent.mouseDown(screen.getByTestId('outside'))
      await waitFor(() => {
        expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
      })
    })
  })
})
