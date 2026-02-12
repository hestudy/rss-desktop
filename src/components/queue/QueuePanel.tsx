import { FileText, Sparkles, Languages, X, Loader2, AlertCircle, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import type { QueueStatusSnapshot, QueueTask, QueueTaskType } from '../../types'

export interface QueuePanelProps {
  status: QueueStatusSnapshot | null
  onCancelTask: (taskId: string) => void
  onClearCompleted: () => void
}

const STATUS_ORDER: Record<string, number> = {
  running: 0,
  pending: 1,
  failed: 2,
  completed: 3,
  cancelled: 4,
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

function getStatusString(task: QueueTask): string {
  return task.status.status
}

function sortTasks(tasks: QueueTask[]): QueueTask[] {
  return [...tasks].sort((a, b) => {
    const aOrder = STATUS_ORDER[getStatusString(a)] ?? 99
    const bOrder = STATUS_ORDER[getStatusString(b)] ?? 99
    return aOrder - bOrder
  })
}

function TaskStatusIcon({ task }: { task: QueueTask }) {
  const status = getStatusString(task)
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

function TaskItem({
  task,
  onCancel,
}: {
  task: QueueTask
  onCancel: (taskId: string) => void
}) {
  const status = getStatusString(task)
  const canCancel = status === 'pending' || status === 'running'
  const TypeIcon = TASK_TYPE_ICONS[task.task_type.type]
  const label = TASK_TYPE_LABELS[task.task_type.type]
  const failedError = 'error' in task.status ? task.status.error : null

  return (
    <div
      data-testid="queue-task-item"
      data-task-id={task.id}
      className="flex items-start gap-2 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors"
    >
      <div className="mt-0.5 flex-shrink-0">
        <TaskStatusIcon task={task} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <TypeIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        {failedError && (
          <p className="text-xs text-destructive mt-0.5 truncate">{failedError}</p>
        )}
      </div>
      {canCancel && (
        <button
          aria-label="取消任务"
          onClick={() => onCancel(task.id)}
          className="flex-shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export function QueuePanel({ status, onCancelTask, onClearCompleted }: QueuePanelProps) {
  if (!status || status.tasks.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        暂无任务
      </div>
    )
  }

  const sorted = sortTasks(status.tasks)
  const hasCompleted = status.completed_count > 0

  return (
    <div className="w-72">
      <div className="max-h-64 overflow-y-auto py-1">
        {sorted.map(task => (
          <TaskItem key={task.id} task={task} onCancel={onCancelTask} />
        ))}
      </div>
      {hasCompleted && (
        <div className="border-t border-border px-3 py-2">
          <button
            aria-label="清除已完成"
            onClick={onClearCompleted}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            清除已完成
          </button>
        </div>
      )}
    </div>
  )
}
