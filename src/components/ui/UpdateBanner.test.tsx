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

  describe('更新日志按钮', () => {
    it('不显示查看更新日志按钮（当没有 onViewChangelog 回调）', () => {
      render(<UpdateBanner {...defaultProps} />)

      expect(screen.queryByText(/更新日志/)).not.toBeInTheDocument()
    })

    it('显示查看更新日志按钮（当提供 onViewChangelog 回调）', () => {
      const onViewChangelog = vi.fn()
      render(
        <UpdateBanner
          {...defaultProps}
          onViewChangelog={onViewChangelog}
        />
      )

      expect(screen.getByText(/更新日志/)).toBeInTheDocument()
    })

    it('点击查看更新日志按钮调用 onViewChangelog', () => {
      const onViewChangelog = vi.fn()
      render(
        <UpdateBanner
          {...defaultProps}
          onViewChangelog={onViewChangelog}
        />
      )

      fireEvent.click(screen.getByText(/更新日志/))
      expect(onViewChangelog).toHaveBeenCalledTimes(1)
    })
  })
})
