import { useState } from 'react'
import { Rss, Plus, Trash2, Settings, Star, RefreshCw, Pencil, ScrollText, MoreHorizontal } from 'lucide-react'
import { Button } from '../ui/Button'
import { ScrollArea } from '../ui/ScrollArea'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/DropdownMenu'
import { AddFeedDialog } from './AddFeedDialog'
import { EditFeedDialog } from './EditFeedDialog'
import { FeedLogDialog } from './FeedLogDialog'
import { GlobalLogDialog } from './GlobalLogDialog'
import { FeedIcon } from './FeedIcon'
import { useConfirm } from '../ui/ConfirmDialog'
import { useUnifiedSettings } from '../settings/UnifiedSettings'
import { useRss } from '../../contexts/RssContext'
import { SidebarNav, type NavItem } from '../sidebar/SidebarNav'
import { SectionHeader } from './SectionHeader'
import { QueueIndicator } from '../queue/QueueIndicator'

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
  const { openSettings } = useUnifiedSettings()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [editingFeed, setEditingFeed] = useState<typeof feeds[number]['feed'] | null>(null)
  const [logFeed, setLogFeed] = useState<typeof feeds[number]['feed'] | null>(null)
  const [showGlobalLog, setShowGlobalLog] = useState(false)

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
  const totalArticleCount = feeds.reduce((sum, f) => sum + f.unread_count, 0)

  // 图标导航栏数据（仅视觉展示，不实现实际导航功能）
  const navItems: NavItem[] = [
    { id: 'inbox', icon: 'inbox', label: '收件箱', count: globalUnread },
    { id: 'mail', icon: 'mail', label: '通知' },
    { id: 'star', icon: 'star', label: '收藏' },
    { id: 'calendar', icon: 'calendar', label: '日历' },
    { id: 'settings', icon: 'settings', label: '设置' },
  ]

  // 当前激活的导航项基于应用状态
  const currentNavId = showFavoritesOnly ? 'star' : 'inbox'

  return (
    <>
      <div className="h-full flex flex-col bg-sidebar-bg text-sidebar-fg">
        {/* 顶部: Logo + 添加按钮 */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-sidebar-active" />
              <h1 className="font-semibold text-sidebar-fg">RSS Reader</h1>
            </div>
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

        {/* 图标导航栏（仅视觉展示） */}
        <SidebarNav
          items={navItems}
          activeId={currentNavId}
          onSelect={() => {}}
          direction="horizontal"
          aria-label="导航"
          className="border-b border-sidebar-border justify-center pointer-events-none"
        />

        {/* 分类标题 */}
        <SectionHeader
          title="文章"
          count={totalArticleCount}
        />

        {/* 导航区域 */}
        <div className="px-2 space-y-0.5">
          {/* "全部" 选项 */}
          <button
            onClick={() => selectFeed(null)}
            className={`group relative w-full text-left px-3 py-2 rounded-md transition-all duration-200 ${
              selectedFeedId === null && !showFavoritesOnly
                ? 'bg-sidebar-hover text-sidebar-fg'
                : 'hover:bg-sidebar-hover text-sidebar-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">全部文章</span>
              {globalUnread > 0 && (
                <span className="bg-sidebar-active text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] text-center">
                  {globalUnread}
                </span>
              )}
            </div>
          </button>

          {/* 收藏文章入口 */}
          <button
            onClick={() => selectFavorites()}
            className={`group relative w-full text-left px-3 py-2 rounded-md transition-all duration-200 ${
              showFavoritesOnly
                ? 'bg-sidebar-hover text-sidebar-fg'
                : 'hover:bg-sidebar-hover text-sidebar-muted'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="font-medium text-sm">收藏文章</span>
            </div>
          </button>
        </div>

        {/* 订阅源列表 */}
        <ScrollArea className="flex-1 mt-1">
          <div className="px-2 space-y-0.5">
            {feeds.map(({ feed, unread_count }) => (
              <div
                key={feed.id}
                className={`group relative rounded-md transition-all duration-200 ${
                  selectedFeedId === feed.id
                    ? 'bg-sidebar-hover text-sidebar-fg'
                    : 'hover:bg-sidebar-hover text-sidebar-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectFeed(feed.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2 flex items-center gap-2.5"
                  >
                    <FeedIcon iconUrl={feed.icon_url} title={feed.title} size={18} />
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate text-sm font-medium">{feed.title}</span>
                      {unread_count > 0 && (
                        <span className="text-sidebar-muted text-xs font-medium ml-2 flex-shrink-0">
                          {unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                  <div
                    data-testid="feed-actions"
                    className="absolute right-0 top-0 bottom-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-2 pl-4 bg-gradient-to-l from-sidebar-hover from-70% to-transparent"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRefreshFeed(feed.id)}
                          disabled={refreshingId === feed.id}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === feed.id ? 'animate-spin' : ''}`} />
                          刷新
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingFeed(feed)}>
                          <Pencil className="w-3.5 h-3.5" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLogFeed(feed)}>
                          <ScrollText className="w-3.5 h-3.5" />
                          刷新日志
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleRemoveFeed(feed.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

        {/* 底部固定区域 - 刷新 + 日志 + 队列 + 设置 */}
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-1">
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
              onClick={() => setShowGlobalLog(true)}
              title="刷新日志"
              className="text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"
            >
              <ScrollText className="w-4 h-4" />
            </Button>
          </div>
          <QueueIndicator />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openSettings()}
            title="设置"
            className="text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AddFeedDialog isOpen={showAddDialog} onClose={() => setShowAddDialog(false)} />
      {editingFeed && (
        <EditFeedDialog
          isOpen={!!editingFeed}
          onClose={() => setEditingFeed(null)}
          feed={editingFeed}
        />
      )}
      {logFeed && (
        <FeedLogDialog
          isOpen={!!logFeed}
          onClose={() => setLogFeed(null)}
          feedId={logFeed.id}
          feedTitle={logFeed.title}
        />
      )}
      <GlobalLogDialog
        isOpen={showGlobalLog}
        onClose={() => setShowGlobalLog(false)}
      />
    </>
  )
}
