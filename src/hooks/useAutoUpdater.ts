import { useState, useEffect, useCallback, useRef } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { getSettings, type AutoUpdateCheckInterval } from '../lib/settings'

/**
 * 更新信息
 */
export interface UpdateInfo {
  /** 新版本号 */
  version: string
  /** 当前版本号 */
  currentVersion: string
  /** 发布日期 */
  date?: Date
  /** 更新说明 */
  body?: string
}

/**
 * useAutoUpdater Hook 返回值
 */
export interface UseAutoUpdaterReturn {
  /** 是否正在检查更新 */
  isChecking: boolean
  /** 更新信息（如果有新版本） */
  updateInfo: UpdateInfo | null
  /** 错误信息 */
  error: string | null
  /** 是否启用自动检查 */
  isAutoCheckEnabled: boolean
  /** 手动检查更新 */
  checkForUpdates: () => Promise<void>
  /** 下载并安装更新 */
  downloadAndInstall: () => Promise<void>
  /** 忽略更新 */
  dismissUpdate: () => void
}

/**
 * 将间隔配置转换为毫秒数
 */
function intervalToMillis(interval: AutoUpdateCheckInterval): number {
  const hoursMap: Record<AutoUpdateCheckInterval, number> = {
    '1h': 1,
    '4h': 4,
    '8h': 8,
    '12h': 12,
    '24h': 24,
  }
  return hoursMap[interval] * 60 * 60 * 1000
}

/**
 * 自动更新检查 Hook
 *
 * 功能：
 * - 应用启动后延迟 5 秒自动检查更新
 * - 可配置检查间隔（1/4/8/12/24 小时）
 * - 发现新版本时返回更新信息
 * - 支持手动检查、下载安装、忽略更新
 */
export function useAutoUpdater(): UseAutoUpdaterReturn {
  const [isChecking, setIsChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAutoCheckEnabled, setIsAutoCheckEnabled] = useState(true)
  const [checkInterval, setCheckInterval] = useState<AutoUpdateCheckInterval>('4h')

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCheckingRef = useRef(false)

  /**
   * 检查更新
   */
  const checkForUpdates = useCallback(async () => {
    // Use ref to prevent concurrent checks
    if (isCheckingRef.current) return

    isCheckingRef.current = true
    setIsChecking(true)
    setError(null)

    try {
      const update = await check()

      if (update?.available) {
        setUpdateInfo({
          version: update.version,
          currentVersion: update.currentVersion,
          date: update.date,
          body: update.body,
        })
      } else {
        setUpdateInfo(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setIsChecking(false)
      isCheckingRef.current = false
    }
  }, [])

  /**
   * 下载并安装更新
   */
  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo) return

    try {
      const update = await check()
      if (update?.available) {
        await update.downloadAndInstall()
        await relaunch()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed'
      setError(errorMessage)
    }
  }, [updateInfo])

  /**
   * 忽略更新
   */
  const dismissUpdate = useCallback(() => {
    setUpdateInfo(null)
  }, [])

  /**
   * 清理所有定时器
   */
  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current)
      initialTimeoutRef.current = null
    }
  }, [])

  /**
   * 加载设置并初始化
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings()
        setIsAutoCheckEnabled(settings.enableAutoUpdateCheck)
        setCheckInterval(settings.autoUpdateCheckInterval)
      } catch {
        // Use defaults
      }
    }
    loadSettings()
  }, [])

  /**
   * 设置自动检查定时器
   */
  useEffect(() => {
    clearAllTimers()

    if (!isAutoCheckEnabled) {
      return
    }

    // Initial check after 5 seconds
    initialTimeoutRef.current = setTimeout(() => {
      checkForUpdates()

      // Schedule periodic checks
      const interval = intervalToMillis(checkInterval)
      intervalRef.current = setInterval(() => {
        checkForUpdates()
      }, interval)
    }, 5000)

    return clearAllTimers
  }, [isAutoCheckEnabled, checkInterval, checkForUpdates, clearAllTimers])

  return {
    isChecking,
    updateInfo,
    error,
    isAutoCheckEnabled,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
  }
}
