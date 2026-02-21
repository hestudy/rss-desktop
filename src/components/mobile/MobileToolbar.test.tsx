import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileToolbar } from './MobileToolbar'

describe('MobileToolbar', () => {
  const mockOnBack = vi.fn()
  const mockOnToggleFavorite = vi.fn()
  const mockOnPrevious = vi.fn()
  const mockOnNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with title', () => {
      render(<MobileToolbar title="Test Article Title" />)

      expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    })

    it('should render without title when not provided', () => {
      render(<MobileToolbar />)

      // Should render the container without crashing
      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    it('should truncate long title', () => {
      render(<MobileToolbar title="This is a very long article title that should be truncated with ellipsis when displayed" />)

      const titleElement = screen.getByText(/This is a very long/)
      expect(titleElement).toHaveClass('truncate')
    })
  })

  describe('Back Button', () => {
    it('should not show back button by default', () => {
      render(<MobileToolbar />)

      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument()
    })

    it('should show back button when showBack is true', () => {
      render(<MobileToolbar showBack />)

      expect(screen.getByLabelText('Go back')).toBeInTheDocument()
    })

    it('should call onBack when back button is clicked', () => {
      render(<MobileToolbar showBack onBack={mockOnBack} />)

      fireEvent.click(screen.getByLabelText('Go back'))

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })

    it('should not crash when back button is clicked without onBack callback', () => {
      render(<MobileToolbar showBack />)

      // Should not throw
      expect(() => fireEvent.click(screen.getByLabelText('Go back'))).not.toThrow()
    })
  })

  describe('Favorite Button', () => {
    it('should show favorite button when onToggleFavorite is provided', () => {
      render(<MobileToolbar onToggleFavorite={mockOnToggleFavorite} />)

      expect(screen.getByLabelText('Toggle favorite')).toBeInTheDocument()
    })

    it('should show unfilled star when not favorited', () => {
      render(<MobileToolbar onToggleFavorite={mockOnToggleFavorite} isFavorited={false} />)

      const favoriteButton = screen.getByLabelText('Toggle favorite')
      expect(favoriteButton).toBeInTheDocument()
    })

    it('should show filled star when favorited', () => {
      render(<MobileToolbar onToggleFavorite={mockOnToggleFavorite} isFavorited />)

      const favoriteButton = screen.getByLabelText('Toggle favorite')
      expect(favoriteButton).toBeInTheDocument()
      expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should call onToggleFavorite when clicked', () => {
      render(<MobileToolbar onToggleFavorite={mockOnToggleFavorite} />)

      fireEvent.click(screen.getByLabelText('Toggle favorite'))

      expect(mockOnToggleFavorite).toHaveBeenCalledTimes(1)
    })
  })

  describe('More Menu', () => {
    const menuItems = [
      { label: 'Full Content', onClick: vi.fn() },
      { label: 'AI Summary', onClick: vi.fn() },
      { label: 'Translate', onClick: vi.fn() },
    ]

    it('should show more button when menuItems are provided', () => {
      render(<MobileToolbar menuItems={menuItems} />)

      expect(screen.getByLabelText('More options')).toBeInTheDocument()
    })

    it('should not show more button when menuItems is empty', () => {
      render(<MobileToolbar menuItems={[]} />)

      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument()
    })

    it('should not show more button when menuItems is undefined', () => {
      render(<MobileToolbar />)

      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument()
    })

    it('should expand menu when more button is clicked', () => {
      render(<MobileToolbar menuItems={menuItems} />)

      fireEvent.click(screen.getByLabelText('More options'))

      expect(screen.getByText('Full Content')).toBeInTheDocument()
      expect(screen.getByText('AI Summary')).toBeInTheDocument()
      expect(screen.getByText('Translate')).toBeInTheDocument()
    })

    it('should collapse menu when more button is clicked again', () => {
      render(<MobileToolbar menuItems={menuItems} />)

      // Open menu
      fireEvent.click(screen.getByLabelText('More options'))
      expect(screen.getByText('Full Content')).toBeInTheDocument()

      // Close menu
      fireEvent.click(screen.getByLabelText('More options'))
      expect(screen.queryByText('Full Content')).not.toBeInTheDocument()
    })

    it('should call menuItem onClick when menu item is clicked', () => {
      const menuItem = { label: 'Test Item', onClick: vi.fn() }
      render(<MobileToolbar menuItems={[menuItem]} />)

      // Open menu
      fireEvent.click(screen.getByLabelText('More options'))
      // Click menu item
      fireEvent.click(screen.getByText('Test Item'))

      expect(menuItem.onClick).toHaveBeenCalledTimes(1)
    })

    it('should close menu after clicking a menu item', () => {
      const menuItem = { label: 'Test Item', onClick: vi.fn() }
      render(<MobileToolbar menuItems={[menuItem]} />)

      // Open menu
      fireEvent.click(screen.getByLabelText('More options'))
      // Click menu item
      fireEvent.click(screen.getByText('Test Item'))

      // Menu should be closed
      expect(screen.queryByText('Test Item')).not.toBeInTheDocument()
    })

    it('should show disabled menu item with disabled attribute', () => {
      const menuItems = [
        { label: 'Enabled', onClick: vi.fn() },
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ]
      render(<MobileToolbar menuItems={menuItems} />)

      fireEvent.click(screen.getByLabelText('More options'))

      // The text is inside a span, so we need to get the parent button
      const disabledItem = screen.getByText('Disabled').closest('button')
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true')
      expect(disabledItem).toBeDisabled()
    })

    it('should not call onClick for disabled menu item', () => {
      const menuItem = { label: 'Disabled', onClick: vi.fn(), disabled: true }
      render(<MobileToolbar menuItems={[menuItem]} />)

      fireEvent.click(screen.getByLabelText('More options'))
      fireEvent.click(screen.getByText('Disabled'))

      expect(menuItem.onClick).not.toHaveBeenCalled()
    })

    it('should render menu item with icon', () => {
      const menuItems = [
        {
          label: 'With Icon',
          onClick: vi.fn(),
          icon: <span data-testid="custom-icon">Icon</span>,
        },
      ]
      render(<MobileToolbar menuItems={menuItems} />)

      fireEvent.click(screen.getByLabelText('More options'))

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('Bottom Navigation', () => {
    it('should show bottom navigation when navigation props are provided', () => {
      render(
        <MobileToolbar
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          hasPrevious
          hasNext
        />
      )

      expect(screen.getByLabelText('Previous article')).toBeInTheDocument()
      expect(screen.getByLabelText('Next article')).toBeInTheDocument()
    })

    it('should not show bottom navigation when navigation props are not provided', () => {
      render(<MobileToolbar />)

      expect(screen.queryByLabelText('Previous article')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Next article')).not.toBeInTheDocument()
    })

    it('should call onPrevious when previous button is clicked', () => {
      render(<MobileToolbar onPrevious={mockOnPrevious} hasPrevious />)

      fireEvent.click(screen.getByLabelText('Previous article'))

      expect(mockOnPrevious).toHaveBeenCalledTimes(1)
    })

    it('should call onNext when next button is clicked', () => {
      render(<MobileToolbar onNext={mockOnNext} hasNext />)

      fireEvent.click(screen.getByLabelText('Next article'))

      expect(mockOnNext).toHaveBeenCalledTimes(1)
    })

    it('should disable previous button when hasPrevious is false', () => {
      render(<MobileToolbar onPrevious={mockOnPrevious} hasPrevious={false} />)

      const prevButton = screen.getByLabelText('Previous article')
      expect(prevButton).toBeDisabled()
    })

    it('should disable next button when hasNext is false', () => {
      render(<MobileToolbar onNext={mockOnNext} hasNext={false} />)

      const nextButton = screen.getByLabelText('Next article')
      expect(nextButton).toBeDisabled()
    })

    it('should not call onPrevious when button is disabled', () => {
      render(<MobileToolbar onPrevious={mockOnPrevious} hasPrevious={false} />)

      fireEvent.click(screen.getByLabelText('Previous article'))

      expect(mockOnPrevious).not.toHaveBeenCalled()
    })

    it('should not call onNext when button is disabled', () => {
      render(<MobileToolbar onNext={mockOnNext} hasNext={false} />)

      fireEvent.click(screen.getByLabelText('Next article'))

      expect(mockOnNext).not.toHaveBeenCalled()
    })
  })

  describe('Visibility Control', () => {
    it('should be visible by default', () => {
      render(<MobileToolbar />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('translate-y-0')
    })

    it('should be visible when visible prop is true', () => {
      render(<MobileToolbar visible={true} />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('translate-y-0')
    })

    it('should be hidden when visible prop is false', () => {
      render(<MobileToolbar visible={false} />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('-translate-y-full')
    })

    it('should have transition classes for smooth animation', () => {
      render(<MobileToolbar />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('transition-transform')
      expect(toolbar).toHaveClass('duration-300')
    })
  })

  describe('Accessibility', () => {
    it('should have correct ARIA role', () => {
      render(<MobileToolbar />)

      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    it('should have aria-label for back button', () => {
      render(<MobileToolbar showBack />)

      expect(screen.getByLabelText('Go back')).toBeInTheDocument()
    })

    it('should have aria-label for favorite button', () => {
      render(<MobileToolbar onToggleFavorite={mockOnToggleFavorite} />)

      expect(screen.getByLabelText('Toggle favorite')).toBeInTheDocument()
    })

    it('should have aria-pressed for favorite button state', () => {
      const { rerender } = render(
        <MobileToolbar onToggleFavorite={mockOnToggleFavorite} isFavorited={false} />
      )

      expect(screen.getByLabelText('Toggle favorite')).toHaveAttribute('aria-pressed', 'false')

      rerender(<MobileToolbar onToggleFavorite={mockOnToggleFavorite} isFavorited />)

      expect(screen.getByLabelText('Toggle favorite')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined title gracefully', () => {
      render(<MobileToolbar title={undefined} />)

      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    it('should handle empty title string', () => {
      render(<MobileToolbar title="" />)

      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    it('should handle menu click outside to close', () => {
      const menuItems = [{ label: 'Test Item', onClick: vi.fn() }]
      render(
        <div>
          <MobileToolbar menuItems={menuItems} />
          <div data-testid="outside">Outside</div>
        </div>
      )

      // Open menu
      fireEvent.click(screen.getByLabelText('More options'))
      expect(screen.getByText('Test Item')).toBeInTheDocument()

      // Click outside (simulate by clicking on the container)
      fireEvent.mouseDown(screen.getByTestId('outside'))

      // Menu should be closed
      expect(screen.queryByText('Test Item')).not.toBeInTheDocument()
    })

    it('should handle Escape key to close menu', () => {
      const menuItems = [{ label: 'Test Item', onClick: vi.fn() }]
      render(<MobileToolbar menuItems={menuItems} />)

      // Open menu
      fireEvent.click(screen.getByLabelText('More options'))
      expect(screen.getByText('Test Item')).toBeInTheDocument()

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' })

      // Menu should be closed
      expect(screen.queryByText('Test Item')).not.toBeInTheDocument()
    })

    it('should close menu when clicking the more button while menu is open', () => {
      const menuItems = [{ label: 'Test Item', onClick: vi.fn() }]
      render(<MobileToolbar menuItems={menuItems} />)

      const moreButton = screen.getByLabelText('More options')

      // Open menu
      fireEvent.click(moreButton)
      expect(screen.getByText('Test Item')).toBeInTheDocument()

      // Click more button again to close
      fireEvent.click(moreButton)
      expect(screen.queryByText('Test Item')).not.toBeInTheDocument()
    })

    it('should handle rapid visibility changes', () => {
      const { rerender } = render(<MobileToolbar visible={true} />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('translate-y-0')

      // Rapid visibility changes
      rerender(<MobileToolbar visible={false} />)
      expect(toolbar).toHaveClass('-translate-y-full')

      rerender(<MobileToolbar visible={true} />)
      expect(toolbar).toHaveClass('translate-y-0')

      rerender(<MobileToolbar visible={false} />)
      expect(toolbar).toHaveClass('-translate-y-full')
    })
  })

  describe('Combined Features', () => {
    it('should render all features together', () => {
      const menuItems = [{ label: 'Settings', onClick: vi.fn() }]

      render(
        <MobileToolbar
          title="Full Featured Toolbar"
          showBack
          onBack={mockOnBack}
          onToggleFavorite={mockOnToggleFavorite}
          isFavorited
          menuItems={menuItems}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          hasPrevious
          hasNext
          visible
        />
      )

      // Title
      expect(screen.getByText('Full Featured Toolbar')).toBeInTheDocument()

      // Back button
      expect(screen.getByLabelText('Go back')).toBeInTheDocument()

      // Favorite button
      expect(screen.getByLabelText('Toggle favorite')).toBeInTheDocument()

      // More menu
      expect(screen.getByLabelText('More options')).toBeInTheDocument()

      // Navigation
      expect(screen.getByLabelText('Previous article')).toBeInTheDocument()
      expect(screen.getByLabelText('Next article')).toBeInTheDocument()

      // Visibility
      expect(screen.getByRole('toolbar')).toHaveClass('translate-y-0')
    })

    it('should handle all interactions without crashing', async () => {
      const menuItems = [
        { label: 'Option 1', onClick: vi.fn() },
        { label: 'Option 2', onClick: vi.fn() },
      ]

      render(
        <MobileToolbar
          title="Interactive Toolbar"
          showBack
          onBack={mockOnBack}
          onToggleFavorite={mockOnToggleFavorite}
          menuItems={menuItems}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          hasPrevious
          hasNext
        />
      )

      // Click back
      fireEvent.click(screen.getByLabelText('Go back'))
      expect(mockOnBack).toHaveBeenCalled()

      // Click favorite
      fireEvent.click(screen.getByLabelText('Toggle favorite'))
      expect(mockOnToggleFavorite).toHaveBeenCalled()

      // Open menu and click item
      fireEvent.click(screen.getByLabelText('More options'))
      fireEvent.click(screen.getByText('Option 1'))
      expect(menuItems[0].onClick).toHaveBeenCalled()

      // Click navigation
      fireEvent.click(screen.getByLabelText('Previous article'))
      expect(mockOnPrevious).toHaveBeenCalled()

      fireEvent.click(screen.getByLabelText('Next article'))
      expect(mockOnNext).toHaveBeenCalled()
    })
  })
})
