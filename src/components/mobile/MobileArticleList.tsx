import { useCallback, useMemo } from 'react'
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { MobileArticleCard } from './MobileArticleCard'
import type { Article } from '@/types'

export interface MobileArticleListProps {
  /** 文章列表 */
  articles: Article[]
  /** 当前选中的文章 ID */
  selectedArticleId?: string | null
  /** 文章点击回调 */
  onArticleClick?: (article: Article) => void
  /** 刷新回调 */
  onRefresh?: () => Promise<void>
  /** 是否正在刷新 */
  isRefreshing?: boolean
  /** 标记已读回调 */
  onMarkRead?: (articleId: string) => void
  /** 切换收藏回调 */
  onToggleFavorite?: (articleId: string) => void
  /** 是否显示缩略图 */
  showThumbnails?: boolean
  /** 加载状态 */
  isLoading?: boolean
  /** 空状态提示 */
  emptyMessage?: string
  /** 标题 */
  title?: string
  /** 返回按钮回调 */
  onBack?: () => void
  /** 自定义类名 */
  className?: string
}

export function MobileArticleList({
  articles,
  selectedArticleId,
  onArticleClick,
  onRefresh,
  isRefreshing = false,
  onMarkRead,
  onToggleFavorite,
  showThumbnails = true,
  isLoading = false,
  emptyMessage = '暂无文章',
  title,
  onBack,
  className,
}: MobileArticleListProps) {
  const { pullState, handlers } = usePullToRefresh({
    onRefresh: async () => {
      await onRefresh?.()
    },
  })

  const handleArticleClick = useCallback(
    (article: Article) => onArticleClick?.(article),
    [onArticleClick]
  )

  const handleMarkRead = useCallback(
    (articleId: string) => onMarkRead?.(articleId),
    [onMarkRead]
  )

  const handleToggleFavorite = useCallback(
    (articleId: string) => onToggleFavorite?.(articleId),
    [onToggleFavorite]
  )

  const handleRefreshClick = useCallback(
    async () => await onRefresh?.(),
    [onRefresh]
  )

  const handleBackClick = useCallback(
    () => onBack?.(),
    [onBack]
  )

  // Memoize visibility flags
  const visibilityFlags = useMemo(
    () => ({
      showPullIndicator: pullState.isPulling && pullState.progress > 0,
      showRefreshingIndicator: pullState.isRefreshing || isRefreshing,
      showLoading: isLoading && articles.length === 0,
      showEmpty: !isLoading && articles.length === 0,
    }),
    [pullState.isPulling, pullState.progress, pullState.isRefreshing, isRefreshing, isLoading, articles.length]
  )

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      data-testid="article-list-container"
    >
      {/* Toolbar */}
      <header className="sticky top-0 z-10 flex items-center h-14 px-2 bg-background border-b border-border">
        {/* Back button */}
        {onBack && (
          <button
            onClick={handleBackClick}
            aria-label="返回"
            className="p-2 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Title */}
        {title && (
          <h1 className="flex-1 px-2 text-base font-medium truncate text-center">
            {title}
          </h1>
        )}

        {/* Refresh button */}
        <button
          onClick={handleRefreshClick}
          disabled={visibilityFlags.showRefreshingIndicator}
          aria-label="刷新"
          className={cn(
            'p-2 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors',
            visibilityFlags.showRefreshingIndicator && 'opacity-50 cursor-not-allowed'
          )}
          data-testid="refresh-button"
        >
          <RefreshCw
            className={cn('w-5 h-5', visibilityFlags.showRefreshingIndicator && 'animate-spin')}
          />
        </button>
      </header>

      {/* Pull to refresh indicator */}
      {(visibilityFlags.showPullIndicator || visibilityFlags.showRefreshingIndicator) && (
        <div
          className="flex items-center justify-center py-2 bg-muted/50"
          data-testid={visibilityFlags.showRefreshingIndicator ? 'refreshing-indicator' : 'pull-indicator'}
          style={{
            height: visibilityFlags.showPullIndicator ? `${pullState.distance}px` : 'auto',
          }}
        >
          {visibilityFlags.showRefreshingIndicator ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <RefreshCw
              className={cn(
                'w-6 h-6 text-muted-foreground transition-transform',
                pullState.canRefresh && 'text-primary rotate-180'
              )}
            />
          )}
        </div>
      )}

      {/* Content area */}
      <div
        className="flex-1 overflow-y-auto"
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
      >
        {/* Loading state */}
        {visibilityFlags.showLoading && (
          <div
            className="flex items-center justify-center h-full"
            data-testid="loading-indicator"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {visibilityFlags.showEmpty && (
          <div
            className="flex items-center justify-center h-full text-muted-foreground"
            data-testid="empty-state"
          >
            <p>{emptyMessage}</p>
          </div>
        )}

        {/* Article list */}
        {!visibilityFlags.showLoading && articles.length > 0 && (
          <ul
            role="list"
            aria-label="文章列表"
            className="divide-y divide-border"
            data-testid="article-list"
          >
            {articles.map((article) => (
              <li key={article.id}>
                <MobileArticleCard
                  article={article}
                  onClick={() => handleArticleClick(article)}
                  isRead={article.read}
                  onMarkRead={onMarkRead ? () => handleMarkRead(article.id) : undefined}
                  isFavorited={article.favorite ?? false}
                  onToggleFavorite={onToggleFavorite ? () => handleToggleFavorite(article.id) : undefined}
                  showThumbnail={showThumbnails}
                  isSelected={article.id === selectedArticleId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
