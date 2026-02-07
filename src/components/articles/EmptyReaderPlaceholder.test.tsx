import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyReaderPlaceholder } from './EmptyReaderPlaceholder'

describe('EmptyReaderPlaceholder', () => {
  describe('rendering', () => {
    it('renders icon', () => {
      render(<EmptyReaderPlaceholder />)
      expect(screen.getByTestId('empty-reader-icon')).toBeInTheDocument()
    })

    it('renders main message', () => {
      render(<EmptyReaderPlaceholder />)
      expect(screen.getByText(/准备好开始阅读了吗/)).toBeInTheDocument()
    })

    it('renders hint message', () => {
      render(<EmptyReaderPlaceholder />)
      expect(screen.getByText(/从左侧选择一篇文章/)).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(<EmptyReaderPlaceholder />)
      expect(container.firstChild).toHaveClass('flex')
      expect(container.firstChild).toHaveClass('items-center')
      expect(container.firstChild).toHaveClass('justify-center')
    })

    it('takes full height', () => {
      const { container } = render(<EmptyReaderPlaceholder />)
      expect(container.firstChild).toHaveClass('h-full')
    })

    it('uses flex column layout', () => {
      const { container } = render(<EmptyReaderPlaceholder />)
      expect(container.firstChild).toHaveClass('flex-col')
    })
  })

  describe('icon', () => {
    it('has muted color with opacity', () => {
      render(<EmptyReaderPlaceholder />)
      const icon = screen.getByTestId('empty-reader-icon')
      expect(icon).toHaveClass('text-muted-foreground/30')
    })

    it('has appropriate size', () => {
      render(<EmptyReaderPlaceholder />)
      const icon = screen.getByTestId('empty-reader-icon')
      expect(icon).toHaveClass('w-16')
      expect(icon).toHaveClass('h-16')
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      const { container } = render(<EmptyReaderPlaceholder className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
