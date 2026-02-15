import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useNotificationNavigation } from './useNotificationNavigation'

const mockInvoke = vi.mocked(invoke)
const mockListen = vi.mocked(listen)

describe('useNotificationNavigation', () => {
  let focusCallback: (() => void) | null = null
  const mockSelectFeedAndLoad = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    focusCallback = null

    mockListen.mockImplementation((event: string, cb: unknown) => {
      if (event === 'tauri://focus') {
        focusCallback = cb as () => void
      }
      return Promise.resolve(() => {})
    })
  })

  it('should register a tauri://focus listener on mount', () => {
    renderHook(() => useNotificationNavigation(mockSelectFeedAndLoad))
    expect(mockListen).toHaveBeenCalledWith(
      'tauri://focus',
      expect.any(Function),
    )
  })

  it('should call get_pending_notification_feed on focus', async () => {
    mockInvoke.mockResolvedValue(null)
    renderHook(() => useNotificationNavigation(mockSelectFeedAndLoad))

    await act(async () => {
      await focusCallback?.()
    })

    expect(mockInvoke).toHaveBeenCalledWith('get_pending_notification_feed')
  })

  it('should navigate when pending feed_id exists', async () => {
    mockInvoke.mockResolvedValue('feed-123')
    renderHook(() => useNotificationNavigation(mockSelectFeedAndLoad))

    await act(async () => {
      await focusCallback?.()
    })

    expect(mockSelectFeedAndLoad).toHaveBeenCalledWith('feed-123')
  })

  it('should NOT navigate when no pending feed_id', async () => {
    mockInvoke.mockResolvedValue(null)
    renderHook(() => useNotificationNavigation(mockSelectFeedAndLoad))

    await act(async () => {
      await focusCallback?.()
    })

    expect(mockSelectFeedAndLoad).not.toHaveBeenCalled()
  })

  it('should clean up listener on unmount', async () => {
    const unlisten = vi.fn()
    mockListen.mockResolvedValue(unlisten)

    const { unmount } = renderHook(() =>
      useNotificationNavigation(mockSelectFeedAndLoad),
    )
    unmount()

    await waitFor(() => {
      expect(unlisten).toHaveBeenCalled()
    })
  })

  it('should handle invoke errors gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Command failed'))
    renderHook(() => useNotificationNavigation(mockSelectFeedAndLoad))

    // Should not throw
    await act(async () => {
      await focusCallback?.()
    })

    expect(mockSelectFeedAndLoad).not.toHaveBeenCalled()
  })
})
