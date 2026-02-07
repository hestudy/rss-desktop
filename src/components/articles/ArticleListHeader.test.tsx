import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArticleListHeader } from './ArticleListHeader'

describe('ArticleListHeader', () => {
  const defaultProps = {
    title: 'All Articles',
    onRefresh: vi.fn(),
    onFilter: vi.fn(),
    onMarkAllRead: vi.fn(),
  }

  const propsWithoutFilter = {
    title: 'All Articles',
    onRefresh: vi.fn(),
    onMarkAllRead: vi.fn(),
  }

  describe('rendering', () => {
    it('renders title', () => {
      render(<ArticleListHeader {...defaultProps} />)
      expect(screen.getByText('All Articles')).toBeInTheDocument()
    })

    it('renders refresh button', () => {
      render(<ArticleListHeader {...defaultProps} />)
      expect(screen.getByLabelText('Refresh')).toBeInTheDocument()
    })

    it('renders filter button when onFilter is provided', () => {
      render(<ArticleListHeader {...defaultProps} />)
      expect(screen.getByLabelText('Filter')).toBeInTheDocument()
    })

    it('does not render filter button when onFilter is not provided', () => {
      render(<ArticleListHeader {...propsWithoutFilter} />)
      expect(screen.queryByLabelText('Filter')).not.toBeInTheDocument()
    })

    it('renders mark all read button', () => {
      render(<ArticleListHeader {...defaultProps} />)
      expect(screen.getByLabelText('Mark all as read')).toBeInTheDocument()
    })

    it('renders unread count when provided', () => {
      render(<ArticleListHeader {...defaultProps} unreadCount={10} />)
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('does not render unread count when 0', () => {
      render(<ArticleListHeader {...defaultProps} unreadCount={0} />)
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onRefresh when refresh button is clicked', () => {
      const onRefresh = vi.fn()
      render(<ArticleListHeader {...defaultProps} onRefresh={onRefresh} />)

      fireEvent.click(screen.getByLabelText('Refresh'))
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('calls onFilter when filter button is clicked', () => {
      const onFilter = vi.fn()
      render(<ArticleListHeader {...defaultProps} onFilter={onFilter} />)

      fireEvent.click(screen.getByLabelText('Filter'))
      expect(onFilter).toHaveBeenCalledTimes(1)
    })

    it('calls onMarkAllRead when mark all read button is clicked', () => {
      const onMarkAllRead = vi.fn()
      render(<ArticleListHeader {...defaultProps} onMarkAllRead={onMarkAllRead} />)

      fireEvent.click(screen.getByLabelText('Mark all as read'))
      expect(onMarkAllRead).toHaveBeenCalledTimes(1)
    })
  })

  describe('loading state', () => {
    it('shows loading spinner on refresh button when isRefreshing', () => {
      render(<ArticleListHeader {...defaultProps} isRefreshing />)
      const refreshButton = screen.getByLabelText('Refresh')
      expect(refreshButton.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('disables refresh button when isRefreshing', () => {
      render(<ArticleListHeader {...defaultProps} isRefreshing />)
      const refreshButton = screen.getByLabelText('Refresh')
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('filter active state', () => {
    it('highlights filter button when filter is active', () => {
      render(<ArticleListHeader {...defaultProps} isFilterActive />)
      const filterButton = screen.getByLabelText('Filter')
      expect(filterButton).toHaveClass('text-primary')
    })

    it('does not highlight filter button when filter is not active', () => {
      render(<ArticleListHeader {...defaultProps} isFilterActive={false} />)
      const filterButton = screen.getByLabelText('Filter')
      expect(filterButton).not.toHaveClass('text-primary')
    })
  })

  describe('mark all read visibility', () => {
    it('hides mark all read button when hideMarkAllRead is true', () => {
      render(<ArticleListHeader {...defaultProps} hideMarkAllRead />)
      expect(screen.queryByLabelText('Mark all as read')).not.toBeInTheDocument()
    })

    it('shows mark all read button by default', () => {
      render(<ArticleListHeader {...defaultProps} />)
      expect(screen.getByLabelText('Mark all as read')).toBeInTheDocument()
    })
  })

  describe('filter visibility', () => {
    it('hides filter button when hideFilter is true', () => {
      render(<ArticleListHeader {...defaultProps} hideFilter />)
      expect(screen.queryByLabelText('Filter')).not.toBeInTheDocument()
    })

    it('shows filter button when onFilter is provided and hideFilter is false', () => {
      render(<ArticleListHeader {...defaultProps} hideFilter={false} />)
      expect(screen.getByLabelText('Filter')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has border bottom', () => {
      const { container } = render(<ArticleListHeader {...defaultProps} />)
      expect(container.firstChild).toHaveClass('border-b')
    })

    it('has proper padding', () => {
      const { container } = render(<ArticleListHeader {...defaultProps} />)
      expect(container.firstChild).toHaveClass('px-4')
      expect(container.firstChild).toHaveClass('py-3')
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <ArticleListHeader {...defaultProps} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('has heading for title', () => {
      render(<ArticleListHeader {...defaultProps} />)
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('all buttons have aria-labels', () => {
      render(<ArticleListHeader {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })
    })
  })
})
