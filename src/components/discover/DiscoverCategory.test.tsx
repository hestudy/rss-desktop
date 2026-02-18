import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiscoverCategoryFilter } from './DiscoverCategory'
import type { DiscoverCategory } from '../../types'

// Mock lucide-react with a proxy that returns mock components for any icon
vi.mock('lucide-react', () => {
  const createMockIcon = (name: string) => {
    const MockIcon = ({ className }: { className?: string }) => (
      <span data-testid={`${name.toLowerCase()}-icon`} className={className}>
        {name}
      </span>
    )
    MockIcon.displayName = name
    return MockIcon
  }

  return new Proxy({}, {
    get: (_target, prop: string) => {
      // Always return a mock icon component
      return createMockIcon(prop)
    },
  })
})

// Mock Button component
vi.mock('../ui/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    title,
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    size?: string
    className?: string
    title?: string
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      title={title}
      data-testid="category-button"
    >
      {children}
    </button>
  ),
}))

// Fix JSX namespace issue
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

describe('DiscoverCategoryFilter', () => {
  const mockCategories: DiscoverCategory[] = [
    { id: 'tech', name: '科技', icon: 'Cpu', description: '科技资讯与开发者博客' },
    { id: 'news', name: '新闻', icon: 'Newspaper', description: '国内外新闻资讯' },
    { id: 'design', name: '设计', icon: 'Palette', description: 'UI/UX 设计与创意灵感' },
  ]

  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染测试', () => {
    it('renders "All" button', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      expect(screen.getByText('全部')).toBeInTheDocument()
    })

    it('renders all categories', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      expect(screen.getByText('科技')).toBeInTheDocument()
      expect(screen.getByText('新闻')).toBeInTheDocument()
      expect(screen.getByText('设计')).toBeInTheDocument()
    })

    it('renders category descriptions as button titles', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      const buttons = screen.getAllByTestId('category-button')
      // First button is "All", then category buttons
      expect(buttons[1]).toHaveAttribute('title', '科技资讯与开发者博客')
      expect(buttons[2]).toHaveAttribute('title', '国内外新闻资讯')
      expect(buttons[3]).toHaveAttribute('title', 'UI/UX 设计与创意灵感')
    })

    it('renders with empty categories array', () => {
      render(
        <DiscoverCategoryFilter
          categories={[]}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      // Should still render "All" button
      expect(screen.getByText('全部')).toBeInTheDocument()
      // No category buttons
      expect(screen.getAllByTestId('category-button')).toHaveLength(1)
    })
  })

  describe('选中状态测试', () => {
    it('shows "All" button as selected when no category selected', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      const allButton = screen.getAllByTestId('category-button')[0]
      expect(allButton).toHaveAttribute('data-variant', 'default')
    })

    it('shows category button as selected when its id matches', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId="tech"
          onSelect={mockOnSelect}
        />
      )

      const buttons = screen.getAllByTestId('category-button')
      // "All" button should not be selected
      expect(buttons[0]).toHaveAttribute('data-variant', 'ghost')
      // "Tech" button should be selected
      expect(buttons[1]).toHaveAttribute('data-variant', 'default')
    })

    it('shows correct variant for non-selected categories', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId="news"
          onSelect={mockOnSelect}
        />
      )

      const buttons = screen.getAllByTestId('category-button')
      // All should be ghost
      expect(buttons[0]).toHaveAttribute('data-variant', 'ghost')
      // Tech should be ghost
      expect(buttons[1]).toHaveAttribute('data-variant', 'ghost')
      // News should be default (selected)
      expect(buttons[2]).toHaveAttribute('data-variant', 'default')
      // Design should be ghost
      expect(buttons[3]).toHaveAttribute('data-variant', 'ghost')
    })
  })

  describe('交互测试', () => {
    it('calls onSelect with null when "All" button is clicked', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId="tech"
          onSelect={mockOnSelect}
        />
      )

      fireEvent.click(screen.getByText('全部'))

      expect(mockOnSelect).toHaveBeenCalledWith(null)
    })

    it('calls onSelect with category id when category button is clicked', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      fireEvent.click(screen.getByText('科技'))

      expect(mockOnSelect).toHaveBeenCalledWith('tech')
    })

    it('calls onSelect for each category button', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      fireEvent.click(screen.getByText('科技'))
      expect(mockOnSelect).toHaveBeenLastCalledWith('tech')

      fireEvent.click(screen.getByText('新闻'))
      expect(mockOnSelect).toHaveBeenLastCalledWith('news')

      fireEvent.click(screen.getByText('设计'))
      expect(mockOnSelect).toHaveBeenLastCalledWith('design')
    })
  })

  describe('图标渲染测试', () => {
    it('renders LayoutGrid icon for "All" button', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      expect(screen.getByTestId('layoutgrid-icon')).toBeInTheDocument()
    })

    it('renders icons for category buttons', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      // Check that icon components are rendered (our mock creates them dynamically)
      expect(screen.getByTestId('cpu-icon')).toBeInTheDocument()
      expect(screen.getByTestId('newspaper-icon')).toBeInTheDocument()
      expect(screen.getByTestId('palette-icon')).toBeInTheDocument()
    })

    it('handles unknown icon names gracefully', () => {
      const categoriesWithUnknownIcon: DiscoverCategory[] = [
        { id: 'unknown', name: '未知', icon: 'NonExistentIcon', description: 'Unknown category' },
      ]

      render(
        <DiscoverCategoryFilter
          categories={categoriesWithUnknownIcon}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      // Since our mock creates icons for any name, just verify the category renders
      expect(screen.getByText('未知')).toBeInTheDocument()
      // The mock will create an icon with the name as test id
      expect(screen.getByTestId('nonexistenticon-icon')).toBeInTheDocument()
    })
  })

  describe('边界情况测试', () => {
    it('handles categories with empty names', () => {
      const categoriesWithEmptyName: DiscoverCategory[] = [
        { id: 'empty', name: '', icon: 'Cpu', description: 'Empty name category' },
      ]

      render(
        <DiscoverCategoryFilter
          categories={categoriesWithEmptyName}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      // Should still render the button (even with empty name)
      const buttons = screen.getAllByTestId('category-button')
      expect(buttons).toHaveLength(2) // "All" + empty category
    })

    it('handles category selection that does not exist in list', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId="nonexistent"
          onSelect={mockOnSelect}
        />
      )

      // All buttons should be in ghost variant since no match
      const buttons = screen.getAllByTestId('category-button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('data-variant', 'ghost')
      })
    })
  })

  describe('布局模式测试', () => {
    it('defaults to horizontal layout', () => {
      const { container } = render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
        />
      )

      // 默认应该是水平布局（flex-wrap）
      const filterContainer = container.firstChild as HTMLElement
      expect(filterContainer).toHaveClass('flex-wrap')
    })

    it('renders horizontal layout with flex-wrap when layout="horizontal"', () => {
      const { container } = render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
          layout="horizontal"
        />
      )

      const filterContainer = container.firstChild as HTMLElement
      expect(filterContainer).toHaveClass('flex-wrap')
      expect(filterContainer).not.toHaveClass('flex-col')
    })

    it('renders vertical layout with flex-col when layout="vertical"', () => {
      const { container } = render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
          layout="vertical"
        />
      )

      const filterContainer = container.firstChild as HTMLElement
      expect(filterContainer).toHaveClass('flex-col')
      expect(filterContainer).not.toHaveClass('flex-wrap')
    })

    it('applies full width and justify-start for vertical layout buttons', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
          layout="vertical"
        />
      )

      const buttons = screen.getAllByTestId('category-button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('justify-start')
        expect(button).toHaveClass('w-full')
      })
    })

    it('does not apply full width for horizontal layout buttons', () => {
      render(
        <DiscoverCategoryFilter
          categories={mockCategories}
          selectedCategoryId={null}
          onSelect={mockOnSelect}
          layout="horizontal"
        />
      )

      const buttons = screen.getAllByTestId('category-button')
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('w-full')
      })
    })
  })
})
