import { useState, useEffect, useCallback, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { RssApi } from '../lib/api'
import type { QueueStatusSnapshot } from '../types'

export interface UseQueueStatusReturn {
  status: QueueStatusSnapshot | null
  activeCount: number
  cancelTask: (taskId: string) => Promise<void>
  clearCompleted: () => Promise<void>
}

const DEBOUNCE_MS = 200

export function useQueueStatus(): UseQueueStatusReturn {
  const [status, setStatus] = useState<QueueStatusSnapshot | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const snapshot = await RssApi.queueGetStatus()
      setStatus(snapshot)
    } catch {
      // 静默失败，队列状态更新失败不影响用户体验
    }
  }, [])

  const debouncedRefresh = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      refresh()
    }, DEBOUNCE_MS)
  }, [refresh])

  useEffect(() => {
    refresh()

    const unlistenPromise = listen('queue-task-progress', () => {
      debouncedRefresh()
    })

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      unlistenPromise.then(unlisten => unlisten())
    }
  }, [refresh, debouncedRefresh])

  const cancelTask = useCallback(async (taskId: string) => {
    await RssApi.queueCancelTask(taskId)
    await refresh()
  }, [refresh])

  const clearCompleted = useCallback(async () => {
    await RssApi.queueClearCompleted()
    await refresh()
  }, [refresh])

  const activeCount = status
    ? status.pending_count + status.running_count
    : 0

  return { status, activeCount, cancelTask, clearCompleted }
}
