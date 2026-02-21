import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import type { Feed } from '@/types'
import { RefreshCw, Plus, Inbox, Loader2, Rss } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MobileFeedListProps {
  /** 订阅列表 */
  feeds: Feed[]
  /** 当前选中的订阅 ID */
  selectedFeedId?: string | null
  /** 订阅点击回调 */
  onFeedClick?: (feed: Feed) => void
  /** 刷新回调 */
  onRefresh?: () => Promise<void>
  /** 是否正在刷新 */
  isRefreshing?: boolean
  /** 添加订阅回调 */
  onAddFeed?: () => void
  /** 未读计数 */
  unreadCounts?: Record<string, number>
  /** 加载状态 */
  isLoading?: boolean
  /** 空状态提示 */
  emptyMessage?: string
  /** 自定义类名 */
  className?: string
}

/** 格式化未读计数 */
function formatUnreadCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

/** 工具栏组件 */
function Toolbar({ onAddFeed }: { onAddFeed?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h1 className="text-xl font-bold">订阅</h1>
      <button
        className="p-2 rounded-full hover:bg-accent"
        onClick={onAddFeed}
        aria-label="添加订阅"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  )
}

/** 下拉刷新指示器 */
function PullIndicator({
  isPulling,
  distance,
  progress,
  canRefresh,
}: {
  isPulling: boolean
  distance: number
  progress: number
  canRefresh: boolean
}) {
  if (!isPulling) return null

  return (
    <div
      className="flex items-center justify-center py-2 text-muted-foreground"
      data-testid="pull-indicator"
      style={{
        transform: `translateY(${distance / 2}px)`,
        opacity: progress,
      }}
    >
      <RefreshCw className={cn('w-5 h-5', canRefresh && 'animate-spin')} />
      <span className="ml-2 text-sm">
        {canRefresh ? '松开刷新' : '下拉刷新'}
      </span>
    </div>
  )
}

/** 刷新中指示器 */
function RefreshingIndicator({ show }: { show: boolean }) {
  if (!show) return null

  return (
    <div
      className="flex items-center justify-center py-2 text-muted-foreground"
      data-testid="refreshing-indicator"
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="ml-2 text-sm">刷新中...</span>
    </div>
  )
}

/** 订阅图标 */
function FeedIcon({ feed }: { feed: Feed }) {
  if (feed.icon_url) {
    return (
      <img
        src={feed.icon_url}
        alt={feed.title}
        className="w-6 h-6 rounded object-cover"
      />
    )
  }
  return <Rss className="w-5 h-5 text-muted-foreground" data-testid="rss-icon" />
}

/** 订阅列表项 */
function FeedItem({
  feed,
  isSelected,
  unreadCount,
  onClick,
}: {
  feed: Feed
  isSelected: boolean
  unreadCount?: number
  onClick?: () => void
}) {
  return (
    <li
      data-testid={`feed-item-${feed.id}`}
      data-selected={isSelected}
      aria-label={feed.title || '未命名订阅'}
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary/10 border-l-4 border-l-primary'
          : 'hover:bg-accent'
      )}
      onClick={onClick}
    >
      {/* 订阅图标 */}
      <div
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted"
        data-testid={`feed-icon-${feed.id}`}
      >
        <FeedIcon feed={feed} />
      </div>

      {/* 订阅标题 */}
      <span className="flex-1 truncate">{feed.title || '未命名订阅'}</span>

      {/* 未读计数 */}
      {unreadCount !== undefined && unreadCount > 0 && (
        <span
          className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-primary text-primary-foreground text-xs rounded-full"
          data-testid={`unread-count-${feed.id}`}
        >
          {formatUnreadCount(unreadCount)}
        </span>
      )}
    </li>
  )
}

/** 加载状态 */
function LoadingState() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      data-testid="loading-indicator"
    >
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )
}

/** 空状态 */
function EmptyState({
  message,
  onAddFeed,
}: {
  message: string
  onAddFeed?: () => void
}) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8"
      data-testid="empty-state"
    >
      <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
      <p className="text-muted-foreground text-center">{message}</p>
      {onAddFeed && (
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
          onClick={onAddFeed}
          aria-label="添加订阅"
        >
          <Plus className="w-4 h-4" />
          添加订阅
        </button>
      )}
    </div>
  )
}

export function MobileFeedList({
  feeds,
  selectedFeedId,
  onFeedClick,
  onRefresh,
  isRefreshing = false,
  onAddFeed,
  unreadCounts,
  isLoading = false,
  emptyMessage = '暂无订阅',
  className,
}: MobileFeedListProps) {
  const { pullState, handlers } = usePullToRefresh({
    onRefresh: onRefresh || (async () => {}),
  })

  const showRefreshing = isRefreshing || pullState.isRefreshing

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <Toolbar onAddFeed={onAddFeed} />
        <LoadingState />
      </div>
    )
  }

  // 渲染空状态
  if (feeds.length === 0) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <Toolbar onAddFeed={onAddFeed} />
        <EmptyState message={emptyMessage} onAddFeed={onAddFeed} />
      </div>
    )
  }

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      data-testid="feed-list-container"
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
    >
      <Toolbar onAddFeed={onAddFeed} />

      <PullIndicator
        isPulling={pullState.isPulling}
        distance={pullState.distance}
        progress={pullState.progress}
        canRefresh={pullState.canRefresh}
      />

      <RefreshingIndicator show={showRefreshing} />

      {/* 订阅列表 */}
      <ul
        className="flex-1 overflow-y-auto"
        role="list"
        aria-label="订阅列表"
        data-testid="feed-list"
        data-scroll-container
      >
        {feeds.map((feed) => (
          <FeedItem
            key={feed.id}
            feed={feed}
            isSelected={feed.id === selectedFeedId}
            unreadCount={unreadCounts?.[feed.id]}
            onClick={() => onFeedClick?.(feed)}
          />
        ))}
      </ul>
    </div>
  )
}
