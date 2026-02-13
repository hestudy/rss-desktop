import { useEffect, useState } from 'react'
import { FileText, Sparkles, Languages, Loader2, AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/Dialog'
import type { QueueTask, QueueTaskType, Article } from '../../types'
import { RssApi } from '../../lib/api'
import { useRss } from '../../contexts/RssContext'

export interface QueueTaskDetailDialogProps {
  task: QueueTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry: (task: QueueTask) => void
  onNavigateToArticle: (feedId: string, articleId: string) => void
}

const TASK_TYPE_LABELS: Record<QueueTaskType, string> = {
  fetch_full_content: '全文抓取',
  ai_summary: 'AI 摘要',
  ai_translation: 'AI 翻译',
}

const TASK_TYPE_ICONS: Record<QueueTaskType, typeof FileText> = {
  fetch_full_content: FileText,
  ai_summary: Sparkles,
  ai_translation: Languages,
}

const STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />
    case 'pending':
      return <Clock className="w-4 h-4 text-muted-foreground" />
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-destructive" />
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-primary" />
    default:
      return null
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function QueueTaskDetailDialog({
  task,
  open,
  onOpenChange,
  onRetry,
  onNavigateToArticle,
}: QueueTaskDetailDialogProps) {
  const { feeds } = useRss()
  const [article, setArticle] = useState<Article | null>(null)
  const [isLoadingArticle, setIsLoadingArticle] = useState(false)

  useEffect(() => {
    if (!task || !open) {
      setArticle(null)
      return
    }

    const loadArticle = async () => {
      setIsLoadingArticle(true)
      try {
        const result = await RssApi.getArticle(task.task_type.article_id)
        setArticle(result)
      } catch (error) {
        console.error('Failed to load article:', error)
        setArticle(null)
      } finally {
        setIsLoadingArticle(false)
      }
    }

    loadArticle()
  }, [task, open])

  if (!task) {
    return null
  }

  const TypeIcon = TASK_TYPE_ICONS[task.task_type.type]
  const typeLabel = TASK_TYPE_LABELS[task.task_type.type]
  const statusString = task.status.status
  const statusLabel = STATUS_LABELS[statusString] || statusString
  const isFailed = statusString === 'failed'
  const errorMessage = isFailed && 'error' in task.status ? task.status.error : null

  const feed = article ? feeds.find(f => f.feed.id === article.feed_id) : null
  const feedName = feed ? feed.feed.title : '未知订阅'
  const articleTitle = article ? article.title : isLoadingArticle ? '加载中...' : '文章不存在'

  const canNavigate = article !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="任务详情" className="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{typeLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <TaskStatusIcon status={statusString} />
            <span className="text-sm">{statusLabel}</span>
          </div>

          {isFailed && errorMessage && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <button
                onClick={() => onRetry(task)}
                className="mt-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                重试
              </button>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">创建时间：</span>
              <span>{formatTimestamp(task.created_at)}</span>
            </div>
            {task.started_at && (
              <div>
                <span className="text-muted-foreground">开始时间：</span>
                <span>{formatTimestamp(task.started_at)}</span>
              </div>
            )}
            {task.completed_at && (
              <div>
                <span className="text-muted-foreground">完成时间：</span>
                <span>{formatTimestamp(task.completed_at)}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">文章：</span>
              <p className="text-sm font-medium">{articleTitle}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">订阅：</span>
              <p className="text-sm">{feedName}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (article) {
                  onNavigateToArticle(article.feed_id, article.id)
                }
              }}
              disabled={!canNavigate}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink className="w-4 h-4" />
              查看文章
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
