import { memo } from 'react'
import { Star, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import type { Article } from '@/types'

export interface MobileArticleCardProps {
  /** 文章数据 */
  article: Article
  /** 点击回调 */
  onClick?: () => void
  /** 是否已读 */
  isRead?: boolean
  /** 标记已读回调 */
  onMarkRead?: () => void
  /** 是否已收藏 */
  isFavorited?: boolean
  /** 收藏回调 */
  onToggleFavorite?: () => void
  /** 是否显示缩略图 */
  showThumbnail?: boolean
  /** 是否已选中 */
  isSelected?: boolean
  /** 自定义类名 */
  className?: string
}

const SWIPE_THRESHOLD = 100

export const MobileArticleCard = memo(function MobileArticleCard({
  article,
  onClick,
  isRead = article.read,
  onMarkRead,
  isFavorited = article.favorite ?? false,
  onToggleFavorite,
  showThumbnail = true,
  isSelected = false,
  className,
}: MobileArticleCardProps) {
  const { swipeState, handlers } = useSwipeGesture({
    threshold: SWIPE_THRESHOLD,
    onSwipeLeft: () => {
      // 左滑时可以执行动作
    },
  })

  // Format date, handle invalid dates
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: zhCN,
      })
    } catch {
      return ''
    }
  }

  const handleClick = () => {
    onClick?.()
  }

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkRead?.()
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.()
  }

  const showSwipeActions = swipeState.direction === 'left' && swipeState.progress > 0.3
  const translateX = swipeState.direction === 'left' ? -swipeState.progress * 80 : 0

  return (
    <div className="relative overflow-hidden">
      {/* Background actions (revealed on swipe) */}
      <div
        data-testid="swipe-actions"
        className={cn(
          'absolute inset-y-0 right-0 flex items-center gap-1 pr-2',
          'transition-opacity duration-200',
          showSwipeActions ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Toggle Favorite Button */}
        <button
          type="button"
          data-testid="toggle-favorite-button"
          onClick={handleToggleFavorite}
          aria-label={isFavorited ? '取消收藏' : '收藏'}
          className={cn(
            'flex items-center justify-center w-12 h-full',
            'bg-warning text-warning-foreground',
            'transition-all duration-150'
          )}
        >
          <Star
            className={cn('w-5 h-5', isFavorited && 'fill-current')}
          />
        </button>

        {/* Mark Read Button */}
        {!isRead && (
          <button
            type="button"
            data-testid="mark-read-button"
            onClick={handleMarkRead}
            aria-label="标记已读"
            className={cn(
              'flex items-center justify-center w-12 h-full',
              'bg-primary text-primary-foreground',
              'transition-all duration-150'
            )}
          >
            <Check className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main card content */}
      <article
        role="article"
        aria-label={article.title || ''}
        data-read={isRead ? 'true' : 'false'}
        data-testid="mobile-article-card"
        data-touch-enabled="true"
        onClick={handleClick}
        className={cn(
          'relative flex items-start gap-3 p-3',
          'border-b border-border/50',
          'bg-background transition-all duration-200',
          'cursor-pointer active:scale-[0.98]',
          isRead && 'opacity-60',
          isSelected && 'bg-accent border-l-2 border-l-primary',
          className
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        {...handlers}
      >
        {/* Unread indicator */}
        {!isRead && (
          <div
            data-testid="unread-indicator"
            className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary"
          />
        )}

        {/* Thumbnail */}
        {showThumbnail && article.thumbnail_url && (
          <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted">
            <img
              data-testid="article-thumbnail"
              src={article.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={cn(
              'mb-1 line-clamp-2 leading-snug text-sm',
              isRead ? 'font-normal text-muted-foreground' : 'font-medium text-foreground'
            )}
          >
            {article.title}
          </h3>

          {/* Description */}
          {article.description && (
            <p
              className={cn(
                'mb-1 text-xs line-clamp-2',
                isRead ? 'text-muted-foreground/80' : 'text-muted-foreground'
              )}
            >
              {article.description}
            </p>
          )}

          {/* Meta info: time */}
          {article.published_at && (
            <div
              data-testid="article-time"
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <span>{formatDate(article.published_at)}</span>
            </div>
          )}

          {/* Favorite indicator */}
          {isFavorited && (
            <Star
              data-testid="favorite-indicator"
              className="w-3 h-3 text-warning fill-warning mt-1"
            />
          )}
        </div>
      </article>
    </div>
  )
}, (prev, next) => {
  // Custom comparison for memo
  return (
    prev.article.id === next.article.id &&
    prev.article.title === next.article.title &&
    prev.article.description === next.article.description &&
    prev.article.published_at === next.article.published_at &&
    prev.article.thumbnail_url === next.article.thumbnail_url &&
    prev.isRead === next.isRead &&
    prev.isFavorited === next.isFavorited &&
    prev.isSelected === next.isSelected &&
    prev.showThumbnail === next.showThumbnail &&
    prev.className === next.className
  )
})
