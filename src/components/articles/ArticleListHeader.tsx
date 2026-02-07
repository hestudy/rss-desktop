import { RefreshCw, Filter, CheckCheck } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'

export interface ArticleListHeaderProps {
  /** Header title */
  title: string
  /** Unread article count */
  unreadCount?: number
  /** Refresh callback */
  onRefresh: () => void
  /** Filter callback */
  onFilter?: () => void
  /** Mark all as read callback */
  onMarkAllRead: () => void
  /** Whether refresh is in progress */
  isRefreshing?: boolean
  /** Whether filter is active */
  isFilterActive?: boolean
  /** Hide filter button */
  hideFilter?: boolean
  /** Hide mark all read button */
  hideMarkAllRead?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ArticleListHeader({
  title,
  unreadCount,
  onRefresh,
  onFilter,
  onMarkAllRead,
  isRefreshing = false,
  isFilterActive = false,
  hideFilter = false,
  hideMarkAllRead = false,
  className,
}: ArticleListHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-border bg-card',
        className
      )}
    >
      {/* Title and count */}
      <div className="flex items-center gap-2">
        <h2 role="heading" className="font-semibold text-foreground">
          {title}
        </h2>
        {unreadCount !== undefined && unreadCount > 0 && (
          <Badge count={unreadCount} size="sm" variant="default" />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
          className={cn(
            'p-2 rounded-lg transition-colors',
            'hover:bg-accent text-muted-foreground hover:text-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <RefreshCw
            className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
          />
        </button>

        {/* Filter button */}
        {!hideFilter && onFilter && (
          <button
            type="button"
            onClick={onFilter}
            aria-label="Filter"
            className={cn(
              'p-2 rounded-lg transition-colors',
              'hover:bg-accent hover:text-foreground',
              isFilterActive
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
        )}

        {/* Mark all as read button */}
        {!hideMarkAllRead && (
          <button
            type="button"
            onClick={onMarkAllRead}
            aria-label="Mark all as read"
            className={cn(
              'p-2 rounded-lg transition-colors',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <CheckCheck className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
