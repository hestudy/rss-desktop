import { useState, useCallback, useRef } from 'react'

export interface SwipeConfig {
  /** 触发阈值，默认 100px */
  threshold?: number
  /** 最小速度，默认 0.3 px/ms */
  velocity?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onProgress?: (progress: number, direction: 'left' | 'right' | 'up' | 'down') => void
}

export interface SwipeState {
  isSwiping: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
  /** 0-1 范围 */
  progress: number
}

interface TouchPosition {
  x: number
  y: number
  timestamp: number
}

type SwipeDirection = 'left' | 'right' | 'up' | 'down'

const INITIAL_STATE: SwipeState = {
  isSwiping: false,
  direction: null,
  progress: 0,
}

export function useSwipeGesture(config: SwipeConfig): {
  swipeState: SwipeState
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
} {
  const {
    threshold = 100,
    velocity = 0.3,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onProgress,
  } = config

  const [swipeState, setSwipeState] = useState<SwipeState>(INITIAL_STATE)
  const startPositionRef = useRef<TouchPosition | null>(null)

  const determineDirection = useCallback((deltaX: number, deltaY: number): SwipeDirection => {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // 根据移动距离判断方向
    if (absX >= absY) {
      return deltaX > 0 ? 'right' : 'left'
    }
    return deltaY > 0 ? 'down' : 'up'
  }, [])

  const calculateProgress = useCallback(
    (deltaX: number, deltaY: number, direction: SwipeDirection): number => {
      const distance =
        direction === 'left' || direction === 'right' ? Math.abs(deltaX) : Math.abs(deltaY)
      return Math.min(distance / threshold, 1)
    },
    [threshold]
  )

  const resetSwipe = useCallback(() => {
    startPositionRef.current = null
    setSwipeState(INITIAL_STATE)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // 只处理单点触控
    if (e.touches.length !== 1) {
      return
    }

    const touch = e.touches[0]
    startPositionRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }

    setSwipeState({
      isSwiping: true,
      direction: null,
      progress: 0,
    })
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // 没有起始位置，忽略
      if (!startPositionRef.current) {
        return
      }

      // 只处理单点触控，多点触控时取消滑动
      if (e.touches.length !== 1) {
        resetSwipe()
        return
      }

      const touch = e.touches[0]
      const deltaX = touch.clientX - startPositionRef.current.x
      const deltaY = touch.clientY - startPositionRef.current.y
      const direction = determineDirection(deltaX, deltaY)
      const progress = calculateProgress(deltaX, deltaY, direction)

      setSwipeState({
        isSwiping: true,
        direction,
        progress,
      })

      onProgress?.(progress, direction)
    },
    [determineDirection, calculateProgress, onProgress, resetSwipe]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // 没有起始位置，忽略
      if (!startPositionRef.current) {
        setSwipeState(INITIAL_STATE)
        return
      }

      // 只处理单点触控（通过 changedTouches 判断）
      if (e.changedTouches.length !== 1) {
        resetSwipe()
        return
      }

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - startPositionRef.current.x
      const deltaY = touch.clientY - startPositionRef.current.y
      const deltaTime = Date.now() - startPositionRef.current.timestamp

      // 计算速度 (px/ms)
      // 如果 deltaTime 为 0，说明滑动非常快，视为无限速度
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const currentVelocity = deltaTime > 0 ? distance / deltaTime : Infinity

      const direction = determineDirection(deltaX, deltaY)

      // 判断是否满足触发条件
      const meetsDistanceThreshold =
        Math.abs(deltaX) >= threshold || Math.abs(deltaY) >= threshold
      const meetsVelocityThreshold = currentVelocity >= velocity

      // 重置状态
      resetSwipe()

      // 触发回调
      if (meetsDistanceThreshold && meetsVelocityThreshold) {
        const callbacks: Record<SwipeDirection, (() => void) | undefined> = {
          left: onSwipeLeft,
          right: onSwipeRight,
          up: onSwipeUp,
          down: onSwipeDown,
        }
        callbacks[direction]?.()
      }
    },
    [determineDirection, threshold, velocity, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, resetSwipe]
  )

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
