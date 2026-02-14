import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingToggle } from './SettingToggle'

describe('SettingToggle', () => {
  const defaultProps = {
    label: '测试开关',
    checked: false,
    onChange: vi.fn(),
  }

  describe('rendering', () => {
    it('renders label text', () => {
      render(<SettingToggle {...defaultProps} />)
      expect(screen.getByText('测试开关')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      render(<SettingToggle {...defaultProps} description="这是描述" />)
      expect(screen.getByText('这是描述')).toBeInTheDocument()
    })

    it('does not render description when not provided', () => {
      const { container } = render(<SettingToggle {...defaultProps} />)
      const desc = container.querySelector('p')
      expect(desc).toBeNull()
    })
  })

  describe('toggle track styling', () => {
    it('has correct track dimensions (w-11 h-6)', () => {
      render(<SettingToggle {...defaultProps} />)
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('w-11')
      expect(button).toHaveClass('h-6')
    })

    it('uses inline-flex with items-center for knob centering', () => {
      render(<SettingToggle {...defaultProps} />)
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('inline-flex')
      expect(button).toHaveClass('items-center')
    })

    it('has border-2 border-transparent for inner padding', () => {
      render(<SettingToggle {...defaultProps} />)
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('border-2')
      expect(button).toHaveClass('border-transparent')
    })

    it('shows unchecked background when not checked', () => {
      render(<SettingToggle {...defaultProps} checked={false} />)
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('bg-muted-foreground/30')
    })

    it('shows primary background when checked', () => {
      render(<SettingToggle {...defaultProps} checked={true} />)
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('bg-primary')
    })
  })

  describe('toggle knob styling', () => {
    it('has correct knob dimensions (w-5 h-5)', () => {
      render(<SettingToggle {...defaultProps} />)
      const button = screen.getByRole('switch')
      const knob = button.querySelector('span')
      expect(knob).toHaveClass('w-5')
      expect(knob).toHaveClass('h-5')
    })

    it('knob uses block display instead of absolute positioning', () => {
      render(<SettingToggle {...defaultProps} />)
      const button = screen.getByRole('switch')
      const knob = button.querySelector('span')
      expect(knob).toHaveClass('block')
      expect(knob).not.toHaveClass('absolute')
    })

    it('knob translates to x-0 when unchecked', () => {
      render(<SettingToggle {...defaultProps} checked={false} />)
      const button = screen.getByRole('switch')
      const knob = button.querySelector('span')
      expect(knob).toHaveClass('translate-x-0')
    })

    it('knob translates to x-5 when checked', () => {
      render(<SettingToggle {...defaultProps} checked={true} />)
      const button = screen.getByRole('switch')
      const knob = button.querySelector('span')
      expect(knob).toHaveClass('translate-x-5')
    })
  })

  describe('interaction', () => {
    it('calls onChange with true when clicking unchecked toggle', () => {
      const onChange = vi.fn()
      render(<SettingToggle {...defaultProps} checked={false} onChange={onChange} />)
      fireEvent.click(screen.getByRole('switch'))
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it('calls onChange with false when clicking checked toggle', () => {
      const onChange = vi.fn()
      render(<SettingToggle {...defaultProps} checked={true} onChange={onChange} />)
      fireEvent.click(screen.getByRole('switch'))
      expect(onChange).toHaveBeenCalledWith(false)
    })
  })

  describe('accessibility', () => {
    it('has role switch', () => {
      render(<SettingToggle {...defaultProps} />)
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('has aria-checked matching checked prop', () => {
      const { rerender } = render(<SettingToggle {...defaultProps} checked={false} />)
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

      rerender(<SettingToggle {...defaultProps} checked={true} />)
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    })

    it('has aria-label matching label prop', () => {
      render(<SettingToggle {...defaultProps} />)
      expect(screen.getByRole('switch')).toHaveAttribute('aria-label', '测试开关')
    })
  })
})