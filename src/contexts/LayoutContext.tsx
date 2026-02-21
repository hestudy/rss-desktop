import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { isMobile } from '@/lib/platform'

/**
 * Mobile view types for single-column layout navigation
 */
export type MobileView =
  | 'feed-list'       // Feed subscription list
  | 'article-list'    // Article list
  | 'article-reader'  // Article reader
  | 'discover'        // Discover new feeds
  | 'settings'        // Settings page

/**
 * Maximum number of entries in navigation history
 */
const MAX_HISTORY_SIZE = 10

export interface LayoutContextType {
  // Layout mode
  isMobileLayout: boolean

  // Mobile view state
  mobileView: MobileView
  setMobileView: (view: MobileView) => void

  // Drawer navigation
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void

  // Navigation history (for back navigation)
  canGoBack: boolean
  goBack: () => void
  navigationHistory: MobileView[]

  // Convenience methods
  navigateToFeedList: () => void
  navigateToArticleList: (feedId?: string) => void
  navigateToReader: (articleId: string) => void
  navigateToDiscover: () => void
  navigateToSettings: () => void

  // Enhanced features
  isToolbarVisible: boolean
  toggleToolbar: () => void
  setToolbarVisible: (visible: boolean) => void
  previousView: MobileView | null
  isReading: boolean
  currentArticleId: string | null
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return context
}

interface LayoutProviderProps {
  children: ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  // Layout mode based on platform detection
  const [isMobileLayout] = useState(() => isMobile())

  // Current mobile view
  const [mobileView, setMobileViewState] = useState<MobileView>('feed-list')

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Navigation history
  const [navigationHistory, setNavigationHistory] = useState<MobileView[]>(['feed-list'])

  // Enhanced features - Toolbar visibility
  const [isToolbarVisible, setIsToolbarVisible] = useState(false)

  // Enhanced features - Reading state
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null)

  /**
   * Navigate to a new view and update history
   */
  const setMobileView = useCallback((view: MobileView) => {
    setMobileViewState(view)
    setNavigationHistory(prev => {
      // Limit history size
      const newHistory = [...prev, view]
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE)
      }
      return newHistory
    })
    // Close drawer when navigating
    setIsDrawerOpen(false)
    // Clear reading state when navigating away from reader
    if (view !== 'article-reader') {
      setCurrentArticleId(null)
    }
  }, [])

  /**
   * Go back to previous view
   */
  const goBack = useCallback(() => {
    setNavigationHistory(prev => {
      if (prev.length <= 1) {
        return prev
      }
      const newHistory = prev.slice(0, -1)
      const previousViewFromHistory = newHistory[newHistory.length - 1]
      setMobileViewState(previousViewFromHistory)
      // Clear reading state when going back
      setCurrentArticleId(null)
      return newHistory
    })
  }, [])

  /**
   * Check if can go back
   */
  const canGoBack = navigationHistory.length > 1

  /**
   * Get previous view (for UI transitions and back navigation)
   */
  const previousView: MobileView | null = navigationHistory.length > 1
    ? navigationHistory[navigationHistory.length - 2]
    : null

  /**
   * Check if currently reading an article
   */
  const isReading = mobileView === 'article-reader'

  /**
   * Toolbar controls
   */
  const toggleToolbar = useCallback(() => {
    setIsToolbarVisible(prev => !prev)
  }, [])

  const setToolbarVisible = useCallback((visible: boolean) => {
    setIsToolbarVisible(visible)
  }, [])

  /**
   * Drawer controls
   */
  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
  }, [])

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prev => !prev)
  }, [])

  /**
   * Convenience navigation methods
   */
  const navigateToFeedList = useCallback(() => {
    setMobileView('feed-list')
  }, [setMobileView])

  const navigateToArticleList = useCallback((_feedId?: string) => {
    setMobileView('article-list')
  }, [setMobileView])

  const navigateToReader = useCallback((articleId: string) => {
    setMobileView('article-reader')
    setCurrentArticleId(articleId)
  }, [setMobileView])

  const navigateToDiscover = useCallback(() => {
    setMobileView('discover')
  }, [setMobileView])

  const navigateToSettings = useCallback(() => {
    setMobileView('settings')
  }, [setMobileView])

  const value: LayoutContextType = {
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
    // Enhanced features
    isToolbarVisible,
    toggleToolbar,
    setToolbarVisible,
    previousView,
    isReading,
    currentArticleId,
  }

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}
