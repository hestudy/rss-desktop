import { Rss, Compass, Settings } from 'lucide-react'
import { useLayout, MobileView } from '@/contexts/LayoutContext'

/**
 * Navigation item configuration
 */
interface NavItem {
  id: MobileView | 'feeds'
  label: string
  icon: React.ElementType
  view: MobileView
  relatedViews: MobileView[]
}

/**
 * Navigation items configuration
 * Each item has a primary view and related views that should also highlight it
 */
const NAV_ITEMS: NavItem[] = [
  {
    id: 'feeds',
    label: '订阅',
    icon: Rss,
    view: 'feed-list',
    relatedViews: ['feed-list', 'article-list', 'article-reader'],
  },
  {
    id: 'discover',
    label: '发现',
    icon: Compass,
    view: 'discover',
    relatedViews: ['discover'],
  },
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
    view: 'settings',
    relatedViews: ['settings'],
  },
]

/**
 * Format unread count for display
 * Returns "99+" for counts over 99
 */
function formatUnreadCount(count: number): string {
  if (count > 99) {
    return '99+'
  }
  return String(count)
}

/**
 * BottomNavigationBar Component Props
 */
export interface BottomNavigationBarProps {
  /**
   * Controls visibility of the navigation bar
   * Useful for hiding in reader mode
   * @default true
   */
  visible?: boolean

  /**
   * Number of unread articles to display as badge
   * Only shown on the feeds tab
   * @default undefined (no badge)
   */
  unreadCount?: number
}

/**
 * BottomNavigationBar Component
 *
 * A mobile-friendly bottom navigation bar that provides quick access to
 * the main sections of the app: Feeds, Discover, and Settings.
 *
 * Features:
 * - Highlights current view
 * - Touch-friendly targets (44x44 minimum)
 * - Safe area inset support for notched devices
 * - Accessible with proper ARIA attributes
 * - Optional visibility control for reader mode
 * - Unread count badge on feeds tab
 */
export function BottomNavigationBar({
  visible = true,
  unreadCount,
}: BottomNavigationBarProps) {
  const { mobileView, navigateToFeedList, navigateToDiscover, navigateToSettings } = useLayout()

  // Navigation handlers mapped to nav items
  const navigationHandlers: Record<string, () => void> = {
    feeds: navigateToFeedList,
    discover: navigateToDiscover,
    settings: navigateToSettings,
  }

  /**
   * Check if a nav item should be highlighted
   */
  const isActive = (item: NavItem): boolean => {
    return item.relatedViews.includes(mobileView)
  }

  /**
   * Check if badge should be shown
   * Only show on feeds tab when unreadCount > 0
   */
  const shouldShowBadge = unreadCount !== undefined && unreadCount > 0

  return (
    <nav
      className={`flex items-center justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom)] ${!visible ? 'hidden' : ''}`}
      aria-label="主导航"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isActive(item)
        const handleNavigate = navigationHandlers[item.id]
        const showBadge = shouldShowBadge && item.id === 'feeds'

        return (
          <button
            key={item.id}
            onClick={handleNavigate}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            className={`
              relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1
              px-2 py-2 transition-colors
              ${active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs">{item.label}</span>
            {showBadge && (
              <span
                className="absolute right-1/4 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
                aria-label={`${formatUnreadCount(unreadCount as number)} 条未读`}
              >
                {formatUnreadCount(unreadCount as number)}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
