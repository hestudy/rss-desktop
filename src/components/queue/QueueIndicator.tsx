import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ListTodo } from 'lucide-react'
import { useQueueStatus } from '../../hooks/useQueueStatus'
import { QueuePanel } from './QueuePanel'
import { QueueTaskDetailDialog } from './QueueTaskDetailDialog'
import { useRss } from '../../contexts/RssContext'
import { useReader } from '../../contexts/ReaderContext'
import { RssApi } from '../../lib/api'
import type { QueueTask } from '../../types'

export function QueueIndicator() {
  const { status, activeCount, cancelTask, clearCompleted } = useQueueStatus()
  const { selectFeedAndLoad } = useRss()
  const { selectArticle } = useReader()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<QueueTask | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPopoverStyle({
      position: 'fixed',
      left: rect.left,
      bottom: window.innerHeight - rect.top + 8,
      zIndex: 9999,
    })
  }, [])

  const handleTaskClick = useCallback((task: QueueTask) => {
    setSelectedTask(task)
    setIsDialogOpen(true)
  }, [])

  const handleRetry = useCallback(async (task: QueueTask) => {
    await RssApi.queueAddTask(
      task.task_type.type,
      task.task_type.article_id,
      {
        url: task.task_type.url,
        targetLang: task.task_type.target_lang,
      }
    )
    setIsDialogOpen(false)
  }, [])

  const handleNavigateToArticle = useCallback(async (feedId: string, articleId: string) => {
    setIsDialogOpen(false)
    setIsOpen(false)
    await selectFeedAndLoad(feedId)
    selectArticle(articleId)
  }, [selectFeedAndLoad, selectArticle])

  useEffect(() => {
    if (!isOpen) return

    updatePosition()

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      
      // 如果 Dialog 打开，不处理 click-outside
      if (isDialogOpen) {
        return
      }
      
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, updatePosition, isDialogOpen])

  return (
    <>
      <button
        ref={buttonRef}
        aria-label="任务队列"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover transition-colors"
      >
        <ListTodo className="w-4 h-4" />
        {activeCount > 0 && (
          <span
            data-testid="queue-badge"
            className="absolute -top-1 -right-1 bg-sidebar-active text-badge-fg text-[10px] font-medium min-w-[1rem] h-4 px-1 rounded-full flex items-center justify-center"
          >
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="任务队列"
          style={popoverStyle}
          className="bg-card border border-border rounded-lg shadow-xl"
        >
          <QueuePanel
            status={status}
            onCancelTask={cancelTask}
            onClearCompleted={clearCompleted}
            onTaskClick={handleTaskClick}
          />
        </div>,
        document.body,
      )}

      <QueueTaskDetailDialog
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onRetry={handleRetry}
        onNavigateToArticle={handleNavigateToArticle}
      />
    </>
  )
}
