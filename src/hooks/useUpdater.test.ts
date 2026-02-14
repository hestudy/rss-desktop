import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpdater } from './useUpdater'

// Mock @tauri-apps/plugin-updater
const mockUpdate = {
  version: '1.0.0',
  body: 'New features and bug fixes',
  downloadAndInstall: vi.fn(),
}

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(),
}))

import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const mockCheck = vi.mocked(check)
const mockRelaunch = vi.mocked(relaunch)

describe('useUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始状态应为 idle', () => {
    const { result } = renderHook(() => useUpdater())

    expect(result.current.status).toBe('idle')
    expect(result.current.newVersion).toBeNull()
    expect(result.current.releaseNotes).toBeNull()
    expect(result.current.progress).toBe(0)
    expect(result.current.errorMessage).toBeNull()
  })

  it('检查更新时状态变为 checking', async () => {
    mockCheck.mockImplementation(
      () => new Promise(() => {}) // 永不 resolve，保持 checking 状态
    )

    const { result } = renderHook(() => useUpdater())

    act(() => {
      result.current.checkForUpdates()
    })

    expect(result.current.status).toBe('checking')
  })

  it('没有新版本时状态变为 up-to-date', async () => {
    mockCheck.mockResolvedValue(null)

    const { result } = renderHook(() => useUpdater())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(result.current.status).toBe('up-to-date')
    expect(result.current.newVersion).toBeNull()
  })

  it('发现新版本时状态变为 available', async () => {
    mockCheck.mockResolvedValue(mockUpdate as never)

    const { result } = renderHook(() => useUpdater())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(result.current.status).toBe('available')
    expect(result.current.newVersion).toBe('1.0.0')
    expect(result.current.releaseNotes).toBe('New features and bug fixes')
  })

  it('检查更新失败时状态变为 error', async () => {
    mockCheck.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUpdater())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('Network error')
  })

  it('下载并安装更新', async () => {
    mockUpdate.downloadAndInstall.mockResolvedValue(undefined)
    mockCheck.mockResolvedValue(mockUpdate as never)

    const { result } = renderHook(() => useUpdater())

    // 先检查更新
    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(result.current.status).toBe('available')

    // 下载并安装
    await act(async () => {
      await result.current.downloadAndInstall()
    })

    expect(mockUpdate.downloadAndInstall).toHaveBeenCalled()
    expect(result.current.status).toBe('ready')
  })

  it('下载失败时状态变为 error', async () => {
    mockUpdate.downloadAndInstall.mockRejectedValue(new Error('Download failed'))
    mockCheck.mockResolvedValue(mockUpdate as never)

    const { result } = renderHook(() => useUpdater())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    await act(async () => {
      await result.current.downloadAndInstall()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('Download failed')
  })

  it('安装完成后可以重启应用', async () => {
    mockUpdate.downloadAndInstall.mockResolvedValue(undefined)
    mockRelaunch.mockResolvedValue(undefined)
    mockCheck.mockResolvedValue(mockUpdate as never)

    const { result } = renderHook(() => useUpdater())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    await act(async () => {
      await result.current.downloadAndInstall()
    })

    expect(result.current.status).toBe('ready')

    await act(async () => {
      await result.current.restartApp()
    })

    expect(mockRelaunch).toHaveBeenCalled()
  })

  it('重启失败时状态变为 error', async () => {
    mockUpdate.downloadAndInstall.mockResolvedValue(undefined)
    mockRelaunch.mockRejectedValue(new Error('Relaunch failed'))
    mockCheck.mockResolvedValue(mockUpdate as never)

    const { result } = renderHook(() => useUpdater())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    await act(async () => {
      await result.current.downloadAndInstall()
    })

    await act(async () => {
      await result.current.restartApp()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('Relaunch failed')
  })

  it('未发现更新时 downloadAndInstall 不执行', async () => {
    mockCheck.mockResolvedValue(null)

    const { result } = renderHook(() => useUpdater())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    await act(async () => {
      await result.current.downloadAndInstall()
    })

    // 状态应保持 up-to-date，不应调用 downloadAndInstall
    expect(result.current.status).toBe('up-to-date')
  })
})
