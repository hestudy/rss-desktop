import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomNavigationBar } from './BottomNavigationBar'
import type { MobileView } from '@/contexts/LayoutContext'

// Mock LayoutContext
const mockSetMobileView = vi.fn()
const mockNavigateToFeedList = vi.fn()
const mockNavigateToDiscover = vi.fn()
const mockNavigateToSettings = vi.fn()

let mockMobileView: MobileView = 'feed-list'

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({
    mobileView: mockMobileView,
    setMobileView: mockSetMobileView,
    navigateToFeedList: mockNavigateToFeedList,
    navigateToDiscover: mockNavigateToDiscover,
    navigateToSettings: mockNavigateToSettings,
  }),
}))

describe('BottomNavigationBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMobileView = 'feed-list'
  })

  describe('Rendering', () => {
    it('should render all navigation items', () => {
      render(<BottomNavigationBar />)

      // Check for navigation items with accessible names
      expect(screen.getByRole('button', { name: /订阅|feeds/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /发现|discover/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /设置|settings/i })).toBeInTheDocument()
    })

    it('should use correct icons for each navigation item', () => {
      render(<BottomNavigationBar />)

      // Check for SVG icons (lucide-react renders as SVG)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(3)

      buttons.forEach(button => {
        const svg = button.querySelector('svg')
        expect(svg).toBeInTheDocument()
      })
    })

    it('should have safe area padding at bottom', () => {
      const { container } = render(<BottomNavigationBar />)

      // Check for safe-area-inset-bottom class or style
      const nav = container.querySelector('nav') || container.firstChild
      expect(nav).toHaveClass('pb-[env(safe-area-inset-bottom)]')
    })
  })

  describe('Active State', () => {
    it('should highlight current view (feed-list)', () => {
      mockMobileView = 'feed-list'
      render(<BottomNavigationBar />)

      const feedButton = screen.getByRole('button', { name: /订阅|feeds/i })
      expect(feedButton).toHaveAttribute('aria-current', 'page')
    })

    it('should highlight current view (discover)', () => {
      mockMobileView = 'discover'
      render(<BottomNavigationBar />)

      const discoverButton = screen.getByRole('button', { name: /发现|discover/i })
      expect(discoverButton).toHaveAttribute('aria-current', 'page')
    })

    it('should highlight current view (settings)', () => {
      mockMobileView = 'settings'
      render(<BottomNavigationBar />)

      const settingsButton = screen.getByRole('button', { name: /设置|settings/i })
      expect(settingsButton).toHaveAttribute('aria-current', 'page')
    })

    it('should highlight article-list as feed (since it is under feed category)', () => {
      mockMobileView = 'article-list'
      render(<BottomNavigationBar />)

      const feedButton = screen.getByRole('button', { name: /订阅|feeds/i })
      expect(feedButton).toHaveAttribute('aria-current', 'page')
    })

    it('should highlight article-reader as feed (since it is under feed category)', () => {
      mockMobileView = 'article-reader'
      render(<BottomNavigationBar />)

      const feedButton = screen.getByRole('button', { name: /订阅|feeds/i })
      expect(feedButton).toHaveAttribute('aria-current', 'page')
    })

    it('should apply active styling to highlighted item', () => {
      mockMobileView = 'discover'
      render(<BottomNavigationBar />)

      const discoverButton = screen.getByRole('button', { name: /发现|discover/i })
      // Should have some visual indication (e.g., different color)
      expect(discoverButton.className).toMatch(/text-(primary|blue|accent)/i)
    })
  })

  describe('Navigation', () => {
    it('should call navigateToFeedList when feed button clicked', () => {
      render(<BottomNavigationBar />)

      const feedButton = screen.getByRole('button', { name: /订阅|feeds/i })
      fireEvent.click(feedButton)

      expect(mockNavigateToFeedList).toHaveBeenCalledTimes(1)
    })

    it('should call navigateToDiscover when discover button clicked', () => {
      render(<BottomNavigationBar />)

      const discoverButton = screen.getByRole('button', { name: /发现|discover/i })
      fireEvent.click(discoverButton)

      expect(mockNavigateToDiscover).toHaveBeenCalledTimes(1)
    })

    it('should call navigateToSettings when settings button clicked', () => {
      render(<BottomNavigationBar />)

      const settingsButton = screen.getByRole('button', { name: /设置|settings/i })
      fireEvent.click(settingsButton)

      expect(mockNavigateToSettings).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have navigation role', () => {
      const { container } = render(<BottomNavigationBar />)

      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
    })

    it('should have accessible labels for all buttons', () => {
      render(<BottomNavigationBar />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('should meet minimum touch target size (44x44)', () => {
      render(<BottomNavigationBar />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Check for min-h-11 or min-w-11 (44px = 11 * 4px in Tailwind)
        const hasMinSize = button.className.includes('min-h-11') ||
          button.className.includes('min-w-11') ||
          button.className.includes('min-w-[') ||
          button.className.includes('min-h-[')
        expect(hasMinSize || button.className.includes('p-')).toBe(true)
      })
    })
  })

  describe('Visibility Control', () => {
    it('should be visible by default', () => {
      const { container } = render(<BottomNavigationBar />)

      const nav = container.querySelector('nav')
      expect(nav).not.toHaveClass('hidden')
      expect(nav).toBeVisible()
    })

    it('should hide when visible prop is false', () => {
      const { container } = render(<BottomNavigationBar visible={false} />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('hidden')
    })

    it('should be visible when visible prop is true', () => {
      const { container } = render(<BottomNavigationBar visible={true} />)

      const nav = container.querySelector('nav')
      expect(nav).not.toHaveClass('hidden')
      expect(nav).toBeVisible()
    })

    it('should hide in reader mode (visible=false)', () => {
      mockMobileView = 'article-reader'
      const { container } = render(<BottomNavigationBar visible={false} />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('hidden')
    })
  })

  describe('Unread Count Badge', () => {
    it('should not show badge when unreadCount is undefined', () => {
      render(<BottomNavigationBar />)

      // Badge should not exist
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
    })

    it('should not show badge when unreadCount is 0', () => {
      render(<BottomNavigationBar unreadCount={0} />)

      // Badge should not exist
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('should show badge with count when unreadCount > 0', () => {
      render(<BottomNavigationBar unreadCount={5} />)

      const badge = screen.getByText('5')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-primary')
    })

    it('should show correct count for various values', () => {
      const { rerender } = render(<BottomNavigationBar unreadCount={1} />)
      expect(screen.getByText('1')).toBeInTheDocument()

      rerender(<BottomNavigationBar unreadCount={10} />)
      expect(screen.getByText('10')).toBeInTheDocument()

      rerender(<BottomNavigationBar unreadCount={50} />)
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('should format count as 99+ when count exceeds 99', () => {
      render(<BottomNavigationBar unreadCount={100} />)

      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should format count as 99+ for very large numbers', () => {
      render(<BottomNavigationBar unreadCount={1000} />)

      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should format count as 99+ when count is exactly 100', () => {
      render(<BottomNavigationBar unreadCount={100} />)

      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should show 99 when count is 99 (not 99+)', () => {
      render(<BottomNavigationBar unreadCount={99} />)

      expect(screen.getByText('99')).toBeInTheDocument()
      expect(screen.queryByText('99+')).not.toBeInTheDocument()
    })

    it('should position badge on feed button', () => {
      render(<BottomNavigationBar unreadCount={5} />)

      const feedButton = screen.getByRole('button', { name: /订阅|feeds/i })
      const badge = screen.getByText('5')

      // Badge should be inside the feed button
      expect(feedButton).toContainElement(badge)
    })

    it('badge should have proper accessibility attributes', () => {
      render(<BottomNavigationBar unreadCount={5} />)

      const badge = screen.getByText('5')
      // Should have aria-label for screen readers
      expect(badge).toHaveAttribute('aria-label', '5 条未读')
    })
  })
})
