import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clock, ExternalLink } from 'lucide-react'
import type { FeedLog } from '../../types'

export function formatLogTime(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface LogEntryProps {
  log: FeedLog
  compact?: boolean
}

export function LogEntry({ log, compact = false }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasArticles = log.new_articles.length > 0

  return (
    <div className={`border rounded-${compact ? 'md' : 'lg'} p-${compact ? '2' : '3'} text-${compact ? 'xs' : 'sm'}`}>
      <div
        className={`flex items-center gap-2 ${hasArticles ? 'cursor-pointer' : ''}`}
        onClick={() => hasArticles && setIsExpanded(!isExpanded)}
        role={hasArticles ? 'button' : undefined}
        tabIndex={hasArticles ? 0 : undefined}
        aria-expanded={hasArticles ? isExpanded : undefined}
        onKeyDown={(e) => {
          if (hasArticles && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
      >
        {log.success ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        )}

        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatLogTime(log.timestamp)}
        </span>

        <span className="flex-1 text-right text-muted-foreground">
          {log.success
            ? log.new_article_count > 0
              ? `+${log.new_article_count} 篇`
              : '无新文章'
            : <span className="text-red-500">失败</span>}
        </span>

        <span className="text-muted-foreground text-xs">{log.duration_ms}ms</span>

        {hasArticles && (
          isExpanded
            ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
            : <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
      </div>

      {log.error && (
        <div className="mt-1.5 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded p-1.5">
          {log.error}
        </div>
      )}

      {isExpanded && hasArticles && (
        <div className="mt-1.5 pl-5 space-y-0.5">
          {log.new_articles.map((article, idx) => (
            <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={article.title}>{article.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
