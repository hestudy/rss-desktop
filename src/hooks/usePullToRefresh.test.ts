import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePullToRefresh } from './usePullToRefresh'

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

describe('usePullToRefresh', () => {
  let onRefresh: () => Promise<void>
  let onPull: (distance: number, progress: number) => void

  beforeEach(() => {
    vi.clearAllMocks()
    onRefresh = vi.fn<() => Promise<void>>(() => Promise.resolve())
    onPull = vi.fn<(distance: number, progress: number) => void>()
  })

  describe('初始状态', () => {
    it('初始时不处于下拉状态', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      expect(result.current.pullState.isPulling).toBe(false)
      expect(result.current.pullState.isRefreshing).toBe(false)
      expect(result.current.pullState.distance).toBe(0)
      expect(result.current.pullState.progress).toBe(0)
      expect(result.current.pullState.canRefresh).toBe(false)
    })

    it('返回正确的 handlers 对象', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      expect(result.current.handlers).toHaveProperty('onTouchStart')
      expect(result.current.handlers).toHaveProperty('onTouchMove')
      expect(result.current.handlers).toHaveProperty('onTouchEnd')
      expect(typeof result.current.handlers.onTouchStart).toBe('function')
      expect(typeof result.current.handlers.onTouchMove).toBe('function')
      expect(typeof result.current.handlers.onTouchEnd).toBe('function')
    })
  })

  describe('下拉检测', () => {
    it('向下拉动时检测到下拉动作', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      // 触摸开始
      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      expect(result.current.pullState.isPulling).toBe(true)

      // 向下拉动 40px
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 140 }])
        )
      })

      expect(result.current.pullState.isPulling).toBe(true)
      expect(result.current.pullState.distance).toBe(40)
      expect(result.current.pullState.progress).toBeCloseTo(0.5, 1) // 40/80 = 0.5
      expect(result.current.pullState.canRefresh).toBe(false)
    })

    it('向上滑动不触发下拉', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
        )
      })

      // 向上滑动
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 向上滑动不应该是下拉状态
      expect(result.current.pullState.distance).toBeLessThanOrEqual(0)
    })

    it('下拉距离达到阈值时 canRefresh 为 true', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 下拉 80px，达到阈值
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 180 }])
        )
      })

      expect(result.current.pullState.distance).toBe(80)
      expect(result.current.pullState.progress).toBeCloseTo(1, 1)
      expect(result.current.pullState.canRefresh).toBe(true)
    })
  })

  describe('刷新触发', () => {
    it('达到阈值后释放触发刷新', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
        )
      })

      // 释放触发刷新
      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 200 }])
        )
      })

      expect(result.current.pullState.isRefreshing).toBe(true)
      expect(onRefresh).toHaveBeenCalledTimes(1)

      // 等待刷新完成
      await waitFor(() => {
        expect(result.current.pullState.isRefreshing).toBe(false)
      })
    })

    it('未达到阈值后释放不触发刷新', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 只下拉 40px
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 140 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 140 }])
        )
      })

      expect(onRefresh).not.toHaveBeenCalled()
      expect(result.current.pullState.isRefreshing).toBe(false)
    })

    it('刷新完成后重置状态', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 200 }])
        )
      })

      await waitFor(() => {
        expect(result.current.pullState.isPulling).toBe(false)
        expect(result.current.pullState.isRefreshing).toBe(false)
        expect(result.current.pullState.distance).toBe(0)
        expect(result.current.pullState.progress).toBe(0)
        expect(result.current.pullState.canRefresh).toBe(false)
      })
    })
  })

  describe('进度回调', () => {
    it('下拉过程中调用 onPull 回调', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          onPull,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 140 }])
        )
      })

      expect(onPull).toHaveBeenCalledWith(40, 0.5)

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 180 }])
        )
      })

      expect(onPull).toHaveBeenCalledWith(80, 1)
    })
  })

  describe('阻尼效果', () => {
    it('超过阈值后进度增加速度减缓', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
          maxDistance: 160, // 设置更大的 maxDistance 以便测试阻尼效果
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 下拉到阈值
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 180 }])
        )
      })

      const progressAtThreshold = result.current.pullState.progress
      expect(progressAtThreshold).toBeCloseTo(1, 1) // 达到阈值时 progress ≈ 1

      // 再下拉 40px（总共 120px，未达到 maxDistance 160）
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 220 }])
        )
      })

      // 进度应该增加
      expect(result.current.pullState.progress).toBeGreaterThan(progressAtThreshold)
      // progress 的增加应该小于线性增加的量
      // 线性情况下：120/80 = 1.5，但由于阻尼效果应该小于 1.5
      expect(result.current.pullState.progress).toBeLessThan(1.5)
    })

    it('最大下拉距离限制', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
          maxDistance: 120,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 尝试下拉超过 maxDistance
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 300 }])
        )
      })

      // 距离应该被限制在 maxDistance
      expect(result.current.pullState.distance).toBeLessThanOrEqual(120)
    })
  })

  describe('边界情况', () => {
    it('没有 touchstart 直接 touchmove 不报错', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      expect(() => {
        act(() => {
          result.current.handlers.onTouchMove(
            createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
          )
        })
      }).not.toThrow()
    })

    it('没有 touchstart 直接 touchEnd 不报错', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      expect(() => {
        act(() => {
          result.current.handlers.onTouchEnd(
            createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 200 }])
          )
        })
      }).not.toThrow()
    })

    it('多点触控时忽略', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 多点触控
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [
            { clientX: 100, clientY: 200 },
            { clientX: 120, clientY: 200 },
          ])
        )
      })

      // 多点触控时应该重置
      expect(result.current.pullState.isPulling).toBe(false)
    })

    it('touchstart 时多点触控不开始下拉', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 100 },
          ])
        )
      })

      expect(result.current.pullState.isPulling).toBe(false)
    })

    it('刷新过程中忽略新的触摸', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      // 开始第一次刷新
      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 200 }])
        )
      })

      expect(result.current.pullState.isRefreshing).toBe(true)

      // 尝试开始新的触摸
      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 应该不开始新的下拉
      expect(result.current.pullState.isPulling).toBe(false)

      await waitFor(() => {
        expect(result.current.pullState.isRefreshing).toBe(false)
      })
    })

    it('刷新过程中忽略触摸移动', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      // 开始刷新
      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 200 }])
        )
      })

      expect(result.current.pullState.isRefreshing).toBe(true)

      // 在刷新过程中尝试触摸移动
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 300 }])
        )
      })

      // 状态应该保持不变
      expect(result.current.pullState.isRefreshing).toBe(true)
      expect(result.current.pullState.distance).toBe(0)

      await waitFor(() => {
        expect(result.current.pullState.isRefreshing).toBe(false)
      })
    })

    it('touchend 时多点触控重置状态', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
        )
      })

      // touchend 时 changedTouches 有多个（模拟多指同时抬起）
      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [
            { clientX: 100, clientY: 200 },
            { clientX: 120, clientY: 200 },
          ])
        )
      })

      // 多点触控时不应该触发刷新
      expect(onRefresh).not.toHaveBeenCalled()
      expect(result.current.pullState.isRefreshing).toBe(false)
    })

    it('使用默认配置值', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 默认阈值 80px
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 180 }])
        )
      })

      expect(result.current.pullState.canRefresh).toBe(true)
    })
  })

  describe('异步刷新', () => {
    it('刷新失败时不抛出错误', async () => {
      const failingRefresh = vi.fn<() => Promise<void>>(() =>
        Promise.reject(new Error('Network error'))
      )

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: failingRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
        )
      })

      // 不应该抛出错误
      expect(() => {
        act(() => {
          result.current.handlers.onTouchEnd(
            createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 200 }])
          )
        })
      }).not.toThrow()

      // 等待刷新完成后状态重置
      await waitFor(() => {
        expect(result.current.pullState.isRefreshing).toBe(false)
      })
    })

    it('刷新时间较长时保持 refreshing 状态', async () => {
      vi.useFakeTimers()

      let resolveRefresh: () => void
      const slowRefresh = vi.fn<() => Promise<void>>(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve
          })
      )

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: slowRefresh,
          threshold: 80,
        })
      )

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
        )
      })

      act(() => {
        result.current.handlers.onTouchEnd(
          createMockTouchEvent('touchend', [], [{ clientX: 100, clientY: 200 }])
        )
      })

      // 等待 Promise 微任务完成
      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current.pullState.isRefreshing).toBe(true)

      // 等待一段时间
      vi.advanceTimersByTime(1000)

      expect(result.current.pullState.isRefreshing).toBe(true)

      // 完成刷新
      resolveRefresh!()

      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current.pullState.isRefreshing).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('配置更新', () => {
    it('配置更新后使用新的阈值', () => {
      const { result, rerender } = renderHook(
        (config) => usePullToRefresh(config),
        {
          initialProps: {
            onRefresh,
            threshold: 80,
          },
        }
      )

      // 更新阈值为 50
      rerender({
        onRefresh,
        threshold: 50,
      })

      act(() => {
        result.current.handlers.onTouchStart(
          createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
        )
      })

      // 下拉 60px，在新阈值 50 之外
      act(() => {
        result.current.handlers.onTouchMove(
          createMockTouchEvent('touchmove', [{ clientX: 100, clientY: 160 }])
        )
      })

      // 使用新阈值，60px > 50px，应该可以刷新
      expect(result.current.pullState.canRefresh).toBe(true)
    })
  })
})
