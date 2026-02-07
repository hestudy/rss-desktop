import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SidebarNav } from './SidebarNav'

describe('SidebarNav', () => {
  const defaultProps = {
    items: [
      { id: 'all', icon: 'inbox', label: 'All', count: 10 },
      { id: 'unread', icon: 'mail', label: 'Unread', count: 5 },
      { id: 'starred', icon: 'star', label: 'Starred', count: 3 },
      { id: 'today', icon: 'calendar', label: 'Today', count: 0 },
      { id: 'settings', icon: 'settings', label: 'Settings' },
    ],
    activeId: 'all',
    onSelect: vi.fn(),
  }

  describe('rendering', () => {
    it('renders all navigation items', () => {
      render(<SidebarNav {...defaultProps} />)

      expect(screen.getByLabelText('All')).toBeInTheDocument()
      expect(screen.getByLabelText('Unread')).toBeInTheDocument()
      expect(screen.getByLabelText('Starred')).toBeInTheDocument()
      expect(screen.getByLabelText('Today')).toBeInTheDocument()
      expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    })

    it('renders icons for each item', () => {
      render(<SidebarNav {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(5)

      buttons.forEach(button => {
        expect(button.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('renders badge counts for items with count > 0', () => {
      render(<SidebarNav {...defaultProps} />)

      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('does not render badge for items with count 0', () => {
      render(<SidebarNav {...defaultProps} />)

      // Today has count 0, should not show badge
      const todayButton = screen.getByLabelText('Today')
      expect(todayButton.querySelector('[aria-label]')).toBeNull()
    })

    it('does not render badge for items without count', () => {
      render(<SidebarNav {...defaultProps} />)

      // Settings has no count
      const settingsButton = screen.getByLabelText('Settings')
      expect(settingsButton.querySelector('[aria-label]')).toBeNull()
    })
  })

  describe('active state', () => {
    it('highlights active item', () => {
      render(<SidebarNav {...defaultProps} activeId="all" />)

      const activeButton = screen.getByLabelText('All')
      expect(activeButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not highlight inactive items', () => {
      render(<SidebarNav {...defaultProps} activeId="all" />)

      const inactiveButton = screen.getByLabelText('Unread')
      expect(inactiveButton).not.toHaveAttribute('aria-pressed', 'true')
    })

    it('applies active styles to active item', () => {
      render(<SidebarNav {...defaultProps} activeId="unread" />)

      const activeButton = screen.getByLabelText('Unread')
      expect(activeButton).toHaveClass('text-sidebar-active')
    })
  })

  describe('interactions', () => {
    it('calls onSelect when item is clicked', () => {
      const onSelect = vi.fn()
      render(<SidebarNav {...defaultProps} onSelect={onSelect} />)

      fireEvent.click(screen.getByLabelText('Starred'))
      expect(onSelect).toHaveBeenCalledWith('starred')
    })

    it('calls onSelect with correct id for each item', () => {
      const onSelect = vi.fn()
      render(<SidebarNav {...defaultProps} onSelect={onSelect} />)

      fireEvent.click(screen.getByLabelText('Today'))
      expect(onSelect).toHaveBeenCalledWith('today')

      fireEvent.click(screen.getByLabelText('Settings'))
      expect(onSelect).toHaveBeenCalledWith('settings')
    })
  })

  describe('layout', () => {
    it('renders in vertical layout by default', () => {
      const { container } = render(<SidebarNav {...defaultProps} />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('flex-col')
    })

    it('renders in horizontal layout when specified', () => {
      const { container } = render(<SidebarNav {...defaultProps} direction="horizontal" />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('flex-row')
    })
  })

  describe('accessibility', () => {
    it('has navigation role', () => {
      render(<SidebarNav {...defaultProps} />)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('has aria-label on navigation', () => {
      render(<SidebarNav {...defaultProps} aria-label="Main navigation" />)

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation')
    })

    it('each button has aria-label', () => {
      render(<SidebarNav {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      const { container } = render(<SidebarNav {...defaultProps} className="custom-class" />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('custom-class')
    })
  })

  describe('empty state', () => {
    it('renders empty nav when no items provided', () => {
      render(<SidebarNav items={[]} activeId="" onSelect={vi.fn()} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    })
  })
})
