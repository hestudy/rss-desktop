import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

/**
 * 监听窗口 focus 事件，检查是否有待跳转的通知 feed_id。
 * 用户点击系统通知后，应用窗口获得焦点时自动跳转到对应订阅。
 *
 * 注意：由于 tauri-plugin-notification 桌面端不支持通知点击回调，
 * 采用 pending state + window focus 方案。当用户通过 Alt+Tab 等方式
 * 切回窗口时也会触发跳转（如果有 pending feed_id）。
 */
export function useNotificationNavigation(
  selectFeedAndLoad: (feedId: string) => Promise<void>,
) {
  const selectFeedRef = useRef(selectFeedAndLoad)
  selectFeedRef.current = selectFeedAndLoad
  const navigatingRef = useRef(false)

  useEffect(() => {
    const unlistenPromise = listen('tauri://focus', async () => {
      if (navigatingRef.current) return
      try {
        const feedId = await invoke<string | null>(
          'get_pending_notification_feed',
        )
        if (feedId) {
          navigatingRef.current = true
          try {
            await selectFeedRef.current(feedId)
          } finally {
            navigatingRef.current = false
          }
        }
      } catch {
        // 静默处理错误，不影响用户体验
      }
    })

    return () => {
      unlistenPromise.then((fn) => fn())
    }
  }, [])
}
