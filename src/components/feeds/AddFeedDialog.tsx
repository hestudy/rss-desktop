import { useState } from 'react'
import { z } from 'zod'
import { Dialog, DialogContent } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useRss } from '../../contexts/RssContext'

// URL 验证 schema
const feedUrlSchema = z.string().url('Invalid URL format')

export function AddFeedDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [url, setUrl] = useState('')
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

    // 使用 Zod 验证 URL
    const validationResult = feedUrlSchema.safeParse(trimmedUrl)
    if (!validationResult.success) {
      setError('请输入有效的 URL（例如：https://example.com/feed.xml）')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await addFeed(trimmedUrl)
      setUrl('')
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
        <form onSubmit={handleSubmit}>
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
