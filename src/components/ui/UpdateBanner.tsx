import { X, Download, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UpdateBannerProps {
  version: string
  onDownload: () => void
  onDismiss: () => void
  /** 查看完整更新日志回调（可选） */
  onViewChangelog?: () => void
  className?: string
}

export function UpdateBanner({
  version,
  onDownload,
  onDismiss,
  onViewChangelog,
  className,
}: UpdateBannerProps) {
  return (
    <div
      data-testid="update-banner"
      className={cn(
        'bg-primary/10 border-b border-primary/20 px-4 py-2.5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：更新信息 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-primary whitespace-nowrap">
            新版本可用
          </span>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            v{version}
          </span>

          {/* 查看更新日志按钮 */}
          {onViewChangelog && (
            <button
              onClick={onViewChangelog}
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
            >
              <FileText className="w-3 h-3" />
              更新日志
            </button>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            立即更新
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="忽略更新"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
