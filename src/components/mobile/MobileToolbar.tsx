import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft,
  Star,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface MenuItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  disabled?: boolean
}

export interface MobileToolbarProps {
  /** Title to display */
  title?: string
  /** Whether to show back button */
  showBack?: boolean
  /** Callback when back button is clicked */
  onBack?: () => void
  /** Whether the item is favorited */
  isFavorited?: boolean
  /** Callback when favorite button is clicked */
  onToggleFavorite?: () => void
  /** Menu items for the more menu */
  menuItems?: MenuItem[]
  /** Callback for previous article */
  onPrevious?: () => void
  /** Callback for next article */
  onNext?: () => void
  /** Whether there is a previous article */
  hasPrevious?: boolean
  /** Whether there is a next article */
  hasNext?: boolean
  /** Whether the toolbar is visible (for scroll hide/show) */
  visible?: boolean
}

export function MobileToolbar({
  title,
  showBack = false,
  onBack,
  isFavorited = false,
  onToggleFavorite,
  menuItems,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  visible = true,
}: MobileToolbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)

  // Determine if bottom navigation should be shown
  const showBottomNav = onPrevious !== undefined || onNext !== undefined

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  // Close menu on Escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isMenuOpen])

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev)
  }, [])

  const handleMenuItemClick = useCallback((item: MenuItem) => {
    if (item.disabled) return
    item.onClick()
    setIsMenuOpen(false)
  }, [])

  const handleBackClick = useCallback(() => {
    onBack?.()
  }, [onBack])

  const handleFavoriteClick = useCallback(() => {
    onToggleFavorite?.()
  }, [onToggleFavorite])

  const handlePreviousClick = useCallback(() => {
    if (hasPrevious) {
      onPrevious?.()
    }
  }, [hasPrevious, onPrevious])

  const handleNextClick = useCallback(() => {
    if (hasNext) {
      onNext?.()
    }
  }, [hasNext, onNext])

  const hasMenuItems = menuItems && menuItems.length > 0

  return (
    <div
      role="toolbar"
      className={`
        fixed top-0 left-0 right-0 z-50
        bg-background border-b border-border
        transition-transform duration-300 ease-in-out
        ${visible ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      {/* Main Toolbar */}
      <div className="flex items-center justify-between h-14 px-2">
        {/* Left Section: Back Button */}
        <div className="flex items-center min-w-[40px]">
          {showBack && (
            <button
              onClick={handleBackClick}
              aria-label="Go back"
              className="p-2 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Center Section: Title */}
        <div className="flex-1 px-2 min-w-0">
          {title && (
            <h1 className="text-base font-medium truncate text-center">
              {title}
            </h1>
          )}
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1 min-w-[40px]">
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              aria-label="Toggle favorite"
              aria-pressed={isFavorited}
              className="p-2 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors"
            >
              <Star
                className={`w-5 h-5 ${
                  isFavorited ? 'fill-yellow-400 text-yellow-400' : ''
                }`}
              />
            </button>
          )}

          {hasMenuItems && (
            <div className="relative">
              <button
                ref={moreButtonRef}
                onClick={toggleMenu}
                aria-label="More options"
                aria-expanded={isMenuOpen}
                className="p-2 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-full mt-1 min-w-[160px] py-1 bg-popover border border-border rounded-lg shadow-lg"
                >
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleMenuItemClick(item)}
                      disabled={item.disabled}
                      aria-disabled={item.disabled}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-left text-sm
                        hover:bg-accent transition-colors
                        ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <div className="flex items-center justify-between h-12 px-4 border-t border-border">
          <button
            onClick={handlePreviousClick}
            disabled={!hasPrevious}
            aria-label="Previous article"
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
              transition-colors
              ${
                hasPrevious
                  ? 'hover:bg-accent active:bg-accent/80'
                  : 'opacity-50 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNextClick}
            disabled={!hasNext}
            aria-label="Next article"
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
              transition-colors
              ${
                hasNext
                  ? 'hover:bg-accent active:bg-accent/80'
                  : 'opacity-50 cursor-not-allowed'
              }
            `}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
