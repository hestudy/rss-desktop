import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('renders with count', () => {
      render(<Badge count={5} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders with large count (99+)', () => {
      render(<Badge count={150} />)
      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('does not render when count is 0', () => {
      const { container } = render(<Badge count={0} />)
      expect(container.firstChild).toBeNull()
    })

    it('does not render when count is negative', () => {
      const { container } = render(<Badge count={-5} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('variants', () => {
    it('renders default variant with primary background', () => {
      render(<Badge count={5} variant="default" />)
      const badge = screen.getByText('5')
      expect(badge).toHaveClass('bg-primary')
    })

    it('renders secondary variant', () => {
      render(<Badge count={5} variant="secondary" />)
      const badge = screen.getByText('5')
      expect(badge).toHaveClass('bg-secondary')
    })

    it('renders destructive variant', () => {
      render(<Badge count={5} variant="destructive" />)
      const badge = screen.getByText('5')
      expect(badge).toHaveClass('bg-destructive')
    })
  })

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Badge count={5} size="sm" />)
      const badge = screen.getByText('5')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('px-1.5')
    })

    it('renders medium size (default)', () => {
      render(<Badge count={5} size="md" />)
      const badge = screen.getByText('5')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('px-2')
    })

    it('renders large size', () => {
      render(<Badge count={5} size="lg" />)
      const badge = screen.getByText('5')
      expect(badge).toHaveClass('text-sm')
      expect(badge).toHaveClass('px-2.5')
    })
  })

  describe('dot mode', () => {
    it('renders as dot when dot prop is true', () => {
      render(<Badge count={5} dot />)
      const badge = screen.getByTestId('badge-dot')
      expect(badge).toHaveClass('w-2')
      expect(badge).toHaveClass('h-2')
      expect(badge).toHaveClass('rounded-full')
    })

    it('renders dot even when count is 0 if showZero is true', () => {
      render(<Badge count={0} dot showZero />)
      const badge = screen.getByTestId('badge-dot')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('custom max', () => {
    it('respects custom max value', () => {
      render(<Badge count={50} max={10} />)
      expect(screen.getByText('10+')).toBeInTheDocument()
    })

    it('shows exact count when below max', () => {
      render(<Badge count={8} max={10} />)
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has appropriate aria-label', () => {
      render(<Badge count={5} />)
      const badge = screen.getByText('5')
      expect(badge).toHaveAttribute('aria-label', '5 unread')
    })

    it('has aria-label for 99+ case', () => {
      render(<Badge count={150} />)
      const badge = screen.getByText('99+')
      expect(badge).toHaveAttribute('aria-label', '150 unread')
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      render(<Badge count={5} className="custom-class" />)
      const badge = screen.getByText('5')
      expect(badge).toHaveClass('custom-class')
    })
  })
})
