import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DiscoverFeedCard } from './DiscoverFeedCard'
import type { DiscoverFeed } from '../../types'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Rss: () => <span data-testid="rss-icon">Rss</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className}>Loader2</span>
  ),
}))

// Mock Button component
vi.mock('../ui/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
    className?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}))

// Mock cn utility
vi.mock('../../lib/utils', () => ({
  cn: (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(' '),
}))

describe('DiscoverFeedCard', () => {
  const mockFeed: DiscoverFeed = {
    id: 'test-feed-1',
    title: 'Test Feed Title',
    url: 'https://example.com/feed.xml',
    description: 'This is a test feed description',
    categoryId: 'tech',
    tags: ['tech', 'programming', 'test'],
    icon: undefined,
  }

  const mockOnAdd = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染测试', () => {
    it('renders feed title correctly', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      expect(screen.getByText('Test Feed Title')).toBeInTheDocument()
    })

    it('renders feed description correctly', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      expect(screen.getByText('This is a test feed description')).toBeInTheDocument()
    })

    it('renders tags correctly (up to 3)', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      expect(screen.getByText('tech')).toBeInTheDocument()
      expect(screen.getByText('programming')).toBeInTheDocument()
      expect(screen.getByText('test')).toBeInTheDocument()
    })

    it('renders only first 3 tags when more than 3 tags exist', () => {
      const feedWithManyTags: DiscoverFeed = {
        ...mockFeed,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      }

      render(
        <DiscoverFeedCard
          feed={feedWithManyTags}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
      expect(screen.getByText('tag3')).toBeInTheDocument()
      expect(screen.queryByText('tag4')).not.toBeInTheDocument()
      expect(screen.queryByText('tag5')).not.toBeInTheDocument()
    })

    it('does not render tags section when tags array is empty', () => {
      const feedWithoutTags: DiscoverFeed = {
        ...mockFeed,
        tags: [],
      }

      render(
        <DiscoverFeedCard
          feed={feedWithoutTags}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      // Tags container should not exist
      const tags = screen.queryAllByText(/tag\d/)
      expect(tags).toHaveLength(0)
    })

    it('renders RSS icon when no custom icon provided', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      expect(screen.getByTestId('rss-icon')).toBeInTheDocument()
    })

    it('renders custom icon when provided', () => {
      const feedWithIcon: DiscoverFeed = {
        ...mockFeed,
        icon: 'https://example.com/icon.png',
      }

      render(
        <DiscoverFeedCard
          feed={feedWithIcon}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      const iconImg = screen.getByAltText('Test Feed Title')
      expect(iconImg).toBeInTheDocument()
      expect(iconImg).toHaveAttribute('src', 'https://example.com/icon.png')
    })
  })

  describe('添加状态测试', () => {
    it('shows "Add" button when not added', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      expect(screen.getByRole('button', { name: '添加' })).toBeInTheDocument()
    })

    it('shows "Added" state with check icon when already added', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={true}
          onAdd={mockOnAdd}
        />
      )

      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getByText('已添加')).toBeInTheDocument()
    })

    it('disables button when already added', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={true}
          onAdd={mockOnAdd}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('applies opacity class when already added', () => {
      const { container } = render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={true}
          onAdd={mockOnAdd}
        />
      )

      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('opacity-60')
    })
  })

  describe('交互测试', () => {
    it('calls onAdd when button is clicked', async () => {
      mockOnAdd.mockResolvedValue(undefined)

      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      const button = screen.getByRole('button', { name: '添加' })
      fireEvent.click(button)

      expect(mockOnAdd).toHaveBeenCalledWith(mockFeed)
    })

    it('shows loading spinner during add operation', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise: () => void
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnAdd.mockReturnValue(pendingPromise)

      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      const button = screen.getByRole('button', { name: '添加' })
      fireEvent.click(button)

      // Should show loader while pending
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(button).toBeDisabled()

      // Resolve the promise
      resolvePromise!()
      await Promise.resolve()

      // Wait for state update
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
    })

    it('does not call onAdd when already added', () => {
      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={true}
          onAdd={mockOnAdd}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockOnAdd).not.toHaveBeenCalled()
    })

    it('does not call onAdd when loading', async () => {
      let resolvePromise: () => void
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnAdd.mockReturnValue(pendingPromise)

      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      const button = screen.getByRole('button', { name: '添加' })
      fireEvent.click(button)

      // Click again while loading
      fireEvent.click(button)

      // Should only be called once
      expect(mockOnAdd).toHaveBeenCalledTimes(1)

      // Cleanup
      resolvePromise!()
      await Promise.resolve()
    })
  })

  describe('边界情况测试', () => {
    it('handles empty title gracefully', () => {
      const feedWithEmptyTitle: DiscoverFeed = {
        ...mockFeed,
        title: '',
      }

      render(
        <DiscoverFeedCard
          feed={feedWithEmptyTitle}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      // Card should still render
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles empty description gracefully', () => {
      const feedWithEmptyDesc: DiscoverFeed = {
        ...mockFeed,
        description: '',
      }

      render(
        <DiscoverFeedCard
          feed={feedWithEmptyDesc}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      // Card should still render
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles onAdd rejection gracefully', async () => {
      mockOnAdd.mockRejectedValue(new Error('Add failed'))

      render(
        <DiscoverFeedCard
          feed={mockFeed}
          isAdded={false}
          onAdd={mockOnAdd}
        />
      )

      const button = screen.getByRole('button', { name: '添加' })
      fireEvent.click(button)

      // Wait for the async operation to complete
      // Button should be re-enabled after error (since we have finally block)
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
    })
  })
})
