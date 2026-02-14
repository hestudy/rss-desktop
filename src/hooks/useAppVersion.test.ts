import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAppVersion } from './useAppVersion'

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(),
}))

import { getVersion } from '@tauri-apps/api/app'

const mockGetVersion = vi.mocked(getVersion)

describe('useAppVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始状态返回空字符串', () => {
    mockGetVersion.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useAppVersion())
    expect(result.current).toBe('')
  })

  it('成功获取版本号后返回带 v 前缀的版本', async () => {
    mockGetVersion.mockResolvedValue('0.0.2')
    const { result } = renderHook(() => useAppVersion())

    await waitFor(() => {
      expect(result.current).toBe('v0.0.2')
    })
  })

  it('获取版本号失败时返回 unknown', async () => {
    mockGetVersion.mockRejectedValue(new Error('Failed'))
    const { result } = renderHook(() => useAppVersion())

    await waitFor(() => {
      expect(result.current).toBe('unknown')
    })
  })

  it('只调用一次 getVersion', async () => {
    mockGetVersion.mockResolvedValue('1.0.0')
    const { result, rerender } = renderHook(() => useAppVersion())
    rerender()

    await waitFor(() => {
      expect(result.current).toBe('v1.0.0')
    })
    expect(mockGetVersion).toHaveBeenCalledTimes(1)
  })

  it('组件卸载后不更新状态', async () => {
    let resolve: (v: string) => void
    mockGetVersion.mockImplementation(
      () => new Promise((r) => { resolve = r })
    )

    const { result, unmount } = renderHook(() => useAppVersion())
    expect(result.current).toBe('')

    unmount()
    resolve!('0.0.3')

    // 卸载后状态应保持为空字符串
    expect(result.current).toBe('')
  })
})
