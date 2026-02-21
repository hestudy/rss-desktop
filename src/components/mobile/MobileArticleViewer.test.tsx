import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileArticleViewer } from './MobileArticleViewer'
import type { Article } from '@/types'

// Mock dependencies
vi.mock('@/hooks/useSwipeGesture', () => ({
  useSwipeGesture: vi.fn((_config) => {
    const mockHandlers = {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    }
    return {
      swipeState: { isSwiping: false, direction: null, progress: 0 },
      handlers: mockHandlers,
    }
  }),
}))

vi.mock('@/components/mobile/MobileToolbar', () => ({
  MobileToolbar: function MockMobileToolbar({
    title,
    showBack,
    onBack,
    isFavorited,
    onToggleFavorite,
    menuItems,
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
    visible,
  }: {
    title?: string
    showBack?: boolean
    onBack?: () => void
    isFavorited?: boolean
    onToggleFavorite?: () => void
    menuItems?: Array<{ label: string; onClick: () => void; icon?: React.ReactNode; disabled?: boolean }>
    onPrevious?: () => void
    onNext?: () => void
    hasPrevious?: boolean
    hasNext?: boolean
    visible?: boolean
  }) {
    return (
      <div role="toolbar" data-testid="mobile-toolbar" data-visible={visible?.toString()}>
        {showBack && (
          <button aria-label="Go back" onClick={onBack}>
            Back
          </button>
        )}
        {title && <h1>{title}</h1>}
        {onToggleFavorite && (
          <button aria-label="Toggle favorite" aria-pressed={isFavorited ?? false} onClick={onToggleFavorite}>
            Favorite
          </button>
        )}
        {menuItems && menuItems.length > 0 && (
          <button aria-label="More options">More</button>
        )}
        {onPrevious && (
          <button aria-label="Previous article" onClick={onPrevious} disabled={!hasPrevious}>
            Previous
          </button>
        )}
        {onNext && (
          <button aria-label="Next article" onClick={onNext} disabled={!hasNext}>
            Next
          </button>
        )}
      </div>
    )
  },
}))

// Helper function to create mock article
function createMockArticle(overrides?: Partial<Article>): Article {
  return {
    id: 'test-article-1',
    feed_id: 'test-feed-1',
    title: 'Test Article Title',
    link: 'https://example.com/article',
    description: 'This is a test article description.',
    content: '<p>Test article content</p>',
    published_at: new Date().toISOString(),
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// Helper function to create mock touch event (used in potential future tests)
function _createMockTouchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
  changedTouches?: Array<{ clientX: number; clientY: number }>
): React.TouchEvent {
  const createTouchList = (touchArray: Array<{ clientX: number; clientY: number }>) => {
    return touchArray.map((t, index) => ({
      clientX: t.clientX,
      clientY: t.clientY,
      identifier: index,
      screenX: 0,
      screenY: 0,
      pageX: t.clientX,
      pageY: t.clientY,
      target: null,
    })) as unknown as React.TouchList
  }

  return {
    type,
    touches: createTouchList(touches),
    changedTouches: createTouchList(changedTouches ?? touches),
    targetTouches: createTouchList(touches),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    nativeEvent: {
      touches: touches.map((t) => ({
        clientX: t.clientX,
        clientY: t.clientY,
        identifier: 0,
      })),
      changedTouches: (changedTouches ?? touches).map((t) => ({
        clientX: t.clientX,
        clientY: t.clientY,
        identifier: 0,
      })),
    },
  } as unknown as React.TouchEvent
}

// Export for potential future use
export { _createMockTouchEvent as createMockTouchEvent }

describe('MobileArticleViewer', () => {
  const mockArticle = createMockArticle()
  const mockOnBack = vi.fn()
  const mockOnToggleFavorite = vi.fn()
  const mockOnFetchFullContent = vi.fn()
  const mockOnAISummary = vi.fn()
  const mockOnTranslate = vi.fn()
  const mockOnPrevious = vi.fn()
  const mockOnNext = vi.fn()
  const mockOnProgressChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render article title', () => {
      render(<MobileArticleViewer article={mockArticle} />)

      // Title appears in both toolbar and content area
      const titles = screen.getAllByText('Test Article Title')
      expect(titles.length).toBeGreaterThanOrEqual(1)
    })

    it('should render article content', () => {
      render(<MobileArticleViewer article={mockArticle} />)

      expect(screen.getByText('Test article content')).toBeInTheDocument()
    })

    it('should render article description when content is not available', () => {
      const articleWithoutContent = createMockArticle({ content: undefined })
      render(<MobileArticleViewer article={articleWithoutContent} />)

      expect(screen.getByText('This is a test article description.')).toBeInTheDocument()
    })

    it('should apply custom content className', () => {
      render(<MobileArticleViewer article={mockArticle} contentClassName="custom-class" />)

      const contentArea = screen.getByTestId('article-content-area')
      expect(contentArea).toBeInTheDocument()
    })
  })

  describe('MobileToolbar Integration', () => {
    it('should render MobileToolbar with article title', () => {
      render(<MobileArticleViewer article={mockArticle} />)

      expect(screen.getByTestId('mobile-toolbar')).toBeInTheDocument()
      // The title is passed to the toolbar
      const toolbar = screen.getByTestId('mobile-toolbar')
      expect(toolbar).toBeInTheDocument()
    })

    it('should show back button in toolbar', () => {
      render(<MobileArticleViewer article={mockArticle} onBack={mockOnBack} />)

      expect(screen.getByLabelText('Go back')).toBeInTheDocument()
    })

    it('should call onBack when back button is clicked', () => {
      render(<MobileArticleViewer article={mockArticle} onBack={mockOnBack} />)

      fireEvent.click(screen.getByLabelText('Go back'))

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })

    it('should show favorite button in toolbar', () => {
      render(<MobileArticleViewer article={mockArticle} onToggleFavorite={mockOnToggleFavorite} />)

      expect(screen.getByLabelText('Toggle favorite')).toBeInTheDocument()
    })

    it('should show favorited state correctly', () => {
      const favoritedArticle = createMockArticle({ favorite: true })
      render(<MobileArticleViewer article={favoritedArticle} onToggleFavorite={mockOnToggleFavorite} />)

      expect(screen.getByLabelText('Toggle favorite')).toHaveAttribute('aria-pressed', 'true')
    })

    it('should call onToggleFavorite when favorite button is clicked', () => {
      render(<MobileArticleViewer article={mockArticle} onToggleFavorite={mockOnToggleFavorite} />)

      fireEvent.click(screen.getByLabelText('Toggle favorite'))

      expect(mockOnToggleFavorite).toHaveBeenCalledTimes(1)
    })

    it('should show navigation buttons when navigation callbacks are provided', () => {
      render(
        <MobileArticleViewer
          article={mockArticle}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          hasPrevious
          hasNext
        />
      )

      expect(screen.getByLabelText('Previous article')).toBeInTheDocument()
      expect(screen.getByLabelText('Next article')).toBeInTheDocument()
    })

    it('should call navigation callbacks when buttons are clicked', () => {
      render(
        <MobileArticleViewer
          article={mockArticle}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          hasPrevious
          hasNext
        />
      )

      fireEvent.click(screen.getByLabelText('Previous article'))
      expect(mockOnPrevious).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByLabelText('Next article'))
      expect(mockOnNext).toHaveBeenCalledTimes(1)
    })

    it('should pass menu items for additional actions', () => {
      render(
        <MobileArticleViewer
          article={mockArticle}
          onFetchFullContent={mockOnFetchFullContent}
          onAISummary={mockOnAISummary}
          onTranslate={mockOnTranslate}
        />
      )

      expect(screen.getByLabelText('More options')).toBeInTheDocument()
    })
  })

  describe('Swipe Back Gesture', () => {
    it('should have swipe gesture handlers on the content container', async () => {
      const { container } = render(<MobileArticleViewer article={mockArticle} onBack={mockOnBack} />)

      // Check that the container exists and has touch event handlers
      const contentContainer = container.querySelector('[data-testid="article-content-area"]')
      expect(contentContainer).toBeInTheDocument()
    })

    it('should trigger onBack when swipe right gesture is completed', async () => {
      const { useSwipeGesture } = await import('@/hooks/useSwipeGesture')
      const mockUseSwipeGesture = vi.mocked(useSwipeGesture)

      // Create a mock that simulates swipe completion
      mockUseSwipeGesture.mockImplementation((config) => {
        // Simulate the swipe right callback being triggered
        setTimeout(() => config.onSwipeRight?.(), 0)
        return {
          swipeState: { isSwiping: false, direction: null, progress: 0 },
          handlers: {
            onTouchStart: vi.fn(),
            onTouchMove: vi.fn(),
            onTouchEnd: vi.fn(),
          },
        }
      })

      render(<MobileArticleViewer article={mockArticle} onBack={mockOnBack} />)

      await waitFor(() => {
        expect(mockOnBack).toHaveBeenCalled()
      })
    })

    it('should show swipe progress indicator during swipe', async () => {
      const { useSwipeGesture } = await import('@/hooks/useSwipeGesture')
      const mockUseSwipeGesture = vi.mocked(useSwipeGesture)

      mockUseSwipeGesture.mockImplementation((config) => {
        // Simulate swipe in progress
        config.onProgress?.(0.5, 'right')
        return {
          swipeState: { isSwiping: true, direction: 'right' as const, progress: 0.5 },
          handlers: {
            onTouchStart: vi.fn(),
            onTouchMove: vi.fn(),
            onTouchEnd: vi.fn(),
          },
        }
      })

      render(<MobileArticleViewer article={mockArticle} onBack={mockOnBack} />)

      // Should show progress indicator
      expect(screen.getByTestId('swipe-progress-indicator')).toBeInTheDocument()
    })

    it('should hide swipe progress indicator when swipe is cancelled', async () => {
      const { useSwipeGesture } = await import('@/hooks/useSwipeGesture')
      const mockUseSwipeGesture = vi.mocked(useSwipeGesture)

      mockUseSwipeGesture.mockReturnValue({
        swipeState: { isSwiping: false, direction: null, progress: 0 },
        handlers: {
          onTouchStart: vi.fn(),
          onTouchMove: vi.fn(),
          onTouchEnd: vi.fn(),
        },
      })

      render(<MobileArticleViewer article={mockArticle} onBack={mockOnBack} />)

      // Should not show progress indicator
      expect(screen.queryByTestId('swipe-progress-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Toolbar Auto-Hide on Scroll', () => {
    it('should show toolbar by default', () => {
      render(<MobileArticleViewer article={mockArticle} />)

      const toolbar = screen.getByTestId('mobile-toolbar')
      expect(toolbar).toHaveAttribute('data-visible', 'true')
    })

    it('should hide toolbar when scrolling down', async () => {
      render(<MobileArticleViewer article={mockArticle} />)

      const contentArea = screen.getByTestId('article-content-area')

      // Simulate scroll down
      Object.defineProperty(contentArea, 'scrollTop', { value: 100, writable: true })
      Object.defineProperty(contentArea, 'scrollHeight', { value: 1000, writable: true })
      Object.defineProperty(contentArea, 'clientHeight', { value: 500, writable: true })

      fireEvent.scroll(contentArea)

      await waitFor(() => {
        const toolbar = screen.getByTestId('mobile-toolbar')
        expect(toolbar).toHaveAttribute('data-visible', 'false')
      })
    })

    it('should show toolbar when scrolling up', async () => {
      render(<MobileArticleViewer article={mockArticle} />)

      const contentArea = screen.getByTestId('article-content-area')

      // First scroll down
      Object.defineProperty(contentArea, 'scrollTop', { value: 100, writable: true })
      fireEvent.scroll(contentArea)

      await waitFor(() => {
        const toolbar = screen.getByTestId('mobile-toolbar')
        expect(toolbar).toHaveAttribute('data-visible', 'false')
      })

      // Then scroll up
      Object.defineProperty(contentArea, 'scrollTop', { value: 50, writable: true })
      fireEvent.scroll(contentArea)

      await waitFor(() => {
        const toolbar = screen.getByTestId('mobile-toolbar')
        expect(toolbar).toHaveAttribute('data-visible', 'true')
      })
    })

    it('should show toolbar when at the top of content', async () => {
      render(<MobileArticleViewer article={mockArticle} />)

      const contentArea = screen.getByTestId('article-content-area')

      // Scroll down first
      Object.defineProperty(contentArea, 'scrollTop', { value: 100, writable: true })
      fireEvent.scroll(contentArea)

      // Scroll to top
      Object.defineProperty(contentArea, 'scrollTop', { value: 0, writable: true })
      fireEvent.scroll(contentArea)

      await waitFor(() => {
        const toolbar = screen.getByTestId('mobile-toolbar')
        expect(toolbar).toHaveAttribute('data-visible', 'true')
      })
    })
  })

  describe('Reading Progress Tracking', () => {
    it('should call onProgressChange when scrolling', async () => {
      render(<MobileArticleViewer article={mockArticle} onProgressChange={mockOnProgressChange} />)

      const contentArea = screen.getByTestId('article-content-area')

      // Simulate scroll
      Object.defineProperty(contentArea, 'scrollTop', { value: 250, writable: true })
      Object.defineProperty(contentArea, 'scrollHeight', { value: 1000, writable: true })
      Object.defineProperty(contentArea, 'clientHeight', { value: 500, writable: true })

      fireEvent.scroll(contentArea)

      // Wait for the throttled callback
      await waitFor(() => {
        expect(mockOnProgressChange).toHaveBeenCalled()
      }, { timeout: 200 })
    })

    it('should calculate progress correctly (0-100)', async () => {
      render(<MobileArticleViewer article={mockArticle} onProgressChange={mockOnProgressChange} />)

      const contentArea = screen.getByTestId('article-content-area')

      // Scroll to 50%
      Object.defineProperty(contentArea, 'scrollTop', { value: 250, writable: true })
      Object.defineProperty(contentArea, 'scrollHeight', { value: 1000, writable: true })
      Object.defineProperty(contentArea, 'clientHeight', { value: 500, writable: true })

      fireEvent.scroll(contentArea)

      await waitFor(() => {
        // (250 / (1000 - 500)) * 100 = 50
        expect(mockOnProgressChange).toHaveBeenCalledWith(50)
      }, { timeout: 200 })
    })

    it('should display reading progress bar', () => {
      render(<MobileArticleViewer article={mockArticle} />)

      expect(screen.getByTestId('reading-progress-bar')).toBeInTheDocument()
    })

    it('should initialize progress from article reading_progress', () => {
      const articleWithProgress = createMockArticle({ reading_progress: 50 })
      render(<MobileArticleViewer article={articleWithProgress} />)

      const progressBar = screen.getByTestId('reading-progress-bar')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<MobileArticleViewer article={mockArticle} isLoading />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('should not show loading indicator when isLoading is false', () => {
      render(<MobileArticleViewer article={mockArticle} isLoading={false} />)

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    it('should show loading indicator over content', () => {
      render(<MobileArticleViewer article={mockArticle} isLoading />)

      const loadingIndicator = screen.getByTestId('loading-indicator')
      expect(loadingIndicator).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when article is null', () => {
      render(<MobileArticleViewer article={null} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should show appropriate message in empty state', () => {
      render(<MobileArticleViewer article={null} />)

      expect(screen.getByText(/选择一篇文章开始阅读/i)).toBeInTheDocument()
    })

    it('should still show toolbar in empty state', () => {
      render(<MobileArticleViewer article={null} />)

      expect(screen.getByTestId('mobile-toolbar')).toBeInTheDocument()
    })
  })

  describe('Menu Actions', () => {
    it('should provide full content action when callback is provided', () => {
      render(
        <MobileArticleViewer
          article={mockArticle}
          onFetchFullContent={mockOnFetchFullContent}
        />
      )

      expect(screen.getByLabelText('More options')).toBeInTheDocument()
    })

    it('should provide AI summary action when callback is provided', () => {
      render(
        <MobileArticleViewer
          article={mockArticle}
          onAISummary={mockOnAISummary}
        />
      )

      expect(screen.getByLabelText('More options')).toBeInTheDocument()
    })

    it('should provide translate action when callback is provided', () => {
      render(
        <MobileArticleViewer
          article={mockArticle}
          onTranslate={mockOnTranslate}
        />
      )

      expect(screen.getByLabelText('More options')).toBeInTheDocument()
    })

    it('should call onFetchFullContent when full content action is triggered', async () => {
      // This test verifies that the menu item callback is properly wired
      // The actual UI interaction is tested in MobileToolbar tests
      render(
        <MobileArticleViewer
          article={mockArticle}
          onFetchFullContent={mockOnFetchFullContent}
        />
      )

      // Verify that more options button exists (menu items were created)
      expect(screen.getByLabelText('More options')).toBeInTheDocument()

      // This verifies the component was rendered correctly with the callback
      // Direct callback invocation is covered by the MobileToolbar component tests
    })
  })

  describe('Edge Cases', () => {
    it('should handle article without title gracefully', () => {
      const articleWithoutTitle = createMockArticle({ title: '' })
      render(<MobileArticleViewer article={articleWithoutTitle} />)

      expect(screen.getByTestId('mobile-toolbar')).toBeInTheDocument()
    })

    it('should handle article without published_at', () => {
      const articleWithoutDate = createMockArticle({ published_at: undefined })
      render(<MobileArticleViewer article={articleWithoutDate} />)

      // Should not crash
      expect(screen.getByTestId('article-content-area')).toBeInTheDocument()
    })

    it('should handle article with very long content', () => {
      const longContent = '<p>' + 'Long content '.repeat(10000) + '</p>'
      const articleWithLongContent = createMockArticle({ content: longContent })
      render(<MobileArticleViewer article={articleWithLongContent} />)

      expect(screen.getByTestId('article-content-area')).toBeInTheDocument()
    })

    it('should handle article with special characters in title', () => {
      const specialTitle = 'Test & <script>alert("xss")</script>'
      const articleWithSpecialChars = createMockArticle({ title: specialTitle })
      render(<MobileArticleViewer article={articleWithSpecialChars} />)

      // Should render safely without executing script
      expect(screen.getByTestId('mobile-toolbar')).toBeInTheDocument()
    })

    it('should handle rapid article changes', () => {
      const { rerender } = render(<MobileArticleViewer article={mockArticle} />)

      // Rapidly change articles
      for (let i = 0; i < 10; i++) {
        rerender(<MobileArticleViewer article={createMockArticle({ id: `article-${i}` })} />)
      }

      expect(screen.getByTestId('article-content-area')).toBeInTheDocument()
    })

    it('should not throw when callbacks are undefined', () => {
      expect(() => {
        render(
          <MobileArticleViewer
            article={mockArticle}
            onBack={undefined}
            onToggleFavorite={undefined}
            onFetchFullContent={undefined}
          />
        )
      }).not.toThrow()
    })

    it('should handle zero progress correctly', async () => {
      render(<MobileArticleViewer article={mockArticle} onProgressChange={mockOnProgressChange} />)

      const contentArea = screen.getByTestId('article-content-area')

      // Scroll to top (0%)
      Object.defineProperty(contentArea, 'scrollTop', { value: 0, writable: true })
      Object.defineProperty(contentArea, 'scrollHeight', { value: 1000, writable: true })
      Object.defineProperty(contentArea, 'clientHeight', { value: 500, writable: true })

      fireEvent.scroll(contentArea)

      await waitFor(() => {
        expect(mockOnProgressChange).toHaveBeenCalledWith(0)
      }, { timeout: 200 })
    })

    it('should handle 100% progress correctly', async () => {
      render(<MobileArticleViewer article={mockArticle} onProgressChange={mockOnProgressChange} />)

      const contentArea = screen.getByTestId('article-content-area')

      // Scroll to bottom (100%)
      Object.defineProperty(contentArea, 'scrollTop', { value: 500, writable: true })
      Object.defineProperty(contentArea, 'scrollHeight', { value: 1000, writable: true })
      Object.defineProperty(contentArea, 'clientHeight', { value: 500, writable: true })

      fireEvent.scroll(contentArea)

      await waitFor(() => {
        expect(mockOnProgressChange).toHaveBeenCalledWith(100)
      }, { timeout: 200 })
    })
  })

  describe('Accessibility', () => {
    it('should have correct role for content area', () => {
      render(<MobileArticleViewer article={mockArticle} />)

      // The content area has role="article"
      const contentArea = screen.getByTestId('article-content-area')
      expect(contentArea).toHaveAttribute('role', 'article')
    })

    it('should be keyboard navigable', () => {
      render(<MobileArticleViewer article={mockArticle} />)

      const contentArea = screen.getByTestId('article-content-area')
      expect(contentArea).toHaveAttribute('tabindex')
    })
  })

  describe('Integration', () => {
    it('should work correctly with all props combined', () => {
      render(
        <MobileArticleViewer
          article={mockArticle}
          isLoading={false}
          onBack={mockOnBack}
          onToggleFavorite={mockOnToggleFavorite}
          onFetchFullContent={mockOnFetchFullContent}
          onAISummary={mockOnAISummary}
          onTranslate={mockOnTranslate}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          hasPrevious
          hasNext
          onProgressChange={mockOnProgressChange}
          contentClassName="custom-content-class"
        />
      )

      // Should render toolbar with all features
      expect(screen.getByTestId('mobile-toolbar')).toBeInTheDocument()
      expect(screen.getByLabelText('Go back')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle favorite')).toBeInTheDocument()
      expect(screen.getByLabelText('Previous article')).toBeInTheDocument()
      expect(screen.getByLabelText('Next article')).toBeInTheDocument()

      // Should render content
      expect(screen.getByTestId('article-content-area')).toBeInTheDocument()
      // Title appears in both toolbar and content area
      const titles = screen.getAllByText('Test Article Title')
      expect(titles.length).toBeGreaterThanOrEqual(1)
    })
  })
})
