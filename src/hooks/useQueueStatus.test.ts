import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useQueueStatus } from './useQueueStatus'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { QueueStatusSnapshot } from '../types'

const mockInvoke = vi.mocked(invoke)
const mockListen = vi.mocked(listen)

const emptySnapshot: QueueStatusSnapshot = {
  pending_count: 0,
  running_count: 0,
  completed_count: 0,
  failed_count: 0,
  tasks: [],
}

const activeSnapshot: QueueStatusSnapshot = {
  pending_count: 2,
  running_count: 1,
  completed_count: 3,
  failed_count: 1,
  tasks: [
    {
      id: 'task-1',
      task_type: { type: 'ai_summary', article_id: 'art-1' },
      priority: 'high',
      status: { status: 'running' },
      created_at: '2026-01-01T00:00:00Z',
      started_at: '2026-01-01T00:00:01Z',
      completed_at: null,
      retries: 0,
    },
    {
      id: 'task-2',
      task_type: { type: 'fetch_full_content', article_id: 'art-2', url: 'https://example.com' },
      priority: 'normal',
      status: { status: 'pending' },
      created_at: '2026-01-01T00:00:02Z',
      started_at: null,
      completed_at: null,
      retries: 0,
    },
    {
      id: 'task-3',
      task_type: { type: 'ai_translation', article_id: 'art-3', target_lang: 'zh-CN' },
      priority: 'normal',
      status: { status: 'pending' },
      created_at: '2026-01-01T00:00:03Z',
      started_at: null,
      completed_at: null,
      retries: 0,
    },
  ],
}

describe('useQueueStatus', () => {
  let listenCallback: ((event: { payload: unknown }) => void) | null = null
  const mockUnlisten = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    listenCallback = null

    mockListen.mockImplementation((_event, handler) => {
      listenCallback = handler as (event: { payload: unknown }) => void
      return Promise.resolve(mockUnlisten)
    })
  })

  describe('initialization', () => {
    it('should fetch initial queue status on mount', async () => {
      mockInvoke.mockResolvedValueOnce(emptySnapshot)

      const { result } = renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('queue_get_status')
        expect(result.current.status).toEqual(emptySnapshot)
      })
    })

    it('should register queue-task-progress event listener', async () => {
      mockInvoke.mockResolvedValueOnce(emptySnapshot)

      renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('queue-task-progress', expect.any(Function))
      })
    })

    it('should unregister event listener on unmount', async () => {
      mockInvoke.mockResolvedValueOnce(emptySnapshot)

      const { unmount } = renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalled()
      })

      unmount()

      await waitFor(() => {
        expect(mockUnlisten).toHaveBeenCalled()
      })
    })
  })

  describe('activeCount', () => {
    it('should return 0 when no active tasks', async () => {
      mockInvoke.mockResolvedValueOnce(emptySnapshot)

      const { result } = renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(result.current.activeCount).toBe(0)
      })
    })

    it('should return sum of pending and running counts', async () => {
      mockInvoke.mockResolvedValueOnce(activeSnapshot)

      const { result } = renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(result.current.activeCount).toBe(3)
      })
    })
  })

  describe('event-driven refresh', () => {
    it('should refresh status when task progress event is received', async () => {
      mockInvoke
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce(activeSnapshot)

      const { result } = renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(result.current.status).toEqual(emptySnapshot)
      })

      act(() => {
        listenCallback?.({ payload: { task_id: 'task-1', status: 'completed' } })
      })

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(2)
        expect(result.current.status).toEqual(activeSnapshot)
      })
    })
  })

  describe('cancelTask', () => {
    it('should call queue_cancel_task and refresh status', async () => {
      mockInvoke
        .mockResolvedValueOnce(activeSnapshot)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(emptySnapshot)

      const { result } = renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(result.current.status).toEqual(activeSnapshot)
      })

      await act(async () => {
        await result.current.cancelTask('task-1')
      })

      expect(mockInvoke).toHaveBeenCalledWith('queue_cancel_task', { taskId: 'task-1' })
    })
  })

  describe('clearCompleted', () => {
    it('should call queue_clear_completed and refresh status', async () => {
      mockInvoke
        .mockResolvedValueOnce(activeSnapshot)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(emptySnapshot)

      const { result } = renderHook(() => useQueueStatus())

      await waitFor(() => {
        expect(result.current.status).toEqual(activeSnapshot)
      })

      await act(async () => {
        await result.current.clearCompleted()
      })

      expect(mockInvoke).toHaveBeenCalledWith('queue_clear_completed')
    })
  })
})
