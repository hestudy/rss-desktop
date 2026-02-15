import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpdateBanner } from './UpdateBanner'

describe('UpdateBanner', () => {
  const defaultProps = {
    version: '1.2.0',
    onDownload: vi.fn(),
    onDismiss: vi.fn(),
  }

  it('renders update version', () => {
    render(<UpdateBanner {...defaultProps} />)

    expect(screen.getByText('新版本可用')).toBeInTheDocument()
    expect(screen.getByText('v1.2.0')).toBeInTheDocument()
  })

  it('calls onDownload when download button clicked', () => {
    const onDownload = vi.fn()
    render(<UpdateBanner {...defaultProps} onDownload={onDownload} />)

    fireEvent.click(screen.getByText('立即更新'))

    expect(onDownload).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn()
    render(<UpdateBanner {...defaultProps} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByLabelText('忽略更新'))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not show details button when no release notes', () => {
    render(<UpdateBanner {...defaultProps} />)

    expect(screen.queryByText('详情')).not.toBeInTheDocument()
  })

  it('shows details button when release notes provided', () => {
    render(<UpdateBanner {...defaultProps} releaseNotes="Bug fixes" />)

    expect(screen.getByText('详情')).toBeInTheDocument()
  })

  it('expands to show release notes when details clicked', () => {
    render(<UpdateBanner {...defaultProps} releaseNotes="Bug fixes and improvements" />)

    // Initially collapsed
    expect(screen.queryByText('Bug fixes and improvements')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(screen.getByText('详情'))

    expect(screen.getByText('Bug fixes and improvements')).toBeInTheDocument()
  })

  it('collapses release notes when details clicked again', () => {
    render(<UpdateBanner {...defaultProps} releaseNotes="Bug fixes" />)

    // Expand
    fireEvent.click(screen.getByText('详情'))
    expect(screen.getByText('Bug fixes')).toBeInTheDocument()

    // Collapse
    fireEvent.click(screen.getByText('详情'))
    expect(screen.queryByText('Bug fixes')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <UpdateBanner {...defaultProps} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has correct test id', () => {
    render(<UpdateBanner {...defaultProps} />)

    expect(screen.getByTestId('update-banner')).toBeInTheDocument()
  })
})
