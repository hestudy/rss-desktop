import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  SkeletonLoader,
  ArticleCardSkeleton,
  FeedItemSkeleton,
} from './SkeletonLoader'

describe('SkeletonLoader', () => {
  describe('基本渲染', () => {
    it('应该渲染骨架屏元素', () => {
      const { container } = render(<SkeletonLoader />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该有骨架屏动画类', () => {
      const { container } = render(<SkeletonLoader />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('animate-pulse')
    })
  })

  describe('变体', () => {
    it('text 变体应该有正确的尺寸', () => {
      const { container } = render(<SkeletonLoader variant="text" />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('h-4')
      expect(skeleton).toHaveClass('w-full')
    })

    it('card 变体应该有正确的尺寸', () => {
      const { container } = render(<SkeletonLoader variant="card" />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('h-24')
      expect(skeleton).toHaveClass('w-full')
    })

    it('avatar 变体应该是圆形', () => {
      const { container } = render(<SkeletonLoader variant="avatar" />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('h-10')
      expect(skeleton).toHaveClass('w-10')
      expect(skeleton).toHaveClass('rounded-full')
    })

    it('thumbnail 变体应该有正确的尺寸', () => {
      const { container } = render(<SkeletonLoader variant="thumbnail" />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('h-20')
      expect(skeleton).toHaveClass('w-20')
    })
  })

  describe('自定义尺寸', () => {
    it('应该支持自定义宽度（数字）', () => {
      const { container } = render(<SkeletonLoader width={200} />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton.style.width).toBe('200px')
    })

    it('应该支持自定义宽度（字符串）', () => {
      const { container } = render(<SkeletonLoader width="50%" />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton.style.width).toBe('50%')
    })

    it('应该支持自定义高度', () => {
      const { container } = render(<SkeletonLoader height={60} />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton.style.height).toBe('60px')
    })
  })

  describe('count 属性', () => {
    it('应该渲染多个骨架屏', () => {
      const { container } = render(<SkeletonLoader count={3} />)

      const skeletons = container.querySelectorAll('.bg-muted')
      expect(skeletons).toHaveLength(3)
    })

    it('count 为 0 时不渲染', () => {
      const { container } = render(<SkeletonLoader count={0} />)

      expect(container.children).toHaveLength(0)
    })

    it('count 默认为 1', () => {
      const { container } = render(<SkeletonLoader />)

      const skeletons = container.querySelectorAll('.bg-muted')
      expect(skeletons).toHaveLength(1)
    })
  })

  describe('自定义样式', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(
        <SkeletonLoader className="custom-skeleton" />
      )

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('custom-skeleton')
    })

    it('应该有默认背景色', () => {
      const { container } = render(<SkeletonLoader />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('bg-muted')
    })

    it('应该有默认圆角', () => {
      const { container } = render(<SkeletonLoader />)

      const skeleton = container.firstChild as HTMLElement
      expect(skeleton).toHaveClass('rounded')
    })
  })
})

describe('ArticleCardSkeleton', () => {
  it('应该渲染完整的文章卡片骨架屏', () => {
    render(<ArticleCardSkeleton />)

    // 应该有缩略图区域
    const thumbnail = document.querySelector('.h-20.w-20')
    expect(thumbnail).toBeInTheDocument()

    // 应该有标题行
    const skeletons = document.querySelectorAll('.bg-muted')
    expect(skeletons.length).toBeGreaterThan(1)
  })

  it('应该有正确的容器类名', () => {
    const { container } = render(<ArticleCardSkeleton />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('flex')
    expect(wrapper).toHaveClass('gap-3')
  })

  it('应该支持自定义 className', () => {
    const { container } = render(
      <ArticleCardSkeleton className="custom-class" />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })
})

describe('FeedItemSkeleton', () => {
  it('应该渲染完整的订阅项骨架屏', () => {
    render(<FeedItemSkeleton />)

    // 应该有图标区域
    const icon = document.querySelector('.rounded-full')
    expect(icon).toBeInTheDocument()
  })

  it('应该有正确的容器类名', () => {
    const { container } = render(<FeedItemSkeleton />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('flex')
    expect(wrapper).toHaveClass('items-center')
  })

  it('应该支持自定义 className', () => {
    const { container } = render(
      <FeedItemSkeleton className="custom-class" />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })

  it('应该渲染 count 个骨架屏', () => {
    const { container } = render(<FeedItemSkeleton count={5} />)

    const items = container.querySelectorAll('.flex.items-center.gap-3')
    expect(items).toHaveLength(5)
  })
})
