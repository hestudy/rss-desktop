/**
 * 骨架屏加载组件
 * 用于内容加载时的占位显示
 */
import { cn } from '@/lib/utils'

export interface SkeletonLoaderProps {
  /** 骨架屏变体 */
  variant?: 'text' | 'card' | 'avatar' | 'thumbnail'
  /** 宽度 */
  width?: string | number
  /** 高度 */
  height?: string | number
  /** 渲染数量 */
  count?: number
  /** 自定义类名 */
  className?: string
}

/**
 * 基础骨架屏组件
 */
export function SkeletonLoader({
  variant = 'text',
  width,
  height,
  count = 1,
  className,
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count })

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 w-full rounded'
      case 'card':
        return 'h-24 w-full rounded-md'
      case 'avatar':
        return 'h-10 w-10 rounded-full'
      case 'thumbnail':
        return 'h-20 w-20 rounded-md'
      default:
        return 'h-4 w-full rounded'
    }
  }

  const getWidth = () => {
    if (width !== undefined) {
      return typeof width === 'number' ? `${width}px` : width
    }
    return undefined
  }

  const getHeight = () => {
    if (height !== undefined) {
      return typeof height === 'number' ? `${height}px` : height
    }
    return undefined
  }

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-muted animate-pulse',
            getVariantClasses(),
            className
          )}
          style={{
            width: getWidth(),
            height: getHeight(),
          }}
        />
      ))}
    </>
  )
}

/**
 * 文章卡片骨架屏
 */
export function ArticleCardSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-3 p-3 border-b border-border/50',
        className
      )}
    >
      {/* 缩略图 */}
      <SkeletonLoader variant="thumbnail" />

      {/* 内容区域 */}
      <div className="flex-1 space-y-2">
        {/* 标题 */}
        <SkeletonLoader variant="text" width="80%" />
        {/* 摘要 */}
        <SkeletonLoader variant="text" width="60%" height={12} />
        {/* 元信息 */}
        <SkeletonLoader variant="text" width="40%" height={10} />
      </div>
    </div>
  )
}

/**
 * 订阅项骨架屏
 */
export function FeedItemSkeleton({
  className,
  count = 1,
}: {
  className?: string
  count?: number
}) {
  const items = Array.from({ length: count })

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 px-4 py-3 border-b border-border/50',
            className
          )}
        >
          {/* 图标 */}
          <SkeletonLoader variant="avatar" />

          {/* 标题和未读计数 */}
          <div className="flex-1 flex items-center justify-between">
            <SkeletonLoader variant="text" width="60%" />
            <SkeletonLoader variant="text" width={30} height={20} />
          </div>
        </div>
      ))}
    </>
  )
}
