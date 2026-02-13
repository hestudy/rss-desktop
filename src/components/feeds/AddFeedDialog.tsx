import { useState } from 'react'
import { z } from 'zod'
import { Dialog, DialogContent } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useRss } from '../../contexts/RssContext'

const feedUrlSchema = z.string().url('Invalid URL format')

export function AddFeedDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [useFullContent, setUseFullContent] = useState(false)
  const [useAiSummary, setUseAiSummary] = useState(false)
  const [useAiTranslation, setUseAiTranslation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addFeed } = useRss()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()

    if (!trimmedUrl) {
      setError('请输入 RSS Feed URL')
      return
    }

    const validationResult = feedUrlSchema.safeParse(trimmedUrl)
    if (!validationResult.success) {
      setError('请输入有效的 URL（例如：https://example.com/feed.xml）')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await addFeed(trimmedUrl, useFullContent, useAiSummary, useAiTranslation)
      setUrl('')
      setUseFullContent(false)
      setUseAiSummary(false)
      setUseAiTranslation(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="添加 RSS 订阅" className="max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="feed-url" className="block text-sm font-medium mb-2">
                RSS Feed URL
              </label>
              <Input
                id="feed-url"
                type="url"
                placeholder="https://example.com/feed.xml"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (error) setError(null)
                }}
                disabled={isLoading}
                aria-invalid={!!error}
              />
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </div>
            <label htmlFor="add-feed-full-content" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="add-feed-full-content"
                type="checkbox"
                checked={useFullContent}
                onChange={(e) => setUseFullContent(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-border accent-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">自动抓取全文</span>
            </label>
            <label htmlFor="add-feed-ai-summary" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="add-feed-ai-summary"
                type="checkbox"
                checked={useAiSummary}
                onChange={(e) => setUseAiSummary(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-border accent-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">自动生成 AI 摘要</span>
            </label>
            <label htmlFor="add-feed-ai-translation" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="add-feed-ai-translation"
                type="checkbox"
                checked={useAiTranslation}
                onChange={(e) => setUseAiTranslation(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-border accent-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">自动 AI 翻译</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? '添加中...' : '添加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
