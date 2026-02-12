import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditFeedDialog } from './EditFeedDialog'

const mockUpdateFeed = vi.fn()

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    updateFeed: mockUpdateFeed,
  }),
}))

const baseFeed = {
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  title: 'Test Feed',
  description: 'A test feed',
  icon_url: undefined,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  use_full_content: false,
  use_ai_summary: false,
}

describe('EditFeedDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    render(<EditFeedDialog isOpen={false} onClose={vi.fn()} feed={baseFeed} />)
    expect(screen.queryByText('编辑订阅')).not.toBeInTheDocument()
  })

  it('renders with feed data pre-filled when open', () => {
    render(<EditFeedDialog isOpen={true} onClose={vi.fn()} feed={baseFeed} />)

    expect(screen.getByText('编辑订阅')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/feed.xml')).toBeInTheDocument()
  })

  it('shows error when title is empty on submit', () => {
    render(<EditFeedDialog isOpen={true} onClose={vi.fn()} feed={baseFeed} />)

    const titleInput = screen.getByDisplayValue('Test Feed')
    fireEvent.change(titleInput, { target: { value: '' } })

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    expect(screen.getByText('标题不能为空')).toBeInTheDocument()
    expect(mockUpdateFeed).not.toHaveBeenCalled()
  })

  it('shows error when URL is empty on submit', () => {
    render(<EditFeedDialog isOpen={true} onClose={vi.fn()} feed={baseFeed} />)

    const urlInput = screen.getByDisplayValue('https://example.com/feed.xml')
    fireEvent.change(urlInput, { target: { value: '' } })

    const form = urlInput.closest('form')!
    fireEvent.submit(form)

    expect(screen.getByText('URL 不能为空')).toBeInTheDocument()
    expect(mockUpdateFeed).not.toHaveBeenCalled()
  })

  it('shows error when URL is invalid on submit', () => {
    render(<EditFeedDialog isOpen={true} onClose={vi.fn()} feed={baseFeed} />)

    const urlInput = screen.getByDisplayValue('https://example.com/feed.xml')
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })

    const form = urlInput.closest('form')!
    fireEvent.submit(form)

    expect(screen.getByText('请输入有效的 URL')).toBeInTheDocument()
    expect(mockUpdateFeed).not.toHaveBeenCalled()
  })

  it('calls updateFeed with changed title only', async () => {
    const onClose = vi.fn()
    mockUpdateFeed.mockResolvedValue(undefined)

    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const titleInput = screen.getByDisplayValue('Test Feed')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateFeed).toHaveBeenCalledWith(
        'feed-1',
        'Updated Title',
        undefined,
        undefined,
        undefined,
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls updateFeed with changed URL only', async () => {
    const onClose = vi.fn()
    mockUpdateFeed.mockResolvedValue(undefined)

    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const urlInput = screen.getByDisplayValue('https://example.com/feed.xml')
    fireEvent.change(urlInput, { target: { value: 'https://new-url.com/rss' } })

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateFeed).toHaveBeenCalledWith(
        'feed-1',
        undefined,
        'https://new-url.com/rss',
        undefined,
        undefined,
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls updateFeed with both title and URL when both changed', async () => {
    const onClose = vi.fn()
    mockUpdateFeed.mockResolvedValue(undefined)

    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const titleInput = screen.getByDisplayValue('Test Feed')
    fireEvent.change(titleInput, { target: { value: 'New Title' } })

    const urlInput = screen.getByDisplayValue('https://example.com/feed.xml')
    fireEvent.change(urlInput, { target: { value: 'https://new.com/feed' } })

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateFeed).toHaveBeenCalledWith(
        'feed-1',
        'New Title',
        'https://new.com/feed',
        undefined,
        undefined,
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call updateFeed when nothing changed', async () => {
    const onClose = vi.fn()

    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
    expect(mockUpdateFeed).not.toHaveBeenCalled()
  })

  it('displays backend error message on failure', async () => {
    mockUpdateFeed.mockRejectedValue(new Error('URL already exists'))

    render(<EditFeedDialog isOpen={true} onClose={vi.fn()} feed={baseFeed} />)

    const titleInput = screen.getByDisplayValue('Test Feed')
    fireEvent.change(titleInput, { target: { value: 'Changed' } })

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('URL already exists')).toBeInTheDocument()
    })
  })

  it('closes dialog when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const cancelButton = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('calls updateFeed with useFullContent when checkbox is toggled', async () => {
    const onClose = vi.fn()
    mockUpdateFeed.mockResolvedValue(undefined)

    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const checkbox = screen.getByRole('checkbox', { name: /自动抓取全文/i })
    fireEvent.click(checkbox)

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateFeed).toHaveBeenCalledWith(
        'feed-1',
        undefined,
        undefined,
        true,
        undefined,
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('renders use AI summary checkbox', () => {
    render(<EditFeedDialog isOpen={true} onClose={vi.fn()} feed={baseFeed} />)
    expect(screen.getByText('自动生成 AI 摘要')).toBeInTheDocument()
  })

  it('calls updateFeed with useAiSummary when AI summary checkbox is toggled', async () => {
    const onClose = vi.fn()
    mockUpdateFeed.mockResolvedValue(undefined)

    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const checkbox = screen.getByRole('checkbox', { name: /自动生成 AI 摘要/i })
    fireEvent.click(checkbox)

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateFeed).toHaveBeenCalledWith(
        'feed-1',
        undefined,
        undefined,
        undefined,
        true,
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls updateFeed with both useFullContent and useAiSummary when both toggled', async () => {
    const onClose = vi.fn()
    mockUpdateFeed.mockResolvedValue(undefined)

    render(<EditFeedDialog isOpen={true} onClose={onClose} feed={baseFeed} />)

    const fullContentCheckbox = screen.getByRole('checkbox', { name: /自动抓取全文/i })
    fireEvent.click(fullContentCheckbox)

    const aiSummaryCheckbox = screen.getByRole('checkbox', { name: /自动生成 AI 摘要/i })
    fireEvent.click(aiSummaryCheckbox)

    const submitButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateFeed).toHaveBeenCalledWith(
        'feed-1',
        undefined,
        undefined,
        true,
        true,
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('pre-selects AI summary checkbox when feed has use_ai_summary=true', () => {
    const feedWithAiSummary = { ...baseFeed, use_ai_summary: true }
    render(<EditFeedDialog isOpen={true} onClose={vi.fn()} feed={feedWithAiSummary} />)

    const checkbox = screen.getByRole('checkbox', { name: /自动生成 AI 摘要/i })
    expect(checkbox).toBeChecked()
  })
})
