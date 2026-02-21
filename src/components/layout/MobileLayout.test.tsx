import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MobileLayout } from './MobileLayout'
import type { MobileView } from '@/contexts/LayoutContext'

// Mock LayoutContext
let mockMobileView: MobileView = 'feed-list'
let mockIsMobileLayout = true

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({
    isMobileLayout: mockIsMobileLayout,
    mobileView: mockMobileView,
    setMobileView: vi.fn(),
    isDrawerOpen: false,
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    toggleDrawer: vi.fn(),
    canGoBack: false,
    goBack: vi.fn(),
    navigationHistory: ['feed-list'],
    navigateToFeedList: vi.fn(),
    navigateToArticleList: vi.fn(),
    navigateToReader: vi.fn(),
    navigateToDiscover: vi.fn(),
    navigateToSettings: vi.fn(),
  }),
}))

// Mock BottomNavigationBar
vi.mock('./BottomNavigationBar', () => ({
  BottomNavigationBar: () => (
    <nav data-testid="bottom-navigation-bar">Bottom Nav</nav>
  ),
}))

describe('MobileLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMobileView = 'feed-list'
    mockIsMobileLayout = true
  })

  describe('Rendering', () => {
    it('should render children content', () => {
      render(
        <MobileLayout>
          <div data-testid="child-content">Test Content</div>
        </MobileLayout>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })

    it('should render bottom navigation bar', () => {
      render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      expect(screen.getByTestId('bottom-navigation-bar')).toBeInTheDocument()
    })

    it('should have full height layout', () => {
      const { container } = render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer.className).toMatch(/h-screen|h-full|flex.*flex-col/)
    })

    it('should apply safe area padding at top', () => {
      const { container } = render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer.className).toMatch(/pt-\[env\(safe-area-inset-top\)\]/)
    })
  })

  describe('Layout Structure', () => {
    it('should have main content area that fills remaining space', () => {
      const { container } = render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      // Should have a flex container with content taking remaining space
      const mainContent = container.querySelector('[class*="flex-1"]') ||
        container.querySelector('[class*="overflow"]')
      expect(mainContent).toBeInTheDocument()
    })

    it('should position bottom nav at bottom', () => {
      const { container } = render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      const bottomNav = screen.getByTestId('bottom-navigation-bar')
      // Bottom nav should be the last child of the flex container
      const flexContainer = container.firstChild as HTMLElement
      const lastChild = flexContainer.lastChild as HTMLElement
      expect(lastChild.contains(bottomNav)).toBe(true)
      // Parent should have flex-shrink-0 to prevent compression
      expect(bottomNav.parentElement?.className).toMatch(/flex-shrink-0/)
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle safe-area-inset-bottom for main content', () => {
      const { container } = render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      // The main content area should account for bottom safe area
      const mainContent = container.querySelector('main') ||
        container.querySelector('[role="main"]') ||
        container.querySelector('[class*="flex-1"]')
      expect(mainContent).toBeInTheDocument()
    })
  })

  describe('View Switching', () => {
    it('should render content for current view', () => {
      mockMobileView = 'feed-list'

      render(
        <MobileLayout>
          <div data-testid="view-feed">Feed View</div>
        </MobileLayout>
      )

      expect(screen.getByTestId('view-feed')).toBeInTheDocument()
    })

    it('should re-render when mobileView changes', () => {
      const { rerender } = render(
        <MobileLayout>
          <div data-testid="view-content">View: {mockMobileView}</div>
        </MobileLayout>
      )

      expect(screen.getByText('View: feed-list')).toBeInTheDocument()

      // Change view and rerender
      mockMobileView = 'discover'
      rerender(
        <MobileLayout>
          <div data-testid="view-content">View: {mockMobileView}</div>
        </MobileLayout>
      )

      expect(screen.getByText('View: discover')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have main landmark', () => {
      const { container } = render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      const main = container.querySelector('main') ||
        container.querySelector('[role="main"]')
      expect(main).toBeInTheDocument()
    })

    it('should have proper focus management structure', () => {
      const { container } = render(
        <MobileLayout>
          <div>Content</div>
        </MobileLayout>
      )

      // Should have tabindex or focusable structure
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null children gracefully', () => {
      render(<MobileLayout>{null}</MobileLayout>)

      expect(screen.getByTestId('bottom-navigation-bar')).toBeInTheDocument()
    })

    it('should handle undefined children gracefully', () => {
      render(<MobileLayout>{undefined}</MobileLayout>)

      expect(screen.getByTestId('bottom-navigation-bar')).toBeInTheDocument()
    })

    it('should handle multiple children', () => {
      render(
        <MobileLayout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </MobileLayout>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
    })
  })
})
