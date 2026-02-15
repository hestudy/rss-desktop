import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoUpdater } from './useAutoUpdater'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { getSettings } from '../lib/settings'

// Mock dependencies
vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(),
}))

vi.mock('../lib/settings', () => ({
  getSettings: vi.fn(),
}))

describe('useAutoUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: true,
        autoUpdateCheckInterval: '4h',
      } as any)

      const { result } = renderHook(() => useAutoUpdater())

      // Initial state
      expect(result.current.isChecking).toBe(false)
      expect(result.current.updateInfo).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('manual check', () => {
    it('should provide manual check function', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check).mockResolvedValue(null)

      const { result } = renderHook(() => useAutoUpdater())

      // Wait for initial render
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Manual check
      await act(async () => {
        await result.current.checkForUpdates()
      })

      expect(check).toHaveBeenCalledTimes(1)
    })

    it('should prevent concurrent checks', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)

      let resolveCheck: () => void
      const checkPromise = new Promise((resolve) => {
        resolveCheck = () => resolve(null)
      })
      vi.mocked(check).mockReturnValue(checkPromise as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Start first check (don't await)
      const firstCheck = result.current.checkForUpdates()

      // Try concurrent check
      await act(async () => {
        await result.current.checkForUpdates()
      })

      // Only one call should be made
      expect(check).toHaveBeenCalledTimes(1)

      // Resolve and cleanup
      resolveCheck!()
      await firstCheck
    })

    it('should detect available update', async () => {
      const mockUpdate = {
        available: true,
        version: '2.0.0',
        currentVersion: '1.0.0',
        date: new Date(),
        body: 'Release notes',
        downloadAndInstall: vi.fn(),
      }

      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check).mockResolvedValue(mockUpdate as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.checkForUpdates()
      })

      expect(result.current.updateInfo).not.toBeNull()
      expect(result.current.updateInfo?.version).toBe('2.0.0')
      expect(result.current.updateInfo?.currentVersion).toBe('1.0.0')
    })

    it('should not set update info when no update available', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check).mockResolvedValue(null)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.checkForUpdates()
      })

      expect(result.current.updateInfo).toBeNull()
    })

    it('should set isChecking during check', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)

      let resolveCheck: () => void
      const checkPromise = new Promise((resolve) => {
        resolveCheck = () => resolve(null)
      })
      vi.mocked(check).mockReturnValue(checkPromise as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Start check (don't await)
      const checkPromiseResult = result.current.checkForUpdates()

      // Give React time to update state
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.isChecking).toBe(true)

      // Resolve
      resolveCheck!()
      await act(async () => {
        await checkPromiseResult
      })

      // After resolve, should be false
      expect(result.current.isChecking).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle check errors gracefully', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.checkForUpdates()
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isChecking).toBe(false)
    })

    it('should clear error on retry', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(null)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // First check fails
      await act(async () => {
        await result.current.checkForUpdates()
      })
      expect(result.current.error).toBe('Network error')

      // Retry
      await act(async () => {
        await result.current.checkForUpdates()
      })
      expect(result.current.error).toBeNull()
    })
  })

  describe('download and install', () => {
    it('should download and install update', async () => {
      const mockDownloadAndInstall = vi.fn().mockResolvedValue(undefined)
      const mockUpdate = {
        available: true,
        version: '2.0.0',
        currentVersion: '1.0.0',
        date: new Date(),
        body: 'Release notes',
        downloadAndInstall: mockDownloadAndInstall,
      }

      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check).mockResolvedValue(mockUpdate as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // First, check for updates
      await act(async () => {
        await result.current.checkForUpdates()
      })
      expect(result.current.updateInfo).not.toBeNull()

      // Download and install
      await act(async () => {
        await result.current.downloadAndInstall()
      })

      expect(mockDownloadAndInstall).toHaveBeenCalled()
      expect(relaunch).toHaveBeenCalled()
    })

    it('should handle download error', async () => {
      const mockDownloadAndInstall = vi.fn().mockRejectedValue(new Error('Download failed'))
      const mockUpdate = {
        available: true,
        version: '2.0.0',
        currentVersion: '1.0.0',
        date: new Date(),
        body: 'Release notes',
        downloadAndInstall: mockDownloadAndInstall,
      }

      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check).mockResolvedValue(mockUpdate as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.checkForUpdates()
      })

      await act(async () => {
        await result.current.downloadAndInstall()
      })

      expect(result.current.error).toBe('Download failed')
    })

    it('should not download when no update info', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.downloadAndInstall()
      })

      expect(check).not.toHaveBeenCalled()
    })
  })

  describe('dismiss update', () => {
    it('should allow dismissing update banner', async () => {
      const mockUpdate = {
        available: true,
        version: '2.0.0',
        currentVersion: '1.0.0',
        date: new Date(),
        body: 'Release notes',
        downloadAndInstall: vi.fn(),
      }

      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '4h',
      } as any)
      vi.mocked(check).mockResolvedValue(mockUpdate as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.checkForUpdates()
      })
      expect(result.current.updateInfo).not.toBeNull()

      // Dismiss
      act(() => {
        result.current.dismissUpdate()
      })

      expect(result.current.updateInfo).toBeNull()
    })
  })

  describe('settings', () => {
    it('should load auto update settings from config', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        enableAutoUpdateCheck: false,
        autoUpdateCheckInterval: '12h',
      } as any)

      const { result } = renderHook(() => useAutoUpdater())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.isAutoCheckEnabled).toBe(false)
    })
  })
})
