import { useState } from 'react'
import { Rss, RefreshCw, Plus, Trash2, Settings, Star } from 'lucide-react'
import { Button } from '../ui/Button'
import { ScrollArea } from '../ui/ScrollArea'
import { AddFeedDialog } from './AddFeedDialog'
import { FeedIcon } from './FeedIcon'
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
    selectFavorites,
    showFavoritesOnly,
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
      <div className="h-full flex flex-col bg-sidebar-bg text-sidebar-fg">
        {/* 头部 - Logo + 添加按钮 */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-sidebar-active" />
              <h1 className="font-semibold text-sidebar-fg">RSS Reader</h1>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefreshAll}
                disabled={isLoading}
                title="刷新全部"
                className="text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddDialog(true)}
                title="添加订阅"
                className="text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 导航区域 */}
        <div className="p-2 space-y-1">
          {/* "全部" 选项 */}
          <button
            onClick={() => selectFeed(null)}
            className={`group relative w-full text-left px-3 py-2.5 rounded-md transition-all duration-200 ${
              selectedFeedId === null && !showFavoritesOnly
                ? 'bg-sidebar-hover border-l-2 border-l-sidebar-active text-sidebar-fg'
                : 'hover:bg-sidebar-hover border-l-2 border-l-transparent text-sidebar-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">全部文章</span>
              {globalUnread > 0 && (
                <span className="bg-sidebar-active text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  {globalUnread}
                </span>
              )}
            </div>
          </button>

          {/* 收藏文章入口 */}
          <button
            onClick={() => selectFavorites()}
            className={`group relative w-full text-left px-3 py-2.5 rounded-md transition-all duration-200 ${
              showFavoritesOnly
                ? 'bg-sidebar-hover border-l-2 border-l-sidebar-active text-sidebar-fg'
                : 'hover:bg-sidebar-hover border-l-2 border-l-transparent text-sidebar-muted'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="font-medium text-sm">收藏文章</span>
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
                    ? 'bg-sidebar-hover border-l-2 border-l-sidebar-active text-sidebar-fg'
                    : 'hover:bg-sidebar-hover border-l-2 border-l-transparent text-sidebar-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectFeed(feed.id)}
                    className="flex-1 text-left px-3 py-2.5 flex items-center gap-2.5"
                  >
                    <FeedIcon iconUrl={feed.icon_url} title={feed.title} size={18} />
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate text-sm font-medium">{feed.title}</span>
                      {unread_count > 0 && (
                        <span className="bg-sidebar-active text-white text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
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
                      className="h-7 w-7 p-0 text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"
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
              <div className="text-center py-8 text-sidebar-muted">
                <p>还没有订阅</p>
                <p className="text-sm">点击右上角的 + 添加订阅</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部固定区域 - 设置 + 主题切换 */}
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettingsDialog(true)}
            title="设置"
            className="text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <ThemeSwitcher />
        </div>
      </div>

      <AddFeedDialog isOpen={showAddDialog} onClose={() => setShowAddDialog(false)} />
      <SettingsDialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} />
    </>
  )
}
