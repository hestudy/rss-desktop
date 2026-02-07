import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SectionHeader } from './SectionHeader'

describe('SectionHeader', () => {
  describe('rendering', () => {
    it('renders title', () => {
      render(<SectionHeader title="Subscriptions" />)
      expect(screen.getByText('Subscriptions')).toBeInTheDocument()
    })

    it('renders count when provided', () => {
      render(<SectionHeader title="Subscriptions" count={5} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('does not render count when not provided', () => {
      render(<SectionHeader title="Subscriptions" />)
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('does not render count when count is 0', () => {
      render(<SectionHeader title="Subscriptions" count={0} />)
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  describe('collapsible', () => {
    it('renders collapse button when collapsible is true', () => {
      render(<SectionHeader title="Subscriptions" collapsible />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('does not render collapse button when collapsible is false', () => {
      render(<SectionHeader title="Subscriptions" collapsible={false} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('shows expanded icon when not collapsed', () => {
      render(<SectionHeader title="Subscriptions" collapsible collapsed={false} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('shows collapsed icon when collapsed', () => {
      render(<SectionHeader title="Subscriptions" collapsible collapsed />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('calls onToggle when collapse button is clicked', () => {
      const onToggle = vi.fn()
      render(<SectionHeader title="Subscriptions" collapsible onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button'))
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('action button', () => {
    it('renders action button when action is provided', () => {
      render(
        <SectionHeader
          title="Subscriptions"
          action={{ icon: 'plus', label: 'Add', onClick: vi.fn() }}
        />
      )
      expect(screen.getByLabelText('Add')).toBeInTheDocument()
    })

    it('calls action onClick when action button is clicked', () => {
      const onClick = vi.fn()
      render(
        <SectionHeader
          title="Subscriptions"
          action={{ icon: 'plus', label: 'Add', onClick }}
        />
      )

      fireEvent.click(screen.getByLabelText('Add'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not render action button when action is not provided', () => {
      render(<SectionHeader title="Subscriptions" />)
      expect(screen.queryByLabelText('Add')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies sidebar text color', () => {
      render(<SectionHeader title="Subscriptions" />)
      const title = screen.getByText('Subscriptions')
      expect(title).toHaveClass('text-sidebar-muted')
    })

    it('applies uppercase styling', () => {
      render(<SectionHeader title="Subscriptions" />)
      const title = screen.getByText('Subscriptions')
      expect(title).toHaveClass('uppercase')
    })

    it('applies small text size', () => {
      render(<SectionHeader title="Subscriptions" />)
      const title = screen.getByText('Subscriptions')
      expect(title).toHaveClass('text-xs')
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <SectionHeader title="Subscriptions" className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('has heading role for title', () => {
      render(<SectionHeader title="Subscriptions" />)
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('collapse button has aria-expanded', () => {
      render(<SectionHeader title="Subscriptions" collapsible collapsed={false} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded')
    })

    it('collapse button has aria-controls when id is provided', () => {
      render(
        <SectionHeader
          title="Subscriptions"
          collapsible
          sectionId="subscriptions-section"
        />
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-controls', 'subscriptions-section')
    })
  })
})
