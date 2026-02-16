import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmProvider, useConfirm } from './ConfirmDialog'

// Test component that uses the confirm dialog
function TestComponent() {
  const { confirm, isOpen, message, title } = useConfirm()
  const [result, setResult] = React.useState<boolean | null>(null)

  const handleClick = async () => {
    const confirmed = await confirm('Are you sure?', 'Confirm Action')
    setResult(confirmed)
  }

  return (
    <div>
      <button onClick={handleClick}>Open Dialog</button>
      {isOpen && <span data-testid="dialog-open">Dialog is open</span>}
      {message && <span data-testid="dialog-message">{message}</span>}
      {title && <span data-testid="dialog-title">{title}</span>}
      {result !== null && <span data-testid="result">{result.toString()}</span>}
    </div>
  )
}

import React from 'react'

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ConfirmProvider', () => {
    it('should render children', () => {
      render(
        <ConfirmProvider>
          <div data-testid="child">Child Content</div>
        </ConfirmProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should throw error when useConfirm is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      function ComponentOutsideProvider() {
        useConfirm()
        return null
      }

      expect(() => render(<ComponentOutsideProvider />)).toThrow(
        'useConfirm must be used within ConfirmProvider'
      )

      consoleError.mockRestore()
    })
  })

  describe('confirm function', () => {
    it('should open dialog when confirm is called', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-message')).toHaveTextContent('Are you sure?')
    })

    it('should display title when provided', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))

      // Use more specific selector to avoid matching multiple elements
      const titleElement = screen.getByRole('heading', { name: 'Confirm Action' })
      expect(titleElement).toBeInTheDocument()
    })

    it('should resolve with true when confirm button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))
      await user.click(screen.getByTestId('confirm-ok-button'))

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('true')
      })
    })

    it('should resolve with false when cancel button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))
      await user.click(screen.getByTestId('confirm-cancel-button'))

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('false')
      })
    })

    it('should resolve with false when backdrop is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))
      await user.click(screen.getByTestId('dialog-backdrop'))

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('false')
      })
    })

    it('should close dialog after action', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()

      await user.click(screen.getByTestId('confirm-ok-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have cancel button with correct text', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))

      expect(screen.getByTestId('confirm-cancel-button')).toHaveTextContent('取消')
    })

    it('should have confirm button with correct text', async () => {
      const user = userEvent.setup()

      render(
        <ConfirmProvider>
          <TestComponent />
        </ConfirmProvider>
      )

      await user.click(screen.getByText('Open Dialog'))

      expect(screen.getByTestId('confirm-ok-button')).toHaveTextContent('确定')
    })
  })
})
