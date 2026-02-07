import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArticleCard } from './ArticleCard'

describe('ArticleCard', () => {
  const defaultProps = {
    id: 'article-1',
    title: 'Test Article Title',
    description: 'This is a test article description that should be truncated.',
    feedName: 'Tech News',
    publishedAt: '2024-01-15T10:30:00Z',
    isRead: false,
    isSelected: false,
    onClick: vi.fn(),
    onOpenExternal: vi.fn(),
  }

  describe('rendering', () => {
    it('renders article title', () => {
      render(<ArticleCard {...defaultProps} />)
      expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    })

    it('renders article description', () => {
      render(<ArticleCard {...defaultProps} />)
      expect(screen.getByText(/This is a test article description/)).toBeInTheDocument()
    })

    it('renders feed name', () => {
      render(<ArticleCard {...defaultProps} />)
      expect(screen.getByText('Tech News')).toBeInTheDocument()
    })

    it('renders formatted time', () => {
      render(<ArticleCard {...defaultProps} />)
      // Should show relative time like "X days ago" or similar
      const timeElement = screen.getByTestId('article-time')
      expect(timeElement).toBeInTheDocument()
    })

    it('renders thumbnail when provided', () => {
      render(<ArticleCard {...defaultProps} thumbnailUrl="https://example.com/image.jpg" />)
      const thumbnail = screen.getByTestId('article-thumbnail')
      expect(thumbnail).toHaveAttribute('src', 'https://example.com/image.jpg')
    })

    it('does not render thumbnail when not provided', () => {
      render(<ArticleCard {...defaultProps} />)
      expect(screen.queryByTestId('article-thumbnail')).not.toBeInTheDocument()
    })
  })

  describe('unread indicator', () => {
    it('shows unread dot when article is not read', () => {
      render(<ArticleCard {...defaultProps} isRead={false} />)
      expect(screen.getByTestId('unread-indicator')).toBeInTheDocument()
    })

    it('hides unread dot when article is read', () => {
      render(<ArticleCard {...defaultProps} isRead />)
      expect(screen.queryByTestId('unread-indicator')).not.toBeInTheDocument()
    })
  })

  describe('selected state', () => {
    it('applies selected styles when isSelected is true', () => {
      const { container } = render(<ArticleCard {...defaultProps} isSelected />)
      expect(container.firstChild).toHaveClass('bg-accent')
    })

    it('does not apply selected styles when isSelected is false', () => {
      const { container } = render(<ArticleCard {...defaultProps} isSelected={false} />)
      expect(container.firstChild).not.toHaveClass('bg-accent')
    })

    it('shows left border indicator when selected', () => {
      const { container } = render(<ArticleCard {...defaultProps} isSelected />)
      expect(container.firstChild).toHaveClass('border-l-primary')
    })
  })

  describe('read state styling', () => {
    it('applies muted styles when article is read', () => {
      render(<ArticleCard {...defaultProps} isRead />)
      const title = screen.getByText('Test Article Title')
      expect(title).toHaveClass('text-read-foreground')
    })

    it('applies normal styles when article is unread', () => {
      render(<ArticleCard {...defaultProps} isRead={false} />)
      const title = screen.getByText('Test Article Title')
      expect(title).toHaveClass('text-card-foreground')
    })
  })

  describe('interactions', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn()
      render(<ArticleCard {...defaultProps} onClick={onClick} />)

      fireEvent.click(screen.getByTestId('article-card'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onOpenExternal when external link button is clicked', () => {
      const onOpenExternal = vi.fn()
      render(<ArticleCard {...defaultProps} onOpenExternal={onOpenExternal} />)

      const externalButton = screen.getByLabelText('Open in browser')
      fireEvent.click(externalButton)
      expect(onOpenExternal).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onClick when external link button is clicked', () => {
      const onClick = vi.fn()
      const onOpenExternal = vi.fn()
      render(<ArticleCard {...defaultProps} onClick={onClick} onOpenExternal={onOpenExternal} />)

      const externalButton = screen.getByLabelText('Open in browser')
      fireEvent.click(externalButton)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('external link button visibility', () => {
    it('shows external link button on hover', () => {
      render(<ArticleCard {...defaultProps} />)
      const externalButton = screen.getByLabelText('Open in browser')
      // Button should exist but be hidden by default (opacity-0)
      expect(externalButton).toHaveClass('opacity-0')
    })

    it('has hover class to show button', () => {
      render(<ArticleCard {...defaultProps} />)
      const externalButton = screen.getByLabelText('Open in browser')
      expect(externalButton).toHaveClass('group-hover:opacity-100')
    })
  })

  describe('favorite indicator', () => {
    it('shows favorite icon when isFavorite is true', () => {
      render(<ArticleCard {...defaultProps} isFavorite />)
      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument()
    })

    it('hides favorite icon when isFavorite is false', () => {
      render(<ArticleCard {...defaultProps} isFavorite={false} />)
      expect(screen.queryByTestId('favorite-indicator')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has article role', () => {
      render(<ArticleCard {...defaultProps} />)
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('has accessible title', () => {
      render(<ArticleCard {...defaultProps} />)
      const article = screen.getByRole('article')
      expect(article).toHaveAttribute('aria-label', 'Test Article Title')
    })

    it('external link button has aria-label', () => {
      render(<ArticleCard {...defaultProps} />)
      expect(screen.getByLabelText('Open in browser')).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <ArticleCard {...defaultProps} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('edge cases', () => {
    it('handles missing description gracefully', () => {
      render(<ArticleCard {...defaultProps} description={undefined} />)
      expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    })

    it('handles missing feedName gracefully', () => {
      render(<ArticleCard {...defaultProps} feedName={undefined} />)
      expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    })

    it('handles invalid date gracefully', () => {
      render(<ArticleCard {...defaultProps} publishedAt="invalid-date" />)
      const timeElement = screen.getByTestId('article-time')
      expect(timeElement).toBeInTheDocument()
    })
  })
})
