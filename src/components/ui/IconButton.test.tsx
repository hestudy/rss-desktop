import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IconButton } from './IconButton'
import { Home, Settings, Bell } from 'lucide-react'

describe('IconButton', () => {
  describe('rendering', () => {
    it('renders with icon', () => {
      render(<IconButton icon={Home} aria-label="Home" />)
      const button = screen.getByRole('button', { name: 'Home' })
      expect(button).toBeInTheDocument()
    })

    it('renders icon inside button', () => {
      render(<IconButton icon={Settings} aria-label="Settings" />)
      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('badge', () => {
    it('renders badge when badgeCount is provided', () => {
      render(<IconButton icon={Bell} aria-label="Notifications" badgeCount={5} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('does not render badge when badgeCount is 0', () => {
      render(<IconButton icon={Bell} aria-label="Notifications" badgeCount={0} />)
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('renders badge with 99+ for large counts', () => {
      render(<IconButton icon={Bell} aria-label="Notifications" badgeCount={150} />)
      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('renders dot badge when showDot is true', () => {
      render(<IconButton icon={Bell} aria-label="Notifications" showDot />)
      expect(screen.getByTestId('badge-dot')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('renders default variant', () => {
      render(<IconButton icon={Home} aria-label="Home" variant="default" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('renders ghost variant', () => {
      render(<IconButton icon={Home} aria-label="Home" variant="ghost" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('renders sidebar variant with sidebar colors', () => {
      render(<IconButton icon={Home} aria-label="Home" variant="sidebar" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-sidebar-muted')
    })
  })

  describe('sizes', () => {
    it('renders small size', () => {
      render(<IconButton icon={Home} aria-label="Home" size="sm" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('w-8')
      expect(button).toHaveClass('h-8')
    })

    it('renders medium size (default)', () => {
      render(<IconButton icon={Home} aria-label="Home" size="md" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('w-10')
      expect(button).toHaveClass('h-10')
    })

    it('renders large size', () => {
      render(<IconButton icon={Home} aria-label="Home" size="lg" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('w-12')
      expect(button).toHaveClass('h-12')
    })
  })

  describe('active state', () => {
    it('applies active styles when active prop is true', () => {
      render(<IconButton icon={Home} aria-label="Home" active />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary')
    })

    it('does not apply active styles when active is false', () => {
      render(<IconButton icon={Home} aria-label="Home" active={false} />)
      const button = screen.getByRole('button')
      expect(button).not.toHaveClass('text-primary')
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<IconButton icon={Home} aria-label="Home" onClick={handleClick} />)

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<IconButton icon={Home} aria-label="Home" onClick={handleClick} disabled />)

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('applies disabled styles when disabled', () => {
      render(<IconButton icon={Home} aria-label="Home" disabled />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50')
    })
  })

  describe('tooltip', () => {
    it('has title attribute when tooltip is provided', () => {
      render(<IconButton icon={Home} aria-label="Home" tooltip="Go to home" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Go to home')
    })
  })

  describe('accessibility', () => {
    it('has aria-label', () => {
      render(<IconButton icon={Home} aria-label="Home" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Home')
    })

    it('has aria-pressed when active', () => {
      render(<IconButton icon={Home} aria-label="Home" active />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      render(<IconButton icon={Home} aria-label="Home" className="custom-class" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })
})
