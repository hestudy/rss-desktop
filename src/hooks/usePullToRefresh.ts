import { useState, useCallback, useRef } from 'react'

export interface PullToRefreshConfig {
  /** 触发刷新的下拉距离阈值，默认 80px */
  threshold?: number
  /** 最大下拉距离，默认 120px */
  maxDistance?: number
  /** 刷新回调 */
  onRefresh: () => Promise<void>
  /** 下拉过程中回调 */
  onPull?: (distance: number, progress: number) => void
}

export interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  distance: number // 当前下拉距离
  progress: number // 0-1 范围，达到 threshold 时为 1
  canRefresh: boolean // 是否达到刷新阈值
}

interface TouchPosition {
  y: number
  scrollTop: number
}

const INITIAL_STATE: PullToRefreshState = {
  isPulling: false,
  isRefreshing: false,
  distance: 0,
  progress: 0,
  canRefresh: false,
}

const DEFAULT_THRESHOLD = 80
const DEFAULT_MAX_DISTANCE = 120

// 阻尼效果参数
const DAMPING_LOG_BASE = 9 // 对数底数参数，控制阻尼曲线
const DAMPING_MAX_PROGRESS = 0.5 // 超过阈值后的最大进度增量

// 最小移动距离，用于判断是否是下拉意图
const MIN_PULL_DISTANCE = 10

export function usePullToRefresh(config: PullToRefreshConfig): {
  pullState: PullToRefreshState
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
} {
  const {
    threshold = DEFAULT_THRESHOLD,
    maxDistance = DEFAULT_MAX_DISTANCE,
    onRefresh,
    onPull,
  } = config

  const [pullState, setPullState] = useState<PullToRefreshState>(INITIAL_STATE)
  const startPositionRef = useRef<TouchPosition | null>(null)
  const isPullingRef = useRef(false)

  /**
   * 计算带阻尼效果的下拉距离和进度
   */
  const calculatePullMetrics = useCallback(
    (rawDistance: number): { distance: number; progress: number } => {
      // 限制最大距离
      const distance = Math.min(rawDistance, maxDistance)

      // 基础进度
      let progress: number

      if (distance <= threshold) {
        // 阈值内线性增长
        progress = distance / threshold
      } else {
        // 超过阈值后应用阻尼效果
        // 使用对数曲线让进度增加变慢
        const excessDistance = distance - threshold
        const maxExcess = maxDistance - threshold
        const excessProgress = Math.log10(1 + (excessDistance / maxExcess) * DAMPING_LOG_BASE)
        progress = 1 + excessProgress * DAMPING_MAX_PROGRESS
      }

      return { distance, progress }
    },
    [threshold, maxDistance]
  )

  const resetPull = useCallback(() => {
    startPositionRef.current = null
    isPullingRef.current = false
    setPullState(INITIAL_STATE)
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // 正在刷新时忽略新的触摸
      if (pullState.isRefreshing) {
        return
      }

      // 只处理单点触控
      if (e.touches.length !== 1) {
        return
      }

      const touch = e.touches[0]
      // 获取滚动容器的 scrollTop
      const scrollContainer = (e.target as HTMLElement).closest('[data-scroll-container]')
      const scrollTop = scrollContainer?.scrollTop ?? 0

      startPositionRef.current = {
        y: touch.clientY,
        scrollTop,
      }
      isPullingRef.current = false
    },
    [pullState.isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // 正在刷新时忽略触摸移动
      if (pullState.isRefreshing) {
        return
      }

      // 没有起始位置，忽略
      if (!startPositionRef.current) {
        return
      }

      // 只处理单点触控，多点触控时重置
      if (e.touches.length !== 1) {
        resetPull()
        return
      }

      const touch = e.touches[0]
      const deltaY = touch.clientY - startPositionRef.current.y

      // 只有在滚动到顶部且向下拉时才处理
      if (startPositionRef.current.scrollTop > 0 || deltaY <= 0) {
        // 不是下拉刷新，重置但不干扰正常滚动
        if (isPullingRef.current) {
          resetPull()
        }
        return
      }

      // 移动距离太小，不认为是下拉
      if (deltaY < MIN_PULL_DISTANCE && !isPullingRef.current) {
        return
      }

      // 标记为下拉中
      isPullingRef.current = true

      const { distance, progress } = calculatePullMetrics(deltaY)
      const canRefresh = distance >= threshold

      setPullState({
        isPulling: true,
        isRefreshing: false,
        distance,
        progress,
        canRefresh,
      })

      onPull?.(distance, progress)
    },
    [pullState.isRefreshing, calculatePullMetrics, resetPull, onPull, threshold]
  )

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      // 没有起始位置，忽略
      if (!startPositionRef.current) {
        setPullState(INITIAL_STATE)
        return
      }

      // 只处理单点触控
      if (e.changedTouches.length !== 1) {
        resetPull()
        return
      }

      // 不是下拉状态，直接重置
      if (!isPullingRef.current) {
        startPositionRef.current = null
        return
      }

      const canRefresh = pullState.canRefresh

      // 重置起始位置
      startPositionRef.current = null
      isPullingRef.current = false

      if (canRefresh) {
        // 开始刷新
        setPullState({
          isPulling: false,
          isRefreshing: true,
          distance: 0,
          progress: 0,
          canRefresh: false,
        })

        try {
          await onRefresh()
        } catch (error) {
          // 刷新失败时静默处理，但仍重置状态
          console.error('Pull to refresh failed:', error)
        } finally {
          setPullState(INITIAL_STATE)
        }
      } else {
        // 未达到阈值，直接重置
        resetPull()
      }
    },
    [pullState.canRefresh, onRefresh, resetPull]
  )

  return {
    pullState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
