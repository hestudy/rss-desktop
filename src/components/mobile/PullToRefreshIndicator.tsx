/**
 * 下拉刷新指示器组件
 * 显示下拉刷新的视觉反馈
 */
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PullToRefreshIndicatorProps {
  /** 下拉距离（像素） */
  distance: number
  /** 下拉进度 (0-1+) */
  progress: number
  /** 是否正在刷新 */
  isRefreshing: boolean
  /** 是否可以刷新 */
  canRefresh: boolean
  /** 自定义类名 */
  className?: string
}

/** 最大显示高度 */
const MAX_HEIGHT = 80

/**
 * 下拉刷新指示器
 */
export function PullToRefreshIndicator({
  distance,
  progress,
  isRefreshing,
  canRefresh,
  className,
}: PullToRefreshIndicatorProps) {
  const height = Math.min(distance, MAX_HEIGHT)
  const rotation = isRefreshing ? 0 : progress * 360

  const getStatusText = () => {
    if (isRefreshing) return '刷新中...'
    if (canRefresh) return '松开刷新'
    return '下拉刷新'
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden',
        className
      )}
      style={{ height }}
      role="status"
      aria-live="polite"
      aria-busy={isRefreshing}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw
          className={cn(
            'w-5 h-5 text-primary',
            isRefreshing && 'animate-spin'
          )}
          style={!isRefreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
        />
        <span className="text-sm">{getStatusText()}</span>
      </div>
    </div>
  )
}
