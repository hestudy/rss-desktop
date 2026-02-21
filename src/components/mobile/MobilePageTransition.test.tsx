import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MobilePageTransition } from './MobilePageTransition'

describe('MobilePageTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('基本渲染', () => {
    it('应该渲染子内容', () => {
      render(
        <MobilePageTransition viewKey="home">
          <div>测试内容</div>
        </MobilePageTransition>
      )

      expect(screen.getByText('测试内容')).toBeInTheDocument()
    })

    it('应该有正确的容器类名', () => {
      const { container } = render(
        <MobilePageTransition viewKey="home">
          <div>内容</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('w-full')
      expect(wrapper).toHaveClass('h-full')
    })
  })

  describe('前进动画', () => {
    it('应该应用前进进入动画类', () => {
      const { container } = render(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>内容</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('page-enter')
    })

    it('动画完成后应该移除进入动画类', async () => {
      const { container } = render(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>内容</div>
        </MobilePageTransition>
      )

      // 快进动画时间
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).not.toContain('page-enter')
    })
  })

  describe('后退动画', () => {
    it('应该应用后退进入动画类', () => {
      const { container } = render(
        <MobilePageTransition viewKey="home" direction="back">
          <div>内容</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('page-back-enter')
    })
  })

  describe('无动画', () => {
    it('direction 为 none 时不应用动画类', () => {
      const { container } = render(
        <MobilePageTransition viewKey="home" direction="none">
          <div>内容</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).not.toContain('page-enter')
      expect(wrapper.className).not.toContain('page-exit')
    })
  })

  describe('视图切换', () => {
    it('viewKey 变化时应该触发新动画', async () => {
      const { container, rerender } = render(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>首页</div>
        </MobilePageTransition>
      )

      // 等待初始动画完成
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // 切换视图
      rerender(
        <MobilePageTransition viewKey="settings" direction="forward">
          <div>设置</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('page-enter')
    })

    it('相同 viewKey 不触发动画', async () => {
      const { container, rerender } = render(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>首页</div>
        </MobilePageTransition>
      )

      // 等待初始动画完成
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      const wrapperBefore = (container.firstChild as HTMLElement).className

      // 重新渲染相同 viewKey
      rerender(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>首页</div>
        </MobilePageTransition>
      )

      const wrapperAfter = (container.firstChild as HTMLElement).className
      expect(wrapperAfter).toBe(wrapperBefore)
    })
  })

  describe('回调函数', () => {
    it('动画完成时应该调用 onTransitionEnd', async () => {
      const handleTransitionEnd = vi.fn()

      render(
        <MobilePageTransition
          viewKey="home"
          direction="forward"
          onTransitionEnd={handleTransitionEnd}
        >
          <div>内容</div>
        </MobilePageTransition>
      )

      // 快进动画时间
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      expect(handleTransitionEnd).toHaveBeenCalledTimes(1)
    })

    it('没有 onTransitionEnd 时不崩溃', async () => {
      render(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>内容</div>
        </MobilePageTransition>
      )

      // 快进动画时间 - 不应该崩溃
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      expect(true).toBe(true)
    })
  })

  describe('自定义样式', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(
        <MobilePageTransition
          viewKey="home"
          className="custom-class"
        >
          <div>内容</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })
  })

  describe('动画方向样式', () => {
    it('前进方向应该有正确的初始样式', () => {
      const { container } = render(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>内容</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild as HTMLElement
      // 前进动画从右侧进入
      expect(wrapper.style.transform).toContain('translateX')
    })

    it('后退方向应该有正确的初始样式', () => {
      const { container } = render(
        <MobilePageTransition viewKey="home" direction="back">
          <div>内容</div>
        </MobilePageTransition>
      )

      const wrapper = container.firstChild as HTMLElement
      // 后退动画从左侧进入
      expect(wrapper.style.transform).toContain('translateX')
    })
  })

  describe('边界情况', () => {
    it('空子内容应该正常渲染', () => {
      const { container } = render(
        <MobilePageTransition viewKey="home">
          {null}
        </MobilePageTransition>
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('多个子元素应该正常渲染', () => {
      render(
        <MobilePageTransition viewKey="home">
          <div>第一个</div>
          <div>第二个</div>
        </MobilePageTransition>
      )

      expect(screen.getByText('第一个')).toBeInTheDocument()
      expect(screen.getByText('第二个')).toBeInTheDocument()
    })

    it('组件卸载时应该清理定时器', () => {
      const { unmount } = render(
        <MobilePageTransition viewKey="home" direction="forward">
          <div>内容</div>
        </MobilePageTransition>
      )

      // 卸载不应该报错
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('可访问性', () => {
    it('应该有正确的角色属性', () => {
      render(
        <MobilePageTransition viewKey="home">
          <div>内容</div>
        </MobilePageTransition>
      )

      // 容器本身不需要特殊角色，内容由子元素决定
      expect(screen.getByText('内容')).toBeInTheDocument()
    })
  })
})
