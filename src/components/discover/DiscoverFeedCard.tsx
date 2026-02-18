import { useState } from 'react'
import { Button } from '../ui/Button'
import { Rss, Check, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { DiscoverFeed } from '../../types'

interface DiscoverFeedCardProps {
  feed: DiscoverFeed
  isAdded: boolean
  onAdd: (feed: DiscoverFeed) => Promise<void>
}

export function DiscoverFeedCard({ feed, isAdded, onAdd }: DiscoverFeedCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAdd = async () => {
    if (isAdded || isLoading) return
    setIsLoading(true)
    try {
      await onAdd(feed)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <article
      data-testid="discover-feed-card"
      className={cn(
        'group relative rounded-2xl border border-border/60 bg-card overflow-hidden',
        'transition-all duration-300 ease-out',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        'hover:-translate-y-0.5',
        isAdded && 'opacity-60 hover:opacity-80'
      )}
    >
      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* 图标 */}
          <div className="flex-shrink-0">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-primary/15 to-primary/5',
              'ring-1 ring-primary/10',
              'transition-transform duration-300 group-hover:scale-105'
            )}>
              {feed.icon ? (
                <img
                  src={feed.icon}
                  alt={feed.title}
                  className="w-7 h-7 rounded-md object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <Rss className={cn('w-6 h-6 text-primary', feed.icon ? 'hidden' : '')} />
            </div>
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            {/* 标题行 */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-200">
                {feed.title}
              </h3>

              {/* 添加按钮 */}
              <Button
                size="sm"
                variant={isAdded ? 'outline' : 'default'}
                onClick={handleAdd}
                disabled={isAdded || isLoading}
                className={cn(
                  'flex-shrink-0 h-8 px-3 rounded-lg',
                  'transition-all duration-200',
                  isAdded && 'cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    已添加
                  </>
                ) : (
                  <>
                    <span>添加</span>
                  </>
                )}
              </Button>
            </div>

            {/* 描述 */}
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
              {feed.description}
            </p>

            {/* 标签 */}
            {feed.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {feed.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={tag}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full',
                      'bg-muted/70 text-muted-foreground',
                      'transition-colors duration-200',
                      'group-hover:bg-primary/10 group-hover:text-primary/80'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {tag}
                  </span>
                ))}
                {feed.tags.length > 3 && (
                  <span className="text-[11px] text-muted-foreground/60">
                    +{feed.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部渐变装饰 */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </article>
  )
}
