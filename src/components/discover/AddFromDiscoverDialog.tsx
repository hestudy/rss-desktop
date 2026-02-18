import { useState } from 'react'
import { Dialog, DialogContent } from '../ui/Dialog'
import { Button } from '../ui/Button'
import type { DiscoverFeed } from '../../types'

interface AddFromDiscoverDialogProps {
  isOpen: boolean
  feed: DiscoverFeed | null
  onClose: () => void
  onConfirm: (url: string, useFullContent: boolean, useAiSummary: boolean, useAiTranslation: boolean) => Promise<void>
}

export function AddFromDiscoverDialog({
  isOpen,
  feed,
  onClose,
  onConfirm,
}: AddFromDiscoverDialogProps) {
  const [useFullContent, setUseFullContent] = useState(false)
  const [useAiSummary, setUseAiSummary] = useState(false)
  const [useAiTranslation, setUseAiTranslation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (!feed) return

    setIsLoading(true)
    try {
      await onConfirm(feed.url, useFullContent, useAiSummary, useAiTranslation)
      // Reset state on success
      setUseFullContent(false)
      setUseAiSummary(false)
      setUseAiTranslation(false)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setUseFullContent(false)
      setUseAiSummary(false)
      setUseAiTranslation(false)
      onClose()
    }
  }

  if (!isOpen || !feed) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent title="添加订阅" className="max-w-md">
        <div className="space-y-4">
          {/* Feed info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <h3 className="font-medium text-foreground">{feed.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {feed.description}
            </p>
          </div>

          {/* AI options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="discover-full-content"
                type="checkbox"
                checked={useFullContent}
                onChange={(e) => setUseFullContent(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-border accent-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">自动抓取全文</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="discover-ai-summary"
                type="checkbox"
                checked={useAiSummary}
                onChange={(e) => setUseAiSummary(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-border accent-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">自动生成 AI 摘要</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="discover-ai-translation"
                type="checkbox"
                checked={useAiTranslation}
                onChange={(e) => setUseAiTranslation(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-border accent-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">自动 AI 翻译</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? '添加中...' : '添加'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
