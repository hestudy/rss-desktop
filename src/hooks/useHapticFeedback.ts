/**
 * 触觉反馈 Hook
 * 封装 Vibration API，为移动端提供震动反馈支持
 */
import { useState, useCallback, useMemo } from 'react'

/** 触觉反馈样式 */
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

/** 触觉反馈配置 */
export interface HapticConfig {
  /** 是否启用触觉反馈 */
  enabled: boolean
}

/** 触觉反馈模式（毫秒） */
const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  /** 轻触 - 短促轻微 */
  light: 10,
  /** 中等 - 适中强度 */
  medium: 20,
  /** 重击 - 较强反馈 */
  heavy: 30,
  /** 成功 - 双击模式 */
  success: [10, 50, 10],
  /** 警告 - 双击较强 */
  warning: [30, 50, 30],
  /** 错误 - 三击模式 */
  error: [50, 100, 50, 100, 50],
}

/** 检测 Vibration API 是否支持 */
function isVibrationSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  )
}

/**
 * 触觉反馈 Hook
 * @param defaultConfig 默认配置
 * @returns 触觉反馈控制对象
 */
export function useHapticFeedback(defaultConfig?: Partial<HapticConfig>) {
  const [enabled, setEnabled] = useState(defaultConfig?.enabled ?? true)

  // 检测 API 支持（只计算一次）
  const isSupported = useMemo(() => isVibrationSupported(), [])

  /**
   * 触发触觉反馈
   * @param style 反馈样式
   */
  const trigger = useCallback(
    (style: HapticStyle = 'light') => {
      if (!enabled || !isSupported) return

      const pattern = HAPTIC_PATTERNS[style]
      navigator.vibrate(pattern)
    },
    [enabled, isSupported]
  )

  // 便捷方法
  const light = useCallback(() => trigger('light'), [trigger])
  const medium = useCallback(() => trigger('medium'), [trigger])
  const heavy = useCallback(() => trigger('heavy'), [trigger])
  const success = useCallback(() => trigger('success'), [trigger])
  const warning = useCallback(() => trigger('warning'), [trigger])
  const error = useCallback(() => trigger('error'), [trigger])

  return {
    /** 是否启用 */
    enabled,
    /** 设置启用状态 */
    setEnabled,
    /** 是否支持触觉反馈 */
    isSupported,
    /** 触发触觉反馈 */
    trigger,
    /** 轻触反馈 */
    light,
    /** 中等反馈 */
    medium,
    /** 重击反馈 */
    heavy,
    /** 成功反馈 */
    success,
    /** 警告反馈 */
    warning,
    /** 错误反馈 */
    error,
  }
}
