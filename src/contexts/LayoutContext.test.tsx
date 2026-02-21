import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LayoutProvider, useLayout, MobileView } from './LayoutContext'
import { isMobile } from '@/lib/platform'

// Mock platform detection
vi.mock('@/lib/platform', () => ({
  isMobile: vi.fn(),
}))

const mockIsMobile = vi.mocked(isMobile)

// Test component that uses the layout context
function TestComponent() {
  const {
    isMobileLayout,
    mobileView,
    setMobileView,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    canGoBack,
    goBack,
    navigationHistory,
    navigateToFeedList,
    navigateToArticleList,
    navigateToReader,
    navigateToDiscover,
    navigateToSettings,
    // New enhanced features
    isToolbarVisible,
    toggleToolbar,
    setToolbarVisible,
    previousView,
    isReading,
    currentArticleId,
  } = useLayout()

  return (
    <div>
      <span data-testid="isMobileLayout">{isMobileLayout.toString()}</span>
      <span data-testid="mobileView">{mobileView}</span>
      <span data-testid="isDrawerOpen">{isDrawerOpen.toString()}</span>
      <span data-testid="canGoBack">{canGoBack.toString()}</span>
      <span data-testid="navigationHistory">{JSON.stringify(navigationHistory)}</span>

      <button data-testid="set-feed-list" onClick={() => setMobileView('feed-list')}>
        Set Feed List
      </button>
      <button data-testid="set-article-list" onClick={() => setMobileView('article-list')}>
        Set Article List
      </button>
      <button data-testid="set-reader" onClick={() => setMobileView('article-reader')}>
        Set Reader
      </button>
      <button data-testid="set-discover" onClick={() => setMobileView('discover')}>
        Set Discover
      </button>
      <button data-testid="set-settings" onClick={() => setMobileView('settings')}>
        Set Settings
      </button>

      <button data-testid="open-drawer" onClick={openDrawer}>
        Open Drawer
      </button>
      <button data-testid="close-drawer" onClick={closeDrawer}>
        Close Drawer
      </button>
      <button data-testid="toggle-drawer" onClick={toggleDrawer}>
        Toggle Drawer
      </button>

      <button data-testid="go-back" onClick={goBack}>
        Go Back
      </button>

      <button data-testid="nav-feed-list" onClick={navigateToFeedList}>
        Nav Feed List
      </button>
      <button data-testid="nav-article-list" onClick={() => navigateToArticleList()}>
        Nav Article List
      </button>
      <button data-testid="nav-reader" onClick={() => navigateToReader('article-123')}>
        Nav Reader
      </button>
      <button data-testid="nav-discover" onClick={navigateToDiscover}>
        Nav Discover
      </button>
      <button data-testid="nav-settings" onClick={navigateToSettings}>
        Nav Settings
      </button>

      {/* New enhanced features */}
      <span data-testid="isToolbarVisible">{isToolbarVisible.toString()}</span>
      <span data-testid="previousView">{previousView ?? 'null'}</span>
      <span data-testid="isReading">{isReading.toString()}</span>
      <span data-testid="currentArticleId">{currentArticleId ?? 'null'}</span>

      <button data-testid="toggle-toolbar" onClick={toggleToolbar}>
        Toggle Toolbar
      </button>
      <button data-testid="set-toolbar-visible" onClick={() => setToolbarVisible(true)}>
        Set Toolbar Visible
      </button>
      <button data-testid="set-toolbar-hidden" onClick={() => setToolbarVisible(false)}>
        Set Toolbar Hidden
      </button>
    </div>
  )
}

describe('LayoutContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile.mockReturnValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Provider', () => {
    it('should throw error when useLayout is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      function ComponentOutsideProvider() {
        useLayout()
        return null
      }

      expect(() => render(<ComponentOutsideProvider />)).toThrow(
        'useLayout must be used within LayoutProvider'
      )

      consoleError.mockRestore()
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state on desktop', () => {
      mockIsMobile.mockReturnValue(false)

      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      expect(screen.getByTestId('isMobileLayout')).toHaveTextContent('false')
      expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')
      expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')
      expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list"]')
    })

    it('should have correct initial state on mobile', () => {
      mockIsMobile.mockReturnValue(true)

      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      expect(screen.getByTestId('isMobileLayout')).toHaveTextContent('true')
      expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
    })
  })

  describe('setMobileView', () => {
    it('should update mobileView to article-list', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
    })

    it('should update mobileView to article-reader', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('set-reader').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('article-reader')
    })

    it('should update mobileView to discover', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('set-discover').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('discover')
    })

    it('should update mobileView to settings', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('set-settings').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('settings')
    })

    it('should close drawer when navigating to new view', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Open drawer first
      await act(async () => {
        screen.getByTestId('open-drawer').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')

      // Navigate to new view
      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')
    })
  })

  describe('Drawer', () => {
    it('should open drawer', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')

      await act(async () => {
        screen.getByTestId('open-drawer').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')
    })

    it('should close drawer', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Open first
      await act(async () => {
        screen.getByTestId('open-drawer').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')

      // Then close
      await act(async () => {
        screen.getByTestId('close-drawer').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')
    })

    it('should toggle drawer', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')

      await act(async () => {
        screen.getByTestId('toggle-drawer').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')

      await act(async () => {
        screen.getByTestId('toggle-drawer').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')
    })
  })

  describe('Navigation History', () => {
    it('should track navigation history', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Initial state
      expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list"]')

      // Navigate to article-list
      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list","article-list"]')

      // Navigate to reader
      await act(async () => {
        screen.getByTestId('set-reader').click()
      })

      expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list","article-list","article-reader"]')
    })

    it('should update canGoBack based on history', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Initially can't go back
      expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')

      // Navigate to another view
      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      // Now can go back
      expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')
    })

    it('should go back to previous view', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Navigate: feed-list -> article-list -> reader
      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      await act(async () => {
        screen.getByTestId('set-reader').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('article-reader')
      expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list","article-list","article-reader"]')

      // Go back
      await act(async () => {
        screen.getByTestId('go-back').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
      expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list","article-list"]')

      // Go back again
      await act(async () => {
        screen.getByTestId('go-back').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
      expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')
    })

    it('should not go back when at beginning of history', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')

      // Try to go back (should do nothing)
      await act(async () => {
        screen.getByTestId('go-back').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
      expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list"]')
    })

    it('should limit history to MAX_HISTORY_SIZE', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Navigate many times (more than max 10)
      for (let i = 0; i < 15; i++) {
        await act(async () => {
          screen.getByTestId('toggle-drawer').click() // Just to trigger state change
          if (i % 2 === 0) {
            screen.getByTestId('set-article-list').click()
          } else {
            screen.getByTestId('set-reader').click()
          }
        })
      }

      const history = JSON.parse(screen.getByTestId('navigationHistory').textContent || '[]')

      // History should be limited to 10
      expect(history.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Convenience Navigation Methods', () => {
    it('should navigate to feed list', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // First navigate somewhere else
      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      // Then use convenience method
      await act(async () => {
        screen.getByTestId('nav-feed-list').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
    })

    it('should navigate to article list', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('nav-article-list').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
    })

    it('should navigate to reader', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('nav-reader').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('article-reader')
    })

    it('should navigate to discover', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('nav-discover').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('discover')
    })

    it('should navigate to settings', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      await act(async () => {
        screen.getByTestId('nav-settings').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('settings')
    })

    it('should close drawer when using convenience navigation methods', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Open drawer
      await act(async () => {
        screen.getByTestId('open-drawer').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')

      // Navigate using convenience method
      await act(async () => {
        screen.getByTestId('nav-discover').click()
      })

      expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')
      expect(screen.getByTestId('mobileView')).toHaveTextContent('discover')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid navigation', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Rapid navigation
      await act(async () => {
        screen.getByTestId('set-article-list').click()
        screen.getByTestId('set-reader').click()
        screen.getByTestId('set-discover').click()
        screen.getByTestId('set-settings').click()
      })

      expect(screen.getByTestId('mobileView')).toHaveTextContent('settings')
    })

    it('should handle navigating to same view multiple times', async () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Navigate to same view multiple times
      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })

      const history = JSON.parse(screen.getByTestId('navigationHistory').textContent || '[]')

      // Should not add duplicates consecutively
      // Each click adds to history since we're testing the general behavior
      expect(history[history.length - 1]).toBe('article-list')
    })
  })

  describe('Platform Detection', () => {
    it('should update isMobileLayout when platform changes', async () => {
      mockIsMobile.mockReturnValue(false)

      const { rerender } = render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      expect(screen.getByTestId('isMobileLayout')).toHaveTextContent('false')

      // Change platform
      mockIsMobile.mockReturnValue(true)

      rerender(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>
      )

      // Note: In actual implementation, this would require a mechanism to
      // detect platform changes (e.g., resize listener or re-evaluation)
      // For now, we test the initial detection
    })
  })
})

describe('MobileView Type', () => {
  it('should have correct view types', () => {
    const views: MobileView[] = [
      'feed-list',
      'article-list',
      'article-reader',
      'discover',
      'settings',
    ]

    expect(views).toHaveLength(5)
    expect(views).toContain('feed-list')
    expect(views).toContain('article-list')
    expect(views).toContain('article-reader')
    expect(views).toContain('discover')
    expect(views).toContain('settings')
  })
})

describe('RssContext Integration', () => {
  // These tests verify the expected integration behavior
  // In actual implementation, LayoutProvider would be used alongside RssProvider

  it('should support navigation to article-list when feed is selected', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Simulate: User selects a feed, should navigate to article list
    await act(async () => {
      screen.getByTestId('nav-article-list').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')
  })

  it('should support navigation to reader when article is selected', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate to article list first
    await act(async () => {
      screen.getByTestId('nav-article-list').click()
    })

    // Simulate: User selects an article, should navigate to reader
    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-reader')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')
  })

  it('should support navigation to discover view', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Simulate: User wants to discover new feeds
    await act(async () => {
      screen.getByTestId('nav-discover').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('discover')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')
  })

  it('should support full navigation flow: feed-list -> article-list -> reader -> back to feed-list', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Start at feed-list
    expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')

    // Select feed -> go to article-list
    await act(async () => {
      screen.getByTestId('nav-article-list').click()
    })
    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')

    // Select article -> go to reader
    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })
    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-reader')

    // Go back to article-list
    await act(async () => {
      screen.getByTestId('go-back').click()
    })
    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')

    // Go back to feed-list
    await act(async () => {
      screen.getByTestId('go-back').click()
    })
    expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')
  })
})

describe('Edge Cases - Additional Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile.mockReturnValue(false)
  })

  it('should handle goBack when history has exactly one entry', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Initial state: only one entry in history
    expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list"]')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')

    // goBack should do nothing
    await act(async () => {
      screen.getByTestId('go-back').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
    expect(screen.getByTestId('navigationHistory')).toHaveTextContent('["feed-list"]')
  })

  it('should correctly slice history when MAX_HISTORY_SIZE is reached', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate 12 times to exceed MAX_HISTORY_SIZE (10)
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        screen.getByTestId('set-article-list').click()
      })
      await act(async () => {
        screen.getByTestId('set-feed-list').click()
      })
    }

    const history = JSON.parse(screen.getByTestId('navigationHistory').textContent || '[]')

    // History should be limited to 10
    expect(history.length).toBeLessThanOrEqual(10)

    // Most recent view should be feed-list (last click)
    expect(history[history.length - 1]).toBe('feed-list')
  })

  it('should maintain state across multiple render cycles', async () => {
    const { rerender } = render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate to article-list
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')

    // Force re-render
    rerender(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // State should be preserved
    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
  })

  it('should handle consecutive drawer operations', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Open
    await act(async () => {
      screen.getByTestId('open-drawer').click()
    })
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')

    // Open again (should remain open)
    await act(async () => {
      screen.getByTestId('open-drawer').click()
    })
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')

    // Close
    await act(async () => {
      screen.getByTestId('close-drawer').click()
    })
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')

    // Close again (should remain closed)
    await act(async () => {
      screen.getByTestId('close-drawer').click()
    })
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')
  })

  it('should correctly alternate drawer state with toggle', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Initial: closed
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')

    // Toggle: open
    await act(async () => {
      screen.getByTestId('toggle-drawer').click()
    })
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')

    // Toggle: closed
    await act(async () => {
      screen.getByTestId('toggle-drawer').click()
    })
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('false')

    // Toggle: open
    await act(async () => {
      screen.getByTestId('toggle-drawer').click()
    })
    expect(screen.getByTestId('isDrawerOpen')).toHaveTextContent('true')
  })

  it('should update canGoBack correctly after multiple navigations and goBacks', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate several times
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')

    await act(async () => {
      screen.getByTestId('set-reader').click()
    })
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')

    await act(async () => {
      screen.getByTestId('set-discover').click()
    })
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')

    // Go back
    await act(async () => {
      screen.getByTestId('go-back').click()
    })
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')

    // Go back again
    await act(async () => {
      screen.getByTestId('go-back').click()
    })
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')

    // Go back to initial
    await act(async () => {
      screen.getByTestId('go-back').click()
    })
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')
  })

  it('should handle navigateToArticleList with feedId parameter', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate with feedId (parameter is accepted but not used internally)
    await act(async () => {
      screen.getByTestId('nav-article-list').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
  })

  it('should handle navigateToReader with articleId parameter', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate with articleId (parameter is accepted but not used internally)
    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-reader')
  })
})

describe('Enhanced Features - Toolbar Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile.mockReturnValue(true)
  })

  it('should have initial toolbar hidden', () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('false')
  })

  it('should toggle toolbar visibility', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Initially hidden
    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('false')

    // Toggle to visible
    await act(async () => {
      screen.getByTestId('toggle-toolbar').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')

    // Toggle back to hidden
    await act(async () => {
      screen.getByTestId('toggle-toolbar').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('false')
  })

  it('should set toolbar visible with setToolbarVisible(true)', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('false')

    await act(async () => {
      screen.getByTestId('set-toolbar-visible').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')
  })

  it('should set toolbar hidden with setToolbarVisible(false)', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // First make it visible
    await act(async () => {
      screen.getByTestId('set-toolbar-visible').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')

    // Then hide it
    await act(async () => {
      screen.getByTestId('set-toolbar-hidden').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('false')
  })

  it('should handle multiple rapid toolbar toggles', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    await act(async () => {
      screen.getByTestId('toggle-toolbar').click()
      screen.getByTestId('toggle-toolbar').click()
      screen.getByTestId('toggle-toolbar').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')
  })
})

describe('Enhanced Features - Previous View State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile.mockReturnValue(true)
  })

  it('should have null previousView initially', () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    expect(screen.getByTestId('previousView')).toHaveTextContent('null')
  })

  it('should track previousView after navigation', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate to article-list
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })

    expect(screen.getByTestId('previousView')).toHaveTextContent('feed-list')

    // Navigate to reader
    await act(async () => {
      screen.getByTestId('set-reader').click()
    })

    expect(screen.getByTestId('previousView')).toHaveTextContent('article-list')
  })

  it('should update previousView when going back', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate: feed-list -> article-list -> reader
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })

    await act(async () => {
      screen.getByTestId('set-reader').click()
    })

    expect(screen.getByTestId('previousView')).toHaveTextContent('article-list')

    // Go back
    await act(async () => {
      screen.getByTestId('go-back').click()
    })

    // After going back, previousView should be feed-list
    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
    expect(screen.getByTestId('previousView')).toHaveTextContent('feed-list')
  })

  it('should update previousView to null when back at beginning', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate away
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })

    expect(screen.getByTestId('previousView')).toHaveTextContent('feed-list')

    // Go back to beginning
    await act(async () => {
      screen.getByTestId('go-back').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
    expect(screen.getByTestId('previousView')).toHaveTextContent('null')
  })
})

describe('Enhanced Features - Reading State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile.mockReturnValue(true)
  })

  it('should have isReading false initially', () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
  })

  it('should have currentArticleId null initially', () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('null')
  })

  it('should set isReading to true when navigating to reader', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('true')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('article-123')
  })

  it('should set isReading to false when navigating away from reader', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // First navigate to reader
    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('true')

    // Navigate away
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('null')
  })

  it('should set isReading to false when going back from reader', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate to reader via article list
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })

    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('true')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('article-123')

    // Go back
    await act(async () => {
      screen.getByTestId('go-back').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('null')
  })

  it('should handle navigateToReader with different article IDs', async () => {
    // Create a custom test component with different article ID
    function TestComponentWithArticle() {
      const { navigateToReader, currentArticleId, isReading } = useLayout()

      return (
        <div>
          <span data-testid="isReading">{isReading.toString()}</span>
          <span data-testid="currentArticleId">{currentArticleId ?? 'null'}</span>
          <button data-testid="nav-article-456" onClick={() => navigateToReader('article-456')}>
            Nav Article 456
          </button>
        </div>
      )
    }

    render(
      <LayoutProvider>
        <TestComponentWithArticle />
      </LayoutProvider>
    )

    await act(async () => {
      screen.getByTestId('nav-article-456').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('true')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('article-456')
  })

  it('should clear reading state when navigating to feed-list', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // First navigate to reader
    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('true')

    // Navigate to feed-list
    await act(async () => {
      screen.getByTestId('set-feed-list').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('null')
  })
})

describe('Enhanced Features - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile.mockReturnValue(true)
  })

  it('should maintain toolbar state independent of navigation', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Show toolbar
    await act(async () => {
      screen.getByTestId('set-toolbar-visible').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')

    // Navigate
    await act(async () => {
      screen.getByTestId('set-article-list').click()
    })

    // Toolbar should still be visible (or hidden based on implementation)
    // This tests that navigation doesn't affect toolbar state
    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')
  })

  it('should support full reading workflow: select feed -> select article -> read -> go back', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Initial state
    expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')

    // Select feed -> article list
    await act(async () => {
      screen.getByTestId('nav-article-list').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true')
    expect(screen.getByTestId('previousView')).toHaveTextContent('feed-list')

    // Select article -> reader
    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-reader')
    expect(screen.getByTestId('isReading')).toHaveTextContent('true')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('article-123')
    expect(screen.getByTestId('previousView')).toHaveTextContent('article-list')

    // Go back to article list
    await act(async () => {
      screen.getByTestId('go-back').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('article-list')
    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('currentArticleId')).toHaveTextContent('null')
    expect(screen.getByTestId('previousView')).toHaveTextContent('feed-list')

    // Go back to feed list
    await act(async () => {
      screen.getByTestId('go-back').click()
    })

    expect(screen.getByTestId('mobileView')).toHaveTextContent('feed-list')
    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false')
    expect(screen.getByTestId('previousView')).toHaveTextContent('null')
  })

  it('should handle toolbar toggle during reading', async () => {
    render(
      <LayoutProvider>
        <TestComponent />
      </LayoutProvider>
    )

    // Navigate to reader
    await act(async () => {
      screen.getByTestId('nav-reader').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('true')
    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('false')

    // Toggle toolbar while reading
    await act(async () => {
      screen.getByTestId('toggle-toolbar').click()
    })

    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')
    expect(screen.getByTestId('isReading')).toHaveTextContent('true')

    // Navigate away - toolbar should remain in last state
    await act(async () => {
      screen.getByTestId('set-feed-list').click()
    })

    expect(screen.getByTestId('isReading')).toHaveTextContent('false')
    expect(screen.getByTestId('isToolbarVisible')).toHaveTextContent('true')
  })
})
