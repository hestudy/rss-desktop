import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog, DialogContent } from './Dialog'

vi.mock('lucide-react', () => ({
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}))

describe('Dialog', () => {
  it('does not render content when closed', () => {
    render(
      <Dialog open={false}>
        <DialogContent>Hello</DialogContent>
      </Dialog>
    )
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('renders content when open', () => {
    render(
      <Dialog open={true}>
        <DialogContent>Hello</DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(
      <Dialog open={true}>
        <DialogContent title="My Title">Content</DialogContent>
      </Dialog>
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  it('renders close button when title is provided', () => {
    render(
      <Dialog open={true}>
        <DialogContent title="Title">Content</DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when close button clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent title="Title">Content</DialogContent>
      </Dialog>
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when backdrop clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent title="Title">Content</DialogContent>
      </Dialog>
    )
    const backdrop = document.querySelector('.bg-black\\/50')!
    fireEvent.click(backdrop)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('applies custom className', () => {
    render(
      <Dialog open={true}>
        <DialogContent className="custom-class">Content</DialogContent>
      </Dialog>
    )
    const content = screen.getByText('Content').closest('.custom-class')
    expect(content).toBeInTheDocument()
  })

  it('works as uncontrolled dialog', () => {
    render(
      <Dialog>
        <DialogContent title="Uncontrolled">Content</DialogContent>
      </Dialog>
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('throws when DialogContent used outside Dialog', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      render(<DialogContent>Orphan</DialogContent>)
    }).toThrow('Dialog components must be used within Dialog')
    spy.mockRestore()
  })
})
