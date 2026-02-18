import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddFromDiscoverDialog } from './AddFromDiscoverDialog'
import type { DiscoverFeed } from '../../types'

// Mock Dialog component
vi.mock('../ui/Dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => (
    <div data-testid="dialog" data-open={open}>
      {open && children}
      <button data-testid="dialog-backdrop" onClick={() => onOpenChange(false)}>
        Close
      </button>
    </div>
  ),
  DialogContent: ({
    children,
    title,
    className,
  }: {
    children: React.ReactNode
    title: string
    className?: string
  }) => (
    <div data-testid="dialog-content" className={className}>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}))

// Mock Button component
vi.mock('../ui/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    type,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    type?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-type={type}
    >
      {children}
    </button>
  ),
}))

describe('AddFromDiscoverDialog', () => {
  const mockFeed: DiscoverFeed = {
    id: 'test-feed-1',
    title: 'Test Feed Title',
    url: 'https://example.com/feed.xml',
    description: 'This is a test feed description',
    categoryId: 'tech',
    tags: ['tech', 'programming'],
    icon: undefined,
  }

  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnConfirm.mockResolvedValue(undefined)
  })

  describe('渲染测试', () => {
    it('does not render when isOpen is false', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={false}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()
    })

    it('does not render when feed is null', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={null}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()
    })

    it('renders when isOpen is true and feed is provided', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
      expect(screen.getByText('添加订阅')).toBeInTheDocument()
    })

    it('renders feed title and description', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('Test Feed Title')).toBeInTheDocument()
      expect(screen.getByText('This is a test feed description')).toBeInTheDocument()
    })

    it('renders AI option checkboxes', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('自动抓取全文')).toBeInTheDocument()
      expect(screen.getByText('自动生成 AI 摘要')).toBeInTheDocument()
      expect(screen.getByText('自动 AI 翻译')).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '添加' })).toBeInTheDocument()
    })
  })

  describe('复选框交互测试', () => {
    it('toggles full content checkbox', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const checkbox = screen.getByRole('checkbox', { name: '自动抓取全文' })
      expect(checkbox).not.toBeChecked()

      fireEvent.click(screen.getByText('自动抓取全文'))
      expect(checkbox).toBeChecked()
    })

    it('toggles AI summary checkbox', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const aiSummaryCheckbox = checkboxes[1]

      expect(aiSummaryCheckbox).not.toBeChecked()

      fireEvent.click(screen.getByText('自动生成 AI 摘要'))
      expect(aiSummaryCheckbox).toBeChecked()
    })

    it('toggles AI translation checkbox', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const aiTranslationCheckbox = checkboxes[2]

      expect(aiTranslationCheckbox).not.toBeChecked()

      fireEvent.click(screen.getByText('自动 AI 翻译'))
      expect(aiTranslationCheckbox).toBeChecked()
    })
  })

  describe('按钮交互测试', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: '取消' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('calls onConfirm with correct parameters when confirm button is clicked', async () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Toggle some options
      fireEvent.click(screen.getByText('自动抓取全文'))
      fireEvent.click(screen.getByText('自动 AI 翻译'))

      // Click confirm
      fireEvent.click(screen.getByRole('button', { name: '添加' }))

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          'https://example.com/feed.xml',
          true,  // useFullContent
          false, // useAiSummary
          true   // useAiTranslation
        )
      })
    })

    it('calls onConfirm with all options false by default', async () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: '添加' }))

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          'https://example.com/feed.xml',
          false,
          false,
          false
        )
      })
    })

    it('calls onClose after successful confirm', async () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: '添加' }))

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('加载状态测试', () => {
    it('shows loading state during confirm', async () => {
      let resolvePromise: () => void
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnConfirm.mockReturnValue(pendingPromise)

      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: '添加' })
      fireEvent.click(confirmButton)

      // Should show loading state
      expect(screen.getByText('添加中...')).toBeInTheDocument()
      expect(confirmButton).toBeDisabled()

      // Resolve the promise
      resolvePromise!()
      await waitFor(() => {
        expect(screen.queryByText('添加中...')).not.toBeInTheDocument()
      })
    })

    it('disables checkboxes during loading', async () => {
      let resolvePromise: () => void
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnConfirm.mockReturnValue(pendingPromise)

      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: '添加' })
      fireEvent.click(confirmButton)

      // All checkboxes should be disabled
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '添加' })).not.toBeDisabled()
      })
    })

    it('disables cancel button during loading', async () => {
      let resolvePromise: () => void
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnConfirm.mockReturnValue(pendingPromise)

      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: '添加' })
      const cancelButton = screen.getByRole('button', { name: '取消' })

      fireEvent.click(confirmButton)

      expect(cancelButton).toBeDisabled()

      // Resolve the promise
      resolvePromise!()
      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled()
      })
    })
  })

  describe('状态重置测试', () => {
    it('resets checkboxes after successful confirm', async () => {
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Toggle options
      fireEvent.click(screen.getByText('自动抓取全文'))
      fireEvent.click(screen.getByText('自动 AI 翻译'))

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: '添加' }))

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })

      // Re-render (simulating dialog reopening)
      render(
        <AddFromDiscoverDialog
          isOpen={true}
          feed={mockFeed}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Checkboxes should be unchecked
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked()
      })
    })
  })
})
