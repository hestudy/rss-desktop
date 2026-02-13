import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '../ui/Dialog'
import { ScrollArea } from '../ui/ScrollArea'
import { LogEntry } from './LogEntry'
import { RssApi } from '../../lib/api'
import type { FeedLog } from '../../types'

interface FeedLogDialogProps {
  isOpen: boolean
  onClose: () => void
  feedId: string
  feedTitle: string
}

export function FeedLogDialog({ isOpen, onClose, feedId, feedTitle }: FeedLogDialogProps) {
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      RssApi.getFeedLogs(feedId, 50)
        .then(setLogs)
        .catch(() => setLogs([]))
        .finally(() => setLoading(false))
    }
  }, [isOpen, feedId])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" title={`${feedTitle} - 刷新日志`}>
        <ScrollArea className="max-h-[400px]">
          {loading && (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          )}

          {!loading && logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">暂无刷新日志</div>
          )}

          {!loading && logs.length > 0 && (
            <div className="space-y-2">
              {logs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
