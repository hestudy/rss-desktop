import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PullToRefreshIndicator } from './PullToRefreshIndicator'

// Mock lucide-react
vi.mock('lucide-react', () => ({
  RefreshCw: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="refresh-icon" className={className} style={style}>
      RefreshCw
    </span>
  ),
}))

describe('PullToRefreshIndicator', () => {
  describe('基本渲染', () => {
    it('应该渲染刷新图标', () => {
      render(
        <PullToRefreshIndicator
          distance={50}
          progress={0.5}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
    })

    it('应该根据 distance 设置高度', () => {
      const { container } = render(
        <PullToRefreshIndicator
          distance={60}
          progress={0.6}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.height).toBe('60px')
    })

    it('应该限制最大高度', () => {
      const { container } = render(
        <PullToRefreshIndicator
          distance={200}
          progress={1}
          isRefreshing={false}
          canRefresh={true}
        />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.height).toBe('80px')
    })
  })

  describe('下拉状态', () => {
    it('下拉中应该显示进度旋转', () => {
      const { container } = render(
        <PullToRefreshIndicator
          distance={50}
          progress={0.5}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      const icon = screen.getByTestId('refresh-icon')
      // 0.5 * 360 = 180
      expect(icon.style.transform).toBe('rotate(180deg)')
    })

    it('达到阈值时 canRefresh 为 true', () => {
      render(
        <PullToRefreshIndicator
          distance={80}
          progress={1}
          isRefreshing={false}
          canRefresh={true}
        />
      )

      // 应该显示提示文字
      expect(screen.getByText('松开刷新')).toBeInTheDocument()
    })

    it('未达到阈值时显示下拉提示', () => {
      render(
        <PullToRefreshIndicator
          distance={40}
          progress={0.5}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      expect(screen.getByText('下拉刷新')).toBeInTheDocument()
    })
  })

  describe('刷新中状态', () => {
    it('刷新中应该显示旋转动画', () => {
      render(
        <PullToRefreshIndicator
          distance={80}
          progress={1}
          isRefreshing={true}
          canRefresh={true}
        />
      )

      const icon = screen.getByTestId('refresh-icon')
      expect(icon.className).toContain('animate-spin')
    })

    it('刷新中应该显示刷新中文字', () => {
      render(
        <PullToRefreshIndicator
          distance={80}
          progress={1}
          isRefreshing={true}
          canRefresh={true}
        />
      )

      expect(screen.getByText('刷新中...')).toBeInTheDocument()
    })

    it('刷新中不应该设置 transform（使用 CSS 动画）', () => {
      render(
        <PullToRefreshIndicator
          distance={80}
          progress={1}
          isRefreshing={true}
          canRefresh={true}
        />
      )

      const icon = screen.getByTestId('refresh-icon')
      expect(icon.style.transform).toBe('')
    })
  })

  describe('样式', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(
        <PullToRefreshIndicator
          distance={50}
          progress={0.5}
          isRefreshing={false}
          canRefresh={false}
          className="custom-class"
        />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })

    it('图标应该有正确的颜色类', () => {
      render(
        <PullToRefreshIndicator
          distance={50}
          progress={0.5}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      const icon = screen.getByTestId('refresh-icon')
      expect(icon.className).toContain('text-primary')
    })
  })

  describe('边界情况', () => {
    it('distance 为 0 时应该正常渲染', () => {
      const { container } = render(
        <PullToRefreshIndicator
          distance={0}
          progress={0}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.height).toBe('0px')
    })

    it('progress 为 0 时不应该有旋转', () => {
      render(
        <PullToRefreshIndicator
          distance={50}
          progress={0}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      const icon = screen.getByTestId('refresh-icon')
      expect(icon.style.transform).toBe('rotate(0deg)')
    })

    it('progress 超过 1 时应该正确计算旋转', () => {
      render(
        <PullToRefreshIndicator
          distance={100}
          progress={1.5}
          isRefreshing={false}
          canRefresh={true}
        />
      )

      const icon = screen.getByTestId('refresh-icon')
      // 1.5 * 360 = 540，但应该被限制
      expect(icon.style.transform).toBe('rotate(540deg)')
    })
  })

  describe('可访问性', () => {
    it('应该有正确的 aria 属性', () => {
      const { container } = render(
        <PullToRefreshIndicator
          distance={50}
          progress={0.5}
          isRefreshing={false}
          canRefresh={false}
        />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveAttribute('role', 'status')
      expect(wrapper).toHaveAttribute('aria-live', 'polite')
    })

    it('刷新中应该有 aria-busy', () => {
      const { container } = render(
        <PullToRefreshIndicator
          distance={80}
          progress={1}
          isRefreshing={true}
          canRefresh={true}
        />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveAttribute('aria-busy', 'true')
    })
  })
})
