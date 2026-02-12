import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueuePanel } from './QueuePanel'
import type { QueueStatusSnapshot, QueueTask } from '../../types'

vi.mock('lucide-react', () => ({
  FileText: (props: Record<string, unknown>) => <svg data-testid="file-text-icon" {...props} />,
  Sparkles: (props: Record<string, unknown>) => <svg data-testid="sparkles-icon" {...props} />,
  Languages: (props: Record<string, unknown>) => <svg data-testid="languages-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
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

const emptySnapshot: QueueStatusSnapshot = {
  pending_count: 0,
  running_count: 0,
  completed_count: 0,
  failed_count: 0,
  tasks: [],
}

describe('QueuePanel', () => {
  const defaultProps = {
    status: emptySnapshot,
    onCancelTask: vi.fn(),
    onClearCompleted: vi.fn(),
  }

  describe('empty state', () => {
    it('should show empty message when no tasks', () => {
      render(<QueuePanel {...defaultProps} />)
      expect(screen.getByText('暂无任务')).toBeInTheDocument()
    })

    it('should show empty message when status is null', () => {
      render(<QueuePanel {...defaultProps} status={null} />)
      expect(screen.getByText('暂无任务')).toBeInTheDocument()
    })
  })

  describe('task type labels', () => {
    it('should display "全文抓取" for fetch_full_content', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        running_count: 1,
        tasks: [makeTask({
          id: 't1',
          task_type: { type: 'fetch_full_content', article_id: 'a1', url: 'https://example.com' },
          status: { status: 'running' },
        })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.getByText('全文抓取')).toBeInTheDocument()
    })

    it('should display "AI 摘要" for ai_summary', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        running_count: 1,
        tasks: [makeTask({
          id: 't1',
          task_type: { type: 'ai_summary', article_id: 'a1' },
          status: { status: 'running' },
        })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.getByText('AI 摘要')).toBeInTheDocument()
    })

    it('should display "AI 翻译" for ai_translation', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        running_count: 1,
        tasks: [makeTask({
          id: 't1',
          task_type: { type: 'ai_translation', article_id: 'a1', target_lang: 'zh-CN' },
          status: { status: 'running' },
        })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.getByText('AI 翻译')).toBeInTheDocument()
    })
  })

  describe('task status rendering', () => {
    it('should render running tasks with animation indicator', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        running_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'running' } })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('should render pending tasks with clock icon', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        pending_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'pending' } })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('should render failed tasks with error message', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        failed_count: 1,
        tasks: [makeTask({
          id: 't1',
          status: { status: 'failed', error: 'Network timeout', retries: 3 },
          retries: 3,
        })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
      expect(screen.getByText('Network timeout')).toBeInTheDocument()
    })

    it('should render completed tasks with check icon', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        completed_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'completed' } })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })
  })

  describe('cancel button', () => {
    it('should show cancel button for pending tasks', () => {
      const onCancelTask = vi.fn()
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        pending_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'pending' } })],
      }
      render(<QueuePanel {...defaultProps} status={status} onCancelTask={onCancelTask} />)

      const cancelBtn = screen.getByRole('button', { name: '取消任务' })
      fireEvent.click(cancelBtn)
      expect(onCancelTask).toHaveBeenCalledWith('t1')
    })

    it('should show cancel button for running tasks', () => {
      const onCancelTask = vi.fn()
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        running_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'running' } })],
      }
      render(<QueuePanel {...defaultProps} status={status} onCancelTask={onCancelTask} />)

      const cancelBtn = screen.getByRole('button', { name: '取消任务' })
      fireEvent.click(cancelBtn)
      expect(onCancelTask).toHaveBeenCalledWith('t1')
    })

    it('should not show cancel button for completed tasks', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        completed_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'completed' } })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.queryByRole('button', { name: '取消任务' })).not.toBeInTheDocument()
    })

    it('should not show cancel button for failed tasks', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        failed_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'failed', error: 'err', retries: 3 } })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.queryByRole('button', { name: '取消任务' })).not.toBeInTheDocument()
    })
  })

  describe('clear completed button', () => {
    it('should show clear button when completed tasks exist', () => {
      const onClearCompleted = vi.fn()
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        completed_count: 2,
        tasks: [
          makeTask({ id: 't1', status: { status: 'completed' } }),
          makeTask({ id: 't2', status: { status: 'completed' } }),
        ],
      }
      render(<QueuePanel {...defaultProps} status={status} onClearCompleted={onClearCompleted} />)

      const clearBtn = screen.getByRole('button', { name: '清除已完成' })
      fireEvent.click(clearBtn)
      expect(onClearCompleted).toHaveBeenCalled()
    })

    it('should not show clear button when no completed tasks', () => {
      const status: QueueStatusSnapshot = {
        ...emptySnapshot,
        pending_count: 1,
        tasks: [makeTask({ id: 't1', status: { status: 'pending' } })],
      }
      render(<QueuePanel {...defaultProps} status={status} />)
      expect(screen.queryByRole('button', { name: '清除已完成' })).not.toBeInTheDocument()
    })
  })

  describe('task ordering', () => {
    it('should render tasks in order: running → pending → failed → completed', () => {
      const status: QueueStatusSnapshot = {
        pending_count: 1,
        running_count: 1,
        completed_count: 1,
        failed_count: 1,
        tasks: [
          makeTask({ id: 'completed-1', status: { status: 'completed' } }),
          makeTask({ id: 'pending-1', status: { status: 'pending' } }),
          makeTask({ id: 'failed-1', status: { status: 'failed', error: 'err', retries: 1 } }),
          makeTask({ id: 'running-1', status: { status: 'running' } }),
        ],
      }
      render(<QueuePanel {...defaultProps} status={status} />)

      const items = screen.getAllByTestId('queue-task-item')
      expect(items).toHaveLength(4)
      expect(items[0]).toHaveAttribute('data-task-id', 'running-1')
      expect(items[1]).toHaveAttribute('data-task-id', 'pending-1')
      expect(items[2]).toHaveAttribute('data-task-id', 'failed-1')
      expect(items[3]).toHaveAttribute('data-task-id', 'completed-1')
    })
  })
})
