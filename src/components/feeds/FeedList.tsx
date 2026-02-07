import { useState } from 'react'
import { Rss, RefreshCw, Plus, Trash2, Settings } from 'lucide-react'
import { Button } from '../ui/Button'
import { ScrollArea } from '../ui/ScrollArea'
import { AddFeedDialog } from './AddFeedDialog'
import { SettingsDialog } from '../settings/SettingsDialog'
import { useConfirm } from '../ui/ConfirmDialog'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { useRss } from '../../contexts/RssContext'

export function FeedList() {
  const {
    feeds,
    selectedFeedId,
    isLoading,
    removeFeed,
    refreshFeed,
    refreshAllFeeds,
    selectFeed,
    getGlobalUnreadCount,
  } = useRss()

  const { confirm } = useConfirm()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const handleRefreshAll = async () => {
    await refreshAllFeeds()
  }

  const handleRefreshFeed = async (id: string) => {
    setRefreshingId(id)
    try {
      await refreshFeed(id)
    } finally {
      setRefreshingId(null)
    }
  }

  const handleRemoveFeed = async (id: string) => {
    const confirmed = await confirm('确定要删除这个订阅吗？', '删除订阅')
    if (confirmed) {
      await removeFeed(id)
    }
  }

  const globalUnread = getGlobalUnreadCount()

  return (
    <>
      <div className="h-full flex flex-col border-r">
        {/* 头部 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5" />
              <h1 className="font-semibold">RSS 订阅</h1>
              {globalUnread > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {globalUnread}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <ThemeSwitcher />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettingsDialog(true)}
                title="设置"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefreshAll}
                disabled={isLoading}
                title="刷新全部"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddDialog(true)}
                title="添加订阅"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* "全部" 选项 */}
          <button
            onClick={() => selectFeed(null)}
            className={`group relative w-full text-left px-3 py-2.5 rounded-md transition-all duration-200 ${
              selectedFeedId === null
                ? 'bg-accent text-accent-foreground border-l-4 border-l-primary'
                : 'hover:bg-accent/50 border-l-4 border-l-transparent'
            }`}
            >
            <div className="flex items-center justify-between">
              <span className="font-medium">全部文章</span>
              {globalUnread > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                  {globalUnread}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* 订阅列表 */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {feeds.map(({ feed, unread_count }) => (
              <div
                key={feed.id}
                className={`group relative rounded-md transition-all duration-200 ${
                  selectedFeedId === feed.id
                    ? 'bg-accent text-accent-foreground border-l-4 border-l-primary'
                    : 'hover:bg-accent/50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectFeed(feed.id)}
                    className="flex-1 text-left px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium">{feed.title}</span>
                      {unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                          {unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRefreshFeed(feed.id)}
                      disabled={refreshingId === feed.id}
                      className="h-7 w-7 p-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === feed.id ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFeed(feed.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {feeds.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <p>还没有订阅</p>
                <p className="text-sm">点击右上角的 + 添加订阅</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <AddFeedDialog isOpen={showAddDialog} onClose={() => setShowAddDialog(false)} />
      <SettingsDialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} />
    </>
  )
}
