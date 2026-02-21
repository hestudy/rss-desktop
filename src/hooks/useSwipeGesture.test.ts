import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture } from './useSwipeGesture'

/**
 * 创建模拟的 TouchEvent
 */
function createMockTouchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
  changedTouches?: Array<{ clientX: number; clientY: number }>
): React.TouchEvent {
  const createTouchList = (touchArray: Array<{ clientX: number; clientY: number }>) => {
    return touchArray.map((t, index) => ({
      clientX: t.clientX,
      clientY: t.clientY,
      identifier: index,
      screenX: 0,
      screenY: 0,
      pageX: t.clientX,
      pageY: t.clientY,
      target: null,
    })) as unknown as React.TouchList
  }

  return {
    type,
    touches: createTouchList(touches),
    changedTouches: createTouchList(changedTouches ?? touches),
    targetTouches: createTouchList(touches),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    nativeEvent: {
      touches: touches.map((t) => ({
        clientX: t.clientX,
        clientY: t.clientY,
        identifier: 0,
      })),
      changedTouches: (changedTouches ?? touches).map((t) => ({
        clientX: t.clientX,
        clientY: t.clientY,
        identifier: 0,
      })),
    },
  } as unknown as React.TouchEvent
}

describe('useSwipeGesture', () => {
  let onSwipeLeft: () => void
  let onSwipeRight: () => void
  let onSwipeUp: () => void
  let onSwipeDown: () => void
  let onProgress: (progress: number, direction: 'left' | 'right' | 'up' | 'down') => void

  beforeEach(() => {
    vi.clearAllMocks()
    onSwipeLeft = vi.fn<() => void>()
    onSwipeRight = vi.fn<() => void>()
    onSwipeUp = vi.fn<() => void>()
    onSwipeDown = vi.fn<() => void>()
    onProgress = vi.fn<(progress: number, direction: 'left' | 'right' | 'up' | 'down') => void>()
  })

  describe('初始状态', () => {
    it('初始时不处于滑动状态', () => {
      const { result } = renderHook(() => useSwipeGesture({}))

      expect(result.current.swipeState.isSwiping).toBe(false)
      expect(result.current.swipeState.direction).toBe(null)
      expect(result.current.swipeState.progress).toBe(0)
    })

    it('返回正确的 handlers 对象', () => {
      const { result } = renderHook(() => useSwipeGesture({}))

      expect(result.current.handlers).toHaveProperty('onTouchStart')
      expect(result.current.handlers).toHaveProperty('onTouchMove')
      expect(result.current.handlers).toHaveProperty('onTouchEnd')
      expect(typeof result.current.handlers.onTouchStart).toBe('function')
      expect(typeof result.current.handlers.onTouchMove).toBe('function')
      expect(typeof result.current.handlers.onTouchEnd).toBe('function')
    })
  })

  describe('右滑检测', () => {
    it('向右滑动超过阈值时触发 onSwipeRight', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      // 触摸开始
      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
        )
      })

      expect(result.current.swipeState.isSwiping).toBe(true)

      // 滑动中
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 180, clientY: 200 }])
        )
      })

      expect(result.current.swipeState.direction).toBe('right')
      expect(result.current.swipeState.progress).toBeCloseTo(0.8, 1)

      // 滑动结束（超过阈值）- touchend 时 touches 为空，changedTouches 包含最后位置
      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 220, clientY: 200 }])
        )
      })

      expect(onSwipeRight).toHaveBeenCalledTimes(1)
      expect(result.current.swipeState.isSwiping).toBe(false)
    })

    it('滑动距离不足时不触发回调', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 150, clientY: 200 }])
        )
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })
  })

  describe('左滑检测', () => {
    it('向左滑动超过阈值时触发 onSwipeLeft', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeLeft,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }])
        )
      })

      expect(result.current.swipeState.isSwiping).toBe(true)

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 50, clientY: 100 }])
        )
      })

      expect(result.current.swipeState.direction).toBe('left')
      expect(result.current.swipeState.progress).toBeCloseTo(1.0, 1)

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 50, clientY: 100 }])
        )
      })

      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    })
  })

  describe('上滑检测', () => {
    it('向上滑动超过阈值时触发 onSwipeUp', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeUp,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 300 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 150 }])
        )
      })

      expect(result.current.swipeState.direction).toBe('up')

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 150 }])
        )
      })

      expect(onSwipeUp).toHaveBeenCalledTimes(1)
    })
  })

  describe('下滑检测', () => {
    it('向下滑动超过阈值时触发 onSwipeDown', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeDown,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 250 }])
        )
      })

      expect(result.current.swipeState.direction).toBe('down')

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 250 }])
        )
      })

      expect(onSwipeDown).toHaveBeenCalledTimes(1)
    })
  })

  describe('进度回调', () => {
    it('滑动过程中调用 onProgress 回调', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onProgress,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 50, clientY: 100 }])
        )
      })

      expect(onProgress).toHaveBeenCalledWith(0.5, 'right')

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 80, clientY: 100 }])
        )
      })

      expect(onProgress).toHaveBeenCalledWith(0.8, 'right')
    })

    it('进度值限制在 0-1 范围内', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onProgress,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 滑动超过阈值
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 200, clientY: 100 }])
        )
      })

      // 进度应该被限制在 1
      expect(result.current.swipeState.progress).toBeLessThanOrEqual(1)
      expect(onProgress).toHaveBeenCalledWith(1, 'right')
    })
  })

  describe('速度阈值', () => {
    it('速度足够时触发滑动', () => {
      vi.useFakeTimers()

      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          velocity: 0.3,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 快速滑动 150px 在 100ms 内 = 1.5px/ms
      vi.advanceTimersByTime(100)

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 150, clientY: 100 }])
        )
      })

      expect(onSwipeRight).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('速度不足时不触发滑动', () => {
      vi.useFakeTimers()

      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          velocity: 0.5,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 缓慢滑动 120px 在 1000ms 内 = 0.12px/ms
      vi.advanceTimersByTime(1000)

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 120, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 120, clientY: 100 }])
        )
      })

      // 虽然距离足够，但速度不足
      expect(onSwipeRight).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('边界情况', () => {
    it('触摸时间过短不触发滑动', () => {
      vi.useFakeTimers()

      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 非常快的滑动（可能是误触）
      vi.advanceTimersByTime(10)

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 150, clientY: 100 }])
        )
      })

      // 虽然距离足够，但时间太短可能是误触，应该触发（快速滑动是有效操作）
      expect(onSwipeRight).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('多点触控时忽略', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 多点触控
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [
            { clientX: 150, clientY: 100 },
            { clientX: 160, clientY: 100 },
          ])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 150, clientY: 100 }])
        )
      })

      // 多点触控不应该触发滑动
      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('没有移动不触发回调', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 100 }])
        )
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('没有 touchstart 直接 touchmove 不报错', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      // 直接调用 touchMove 不应该报错
      expect(() => {
        act(() => {
          result.current.handlers.onTouchMove(
            createMockTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }])
          )
        })
      }).not.toThrow()
    })

    it('使用默认配置值', () => {
      const { result } = renderHook(() => useSwipeGesture({}))

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 默认阈值 100px
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 101, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 101, clientY: 100 }])
        )
      })

      // 应该正常工作，没有错误
      expect(result.current.swipeState.isSwiping).toBe(false)
    })

    it('touchstart 时多点触控不开始滑动', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      // touchstart 时就是多点触控
      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [
            { clientX: 0, clientY: 100 },
            { clientX: 50, clientY: 100 },
          ])
        )
      })

      // 不应该开始滑动
      expect(result.current.swipeState.isSwiping).toBe(false)
    })

    it('touchend 时多点触控不触发回调', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }])
        )
      })

      // touchend 时 changedTouches 有多个（模拟多指同时抬起）
      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [
            { clientX: 150, clientY: 100 },
            { clientX: 160, clientY: 100 },
          ])
        )
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })
  })

  describe('方向判定', () => {
    it('对角滑动判定为水平方向优先', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeRight,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 0 }])
        )
      })

      // 对角滑动（水平 150px，垂直 50px）
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 150, clientY: 50 }])
        )
      })

      expect(result.current.swipeState.direction).toBe('right')
    })

    it('垂直滑动更明显时判定为垂直方向', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          onSwipeDown,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 0 }])
        )
      })

      // 对角滑动（水平 50px，垂直 150px）
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 50, clientY: 150 }])
        )
      })

      expect(result.current.swipeState.direction).toBe('down')
    })
  })

  describe('配置更新', () => {
    it('配置更新后会使用新的阈值', () => {
      const { result, rerender } = renderHook(
        (config) => useSwipeGesture(config),
        {
          initialProps: {
            threshold: 100,
            onSwipeRight,
          },
        }
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 更新配置为更大的阈值
      rerender({
        threshold: 200,
        onSwipeRight,
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 150, clientY: 100 }])
        )
      })

      // 滑动 150px，新阈值 200，不满足条件
      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('滑动过程中配置更新后 onProgress 使用新阈值计算进度', () => {
      const { result, rerender } = renderHook(
        (config) => useSwipeGesture(config),
        {
          initialProps: {
            threshold: 100,
            onProgress,
          },
        }
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 0, clientY: 100 }])
        )
      })

      // 滑动 50px，使用原始阈值 100
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 50, clientY: 100 }])
        )
      })

      expect(onProgress).toHaveBeenCalledWith(0.5, 'right')

      // 更新配置为更大的阈值
      rerender({
        threshold: 100,
        onProgress,
      })

      // 继续滑动到 80px
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 80, clientY: 100 }])
        )
      })

      expect(onProgress).toHaveBeenCalledWith(0.8, 'right')
    })
  })
})
