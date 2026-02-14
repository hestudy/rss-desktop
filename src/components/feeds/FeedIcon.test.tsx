import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedIcon } from './FeedIcon'

describe('FeedIcon', () => {
  it('renders initial letter when no iconUrl provided', () => {
    render(<FeedIcon title="Tech Blog" />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('renders uppercase initial', () => {
    render(<FeedIcon title="news" />)
    expect(screen.getByText('N')).toBeInTheDocument()
  })

  it('renders ? for empty title', () => {
    render(<FeedIcon title="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders img when valid iconUrl provided', () => {
    render(<FeedIcon iconUrl="https://example.com/icon.png" title="Test" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png')
    expect(img).toHaveAttribute('alt', 'Test')
  })

  it('falls back to initial on invalid URL', () => {
    render(<FeedIcon iconUrl="not-a-url" title="Test" />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('falls back to initial on image error', () => {
    render(<FeedIcon iconUrl="https://example.com/broken.png" title="Test" />)
    const img = screen.getByRole('img')
    fireEvent.error(img)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('applies custom size', () => {
    const { container } = render(<FeedIcon title="A" size={32} />)
    const div = container.firstChild as HTMLElement
    expect(div.style.width).toBe('32px')
    expect(div.style.height).toBe('32px')
  })

  it('uses default size of 20', () => {
    const { container } = render(<FeedIcon title="A" />)
    const div = container.firstChild as HTMLElement
    expect(div.style.width).toBe('20px')
  })
})
