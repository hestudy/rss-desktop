import { ExternalLink, Star, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '../../lib/utils'

export interface ArticleCardProps {
  /** Article ID */
  id: string
  /** Article title */
  title: string
  /** Article description/summary */
  description?: string
  /** Feed name */
  feedName?: string
  /** Published date (ISO string) */
  publishedAt: string
  /** Thumbnail image URL */
  thumbnailUrl?: string
  /** Whether article has been read */
  isRead: boolean
  /** Whether article is currently selected */
  isSelected: boolean
  /** Whether article is favorited */
  isFavorite?: boolean
  /** Click handler */
  onClick: () => void
  /** Open in external browser handler */
  onOpenExternal: () => void
  /** Additional CSS classes */
  className?: string
}

export function ArticleCard({
  title,
  description,
  feedName,
  publishedAt,
  thumbnailUrl,
  isRead,
  isSelected,
  isFavorite = false,
  onClick,
  onOpenExternal,
  className,
}: ArticleCardProps) {
  // Format date, handle invalid dates
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'Invalid date'
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: zhCN,
      })
    } catch {
      return 'Invalid date'
    }
  }

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenExternal()
  }

  return (
    <article
      role="article"
      aria-label={title}
      data-testid="article-card"
      onClick={onClick}
      className={cn(
        'group relative px-4 py-3 border-b border-border/50 transition-all duration-200 cursor-pointer',
        isSelected
          ? 'bg-accent border-l-2 border-l-primary'
          : isRead
            ? 'bg-read-background opacity-80 hover:opacity-100 border-l-2 border-l-transparent'
            : 'hover:bg-accent/50 border-l-2 border-l-transparent',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        {!isRead && (
          <div
            data-testid="unread-indicator"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Meta info: feed name + time */}
          <div className="flex items-center gap-1.5 text-xs mb-1">
            {feedName && (
              <>
                <span
                  className={cn(
                    'truncate max-w-[120px]',
                    isRead ? 'text-read-foreground' : 'text-muted-foreground'
                  )}
                >
                  {feedName}
                </span>
                <span className={isRead ? 'text-read-foreground' : 'text-muted-foreground'}>
                  ·
                </span>
              </>
            )}
            <div
              data-testid="article-time"
              className={cn(
                'flex items-center gap-1',
                isRead ? 'text-read-foreground' : 'text-muted-foreground'
              )}
            >
              <Clock className="w-3 h-3" />
              <span>{formatDate(publishedAt)}</span>
            </div>
            {isFavorite && (
              <Star
                data-testid="favorite-indicator"
                className="w-3 h-3 text-warning fill-warning ml-1"
              />
            )}
          </div>

          {/* Title */}
          <h3
            className={cn(
              'mb-1 line-clamp-2 leading-snug text-sm',
              isRead
                ? 'text-read-foreground font-normal'
                : 'text-card-foreground font-medium'
            )}
          >
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p
              className={cn(
                'text-xs line-clamp-2',
                isRead ? 'text-read-foreground' : 'text-muted-foreground'
              )}
            >
              {description}
            </p>
          )}
        </div>

        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
            <img
              data-testid="article-thumbnail"
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* External link button */}
        <button
          type="button"
          onClick={handleExternalClick}
          aria-label="Open in browser"
          className={cn(
            'flex-shrink-0 p-1.5 rounded-md transition-all',
            'opacity-0 group-hover:opacity-100',
            'hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </article>
  )
}
