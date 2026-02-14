import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeedList } from './FeedList'

const mockSelectFeed = vi.fn()
const mockSelectFavorites = vi.fn()
const mockRemoveFeed = vi.fn()
const mockRefreshFeed = vi.fn()
const mockRefreshAllFeeds = vi.fn()
const mockUpdateFeed = vi.fn()
const mockGetGlobalUnreadCount = vi.fn(() => 3)

vi.mock('../../contexts/RssContext', () => ({
  useRss: () => ({
    feeds: [
      {
        feed: { id: 'feed-1', title: 'Tech Blog', url: 'https://example.com/feed.xml', icon_url: null, site_url: 'https://example.com' },
        unread_count: 3,
      },
      {
        feed: { id: 'feed-2', title: 'News Feed', url: 'https://news.com/rss', icon_url: null, site_url: 'https://news.com' },
        unread_count: 0,
      },
    ],
    selectedFeedId: null,
    isLoading: false,
    removeFeed: mockRemoveFeed,
    refreshFeed: mockRefreshFeed,
    refreshAllFeeds: mockRefreshAllFeeds,
    updateFeed: mockUpdateFeed,
    selectFeed: mockSelectFeed,
    selectFavorites: mockSelectFavorites,
    showFavoritesOnly: false,
    getGlobalUnreadCount: mockGetGlobalUnreadCount,
    refreshingFeedIds: new Set<string>(),
  }),
}))

vi.mock('../ui/ConfirmDialog', () => ({
  useConfirm: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}))

vi.mock('../settings/UnifiedSettings', () => ({
  useUnifiedSettings: () => ({
    openSettings: vi.fn(),
  }),
}))

vi.mock('lucide-react', () => ({
  Rss: (props: Record<string, unknown>) => <svg data-testid="rss-icon" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  Settings: (props: Record<string, unknown>) => <svg data-testid="settings-icon" {...props} />,
  Star: (props: Record<string, unknown>) => <svg data-testid="star-icon" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right-icon" {...props} />,
  Inbox: (props: Record<string, unknown>) => <svg data-testid="inbox-icon" {...props} />,
  Mail: (props: Record<string, unknown>) => <svg data-testid="mail-icon" {...props} />,
  Calendar: (props: Record<string, unknown>) => <svg data-testid="calendar-icon" {...props} />,
  Pencil: (props: Record<string, unknown>) => <svg data-testid="pencil-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  MoreHorizontal: (props: Record<string, unknown>) => <svg data-testid="more-icon" {...props} />,
  ScrollText: (props: Record<string, unknown>) => <svg data-testid="scroll-text-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}))

vi.mock('../queue/QueueIndicator', () => ({
  QueueIndicator: () => <div data-testid="queue-indicator" />,
}))

describe('FeedList', () => {
  describe('feed action buttons hover behavior', () => {
    it('renders action buttons with absolute positioning and hidden by default', () => {
      render(<FeedList />)

      const feedItems = screen.getAllByText(/Tech Blog|News Feed/)
      expect(feedItems.length).toBeGreaterThanOrEqual(2)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      expect(actionContainers.length).toBe(2)

      actionContainers.forEach((container) => {
        expect(container).toHaveClass('absolute')
        expect(container).toHaveClass('opacity-0')
        expect(container).toHaveClass('group-hover:opacity-100')
      })
    })

    it('action buttons are positioned to right edge without affecting layout', () => {
      render(<FeedList />)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      actionContainers.forEach((container) => {
        expect(container).toHaveClass('right-0')
        expect(container).toHaveClass('top-0')
        expect(container).toHaveClass('bottom-0')
      })
    })

    it('action buttons have background to cover underlying text on hover', () => {
      render(<FeedList />)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      actionContainers.forEach((container) => {
        const classList = Array.from(container.classList)
        const hasBg = classList.some(c => c.startsWith('bg-'))
        expect(hasBg).toBe(true)
      })
    })
  })

  describe('edit feed button', () => {
    it('renders a dropdown trigger for each feed in the action area', () => {
      render(<FeedList />)

      const actionContainers = document.querySelectorAll('[data-testid="feed-actions"]')
      actionContainers.forEach((container) => {
        const triggerButton = container.querySelector('[data-testid="more-icon"]')
        expect(triggerButton).toBeTruthy()
      })
    })
  })

  describe('queue indicator', () => {
    it('renders QueueIndicator in the bottom toolbar', () => {
      render(<FeedList />)
      expect(screen.getByTestId('queue-indicator')).toBeInTheDocument()
    })
  })
})
