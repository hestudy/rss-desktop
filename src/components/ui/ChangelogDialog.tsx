import { X, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './MarkdownRenderer'

export interface ChangelogDialogProps {
  /** 是否打开对话框 */
  open: boolean
  /** 打开状态变化回调 */
  onOpenChange: (open: boolean) => void
  /** 版本号 */
  version: string
  /** Markdown 内容 */
  content: string
  /** 发布日期 */
  publishedAt?: string
  /** 是否加载中 */
  loading?: boolean
  /** 错误信息 */
  error?: string | null
  /** 重试回调 */
  onRetry?: () => void
  /** GitHub Release 链接 */
  releaseUrl?: string
  /** 自定义类名 */
  className?: string
}

/**
 * 更新日志对话框组件
 *
 * 用于显示 GitHub Release 更新日志
 */
export function ChangelogDialog({
  open,
  onOpenChange,
  version,
  content,
  publishedAt,
  loading = false,
  error,
  onRetry,
  releaseUrl,
  className,
}: ChangelogDialogProps) {
  if (!open) return null

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* 对话框内容 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        className={cn(
          'relative z-[10001] bg-background rounded-xl shadow-xl border border-border',
          'w-full max-w-2xl max-h-[80vh] flex flex-col',
          'animate-in zoom-in-95 duration-200',
          className
        )}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 id="changelog-title" className="text-lg font-semibold">
              更新日志
            </h2>
            <span className="text-sm text-primary font-medium">
              v{version}
            </span>
            {publishedAt && (
              <span className="text-xs text-muted-foreground">
                {publishedAt}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            aria-label="关闭"
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 加载状态 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">加载中...</p>
              {/* 骨架屏 */}
              <div className="w-full mt-6 space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-destructive mb-4">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  重试
                </button>
              )}
            </div>
          )}

          {/* 正常内容 */}
          {!loading && !error && (
            <MarkdownRenderer content={content} className="changelog-content" />
          )}
        </div>

        {/* 底部操作栏 */}
        {releaseUrl && !loading && !error && (
          <div className="flex items-center justify-end px-6 py-3 border-t border-border flex-shrink-0">
            <a
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              在 GitHub 上查看
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
