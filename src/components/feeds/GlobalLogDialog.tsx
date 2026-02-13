import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clock, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/Dialog'
import { ScrollArea } from '../ui/ScrollArea'
import { RssApi } from '../../lib/api'
import { formatLogTime } from './LogEntry'
import type { FeedLog } from '../../types'

interface GlobalLogDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalLogDialog({ isOpen, onClose }: GlobalLogDialogProps) {
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [collapsedFeeds, setCollapsedFeeds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      RssApi.getAllFeedLogs(200)
        .then(setLogs)
        .catch(() => setLogs([]))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const groupedLogs = useMemo(() => {
    const groups = new Map<string, { feedTitle: string; logs: FeedLog[] }>()
    for (const log of logs) {
      const existing = groups.get(log.feed_id)
      if (existing) {
        existing.logs.push(log)
      } else {
        groups.set(log.feed_id, { feedTitle: log.feed_title, logs: [log] })
      }
    }
    return Array.from(groups.entries())
  }, [logs])

  const toggleFeedCollapse = (feedId: string) => {
    setCollapsedFeeds((prev) => {
      const next = new Set(prev)
      if (next.has(feedId)) next.delete(feedId)
      else next.add(feedId)
      return next
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" title="全局刷新日志">
        <ScrollArea className="max-h-[500px]">
          {loading && (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          )}

          {!loading && groupedLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">暂无刷新日志</div>
          )}

          {!loading && groupedLogs.length > 0 && (
            <div className="space-y-4">
              {groupedLogs.map(([feedId, { feedTitle, logs: feedLogs }]) => {
                const isCollapsed = collapsedFeeds.has(feedId)
                const successCount = feedLogs.filter((l) => l.success).length
                const failCount = feedLogs.length - successCount

                return (
                  <div key={feedId}>
                    <button
                      onClick={() => toggleFeedCollapse(feedId)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm font-medium"
                    >
                      {isCollapsed
                        ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      <span className="truncate flex-1 text-left">{feedTitle}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {successCount > 0 && <span className="text-success">{successCount}✓</span>}
                        {failCount > 0 && <span className="text-destructive ml-1">{failCount}✗</span>}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="ml-6 mt-1 space-y-1.5">
                        {feedLogs.map((log) => {
                          const isExpanded = expandedId === log.id
                          const hasArticles = log.new_articles.length > 0

                          return (
                            <div key={log.id} className="border rounded-md p-2 text-xs">
                              <div
                                className={`flex items-center gap-2 ${hasArticles ? 'cursor-pointer' : ''}`}
                                onClick={() => hasArticles && setExpandedId(isExpanded ? null : log.id)}
                                role={hasArticles ? 'button' : undefined}
                                tabIndex={hasArticles ? 0 : undefined}
                                aria-expanded={hasArticles ? isExpanded : undefined}
                                onKeyDown={(e) => {
                                  if (hasArticles && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault()
                                    setExpandedId(isExpanded ? null : log.id)
                                  }
                                }}
                              >
                                {log.success ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
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
                                    : <span className="text-destructive">失败</span>}
                                </span>

                                <span className="text-muted-foreground">{log.duration_ms}ms</span>

                                {hasArticles && (
                                  isExpanded
                                    ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>

                              {log.error && (
                                <div className="mt-1.5 text-xs text-destructive bg-destructive/10 rounded p-1.5">
                                  {log.error}
                                </div>
                              )}

                              {isExpanded && hasArticles && (
                                <div className="mt-1.5 pl-5 space-y-0.5">
                                  {log.new_articles.map((article, idx) => (
                                    <div key={idx} className="flex items-center gap-1 text-muted-foreground">
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate" title={article.title}>{article.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
