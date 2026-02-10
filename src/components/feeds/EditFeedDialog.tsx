import { useState, useEffect } from 'react'
import { z } from 'zod'
import { Dialog, DialogContent } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useRss } from '../../contexts/RssContext'
import type { Feed } from '../../types'

const feedUrlSchema = z.string().url()

interface EditFeedDialogProps {
  isOpen: boolean
  onClose: () => void
  feed: Feed
}

export function EditFeedDialog({ isOpen, onClose, feed }: EditFeedDialogProps) {
  const [title, setTitle] = useState(feed.title)
  const [url, setUrl] = useState(feed.url)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateFeed } = useRss()

  useEffect(() => {
    if (isOpen) {
      setTitle(feed.title)
      setUrl(feed.url)
      setError(null)
    }
  }, [isOpen, feed])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()

    if (!trimmedTitle) {
      setError('标题不能为空')
      return
    }

    if (!trimmedUrl) {
      setError('URL 不能为空')
      return
    }

    if (!feedUrlSchema.safeParse(trimmedUrl).success) {
      setError('请输入有效的 URL')
      return
    }

    const titleChanged = trimmedTitle !== feed.title
    const urlChanged = trimmedUrl !== feed.url

    if (!titleChanged && !urlChanged) {
      onClose()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await updateFeed(
        feed.id,
        titleChanged ? trimmedTitle : undefined,
        urlChanged ? trimmedUrl : undefined,
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="编辑订阅" className="max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-feed-title" className="block text-sm font-medium mb-2">
                标题
              </label>
              <Input
                id="edit-feed-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (error) setError(null)
                }}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="edit-feed-url" className="block text-sm font-medium mb-2">
                RSS Feed URL
              </label>
              <Input
                id="edit-feed-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (error) setError(null)
                }}
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
              disabled={isLoading}
            >
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
