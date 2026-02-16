import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddFeedDialog } from './AddFeedDialog'

const mockAddFeed = vi.fn()

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    addFeed: mockAddFeed,
  }),
}))

describe('AddFeedDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    render(<AddFeedDialog isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('添加 RSS 订阅')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true', () => {
    render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('添加 RSS 订阅')).toBeInTheDocument()
    expect(screen.getByLabelText(/RSS Feed URL/i)).toBeInTheDocument()
  })

  it('shows error when URL is empty on submit', () => {
    render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)

    const submitButton = screen.getByRole('button', { name: '添加' })
    expect(submitButton).toBeDisabled()
  })

  it('shows error when URL is invalid on submit', async () => {
    render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })

    const submitButton = screen.getByRole('button', { name: '添加' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/请输入有效的 URL/)).toBeInTheDocument()
    })
    expect(mockAddFeed).not.toHaveBeenCalled()
  }, 10000)

  it('calls addFeed with URL when form is submitted', async () => {
    const onClose = vi.fn()
    mockAddFeed.mockResolvedValue({ id: 'feed-1', title: 'Test' })

    render(<AddFeedDialog isOpen={true} onClose={onClose} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/feed.xml' } })

    const submitButton = screen.getByRole('button', { name: '添加' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAddFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        false,
        false,
        false,
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('renders use full content checkbox', () => {
    render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('自动抓取全文')).toBeInTheDocument()
  })

  it('calls addFeed with useFullContent=true when checkbox is checked', async () => {
    const onClose = vi.fn()
    mockAddFeed.mockResolvedValue({ id: 'feed-1', title: 'Test' })

    render(<AddFeedDialog isOpen={true} onClose={onClose} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/feed.xml' } })

    const fullContentCheckbox = screen.getByRole('checkbox', { name: /自动抓取全文/i })
    fireEvent.click(fullContentCheckbox)

    const submitButton = screen.getByRole('button', { name: '添加' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAddFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        true,
        false,
        false,
      )
    })
  })

  // RED: Tests for AI summary feature - will fail until implemented
  it('renders use AI summary checkbox', () => {
    render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('自动生成 AI 摘要')).toBeInTheDocument()
  })

  it('calls addFeed with useAiSummary=true when AI summary checkbox is checked', async () => {
    const onClose = vi.fn()
    mockAddFeed.mockResolvedValue({ id: 'feed-1', title: 'Test' })

    render(<AddFeedDialog isOpen={true} onClose={onClose} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/feed.xml' } })

    const aiSummaryCheckbox = screen.getByRole('checkbox', { name: /自动生成 AI 摘要/i })
    fireEvent.click(aiSummaryCheckbox)

    const submitButton = screen.getByRole('button', { name: '添加' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAddFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        false,
        true,
        false,
      )
    })
  })

  it('calls addFeed with both useFullContent and useAiSummary when both checkboxes are checked', async () => {
    const onClose = vi.fn()
    mockAddFeed.mockResolvedValue({ id: 'feed-1', title: 'Test' })

    render(<AddFeedDialog isOpen={true} onClose={onClose} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/feed.xml' } })

    const fullContentCheckbox = screen.getByRole('checkbox', { name: /自动抓取全文/i })
    fireEvent.click(fullContentCheckbox)

    const aiSummaryCheckbox = screen.getByRole('checkbox', { name: /自动生成 AI 摘要/i })
    fireEvent.click(aiSummaryCheckbox)

    const submitButton = screen.getByRole('button', { name: '添加' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAddFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        true,
        true,
        false,
      )
    })
  })

  it('closes dialog when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<AddFeedDialog isOpen={true} onClose={onClose} />)

    const cancelButton = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('displays error message on addFeed failure', async () => {
    mockAddFeed.mockRejectedValue(new Error('Feed already exists'))

    render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/feed.xml' } })

    const submitButton = screen.getByRole('button', { name: '添加' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Feed already exists')).toBeInTheDocument()
    })
  })

  describe('RSSHub 集成', () => {
    it('renders RSSHub discovery button', () => {
      render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByRole('button', { name: /RSSHub 发现/ })).toBeInTheDocument()
    })

    it('opens RSSHub discovery dialog when button is clicked', () => {
      render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)

      const rsshubButton = screen.getByRole('button', { name: /RSSHub 发现/ })
      fireEvent.click(rsshubButton)

      // RSSHub 发现对话框应该显示（对话框标题在 h2 中）
      expect(screen.getByRole('heading', { name: 'RSSHub 发现' })).toBeInTheDocument()
    })

    it('closes RSSHub discovery dialog independently', async () => {
      render(<AddFeedDialog isOpen={true} onClose={vi.fn()} />)

      // 打开 RSSHub 对话框
      const rsshubButton = screen.getByRole('button', { name: /RSSHub 发现/ })
      fireEvent.click(rsshubButton)
      expect(screen.getByRole('heading', { name: 'RSSHub 发现' })).toBeInTheDocument()

      // 关闭 RSSHub 对话框
      const closeButtons = screen.getAllByLabelText('关闭')
      fireEvent.click(closeButtons[closeButtons.length - 1]) // 点击最后一个关闭按钮（RSSHub 对话框的）

      // RSSHub 对话框应该关闭，但添加订阅对话框应该还在
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'RSSHub 发现' })).not.toBeInTheDocument()
      })
      expect(screen.getByText('添加 RSS 订阅')).toBeInTheDocument()
    })
  })
})
