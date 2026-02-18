import { useState, useEffect, useMemo } from 'react'
import { RssApi } from '../../lib/api'
import { DiscoverFeedCard } from './DiscoverFeedCard'
import { DiscoverCategoryFilter } from './DiscoverCategory'
import { AddFromDiscoverDialog } from './AddFromDiscoverDialog'
import { Loader2, Search, Inbox, X, Sparkles } from 'lucide-react'
import { Group, Panel } from 'react-resizable-panels'
import { ResizeHandle } from '../ui/ResizeHandle'
import { ScrollArea } from '../ui/ScrollArea'
import type { DiscoverFeed, DiscoverCategory, FeedWithUnreadCount } from '../../types'

interface DiscoverPanelProps {
  existingFeeds: FeedWithUnreadCount[]
  onAddFeed: (url: string, useFullContent?: boolean, useAiSummary?: boolean, useAiTranslation?: boolean) => Promise<void>
  onClose?: () => void
}

// 分类侧栏宽度（像素）
const CATEGORY_SIDEBAR_WIDTH = 220
const CATEGORY_SIDEBAR_MIN_WIDTH = 180
const CATEGORY_SIDEBAR_MAX_WIDTH = 320

export function DiscoverPanel({ existingFeeds, onAddFeed, onClose }: DiscoverPanelProps) {
  const [categories, setCategories] = useState<DiscoverCategory[]>([])
  const [feeds, setFeeds] = useState<DiscoverFeed[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFeed, setSelectedFeed] = useState<DiscoverFeed | null>(null)

  // 加载发现数据
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    RssApi.getDiscoverFeeds()
      .then((data) => {
        if (!cancelled) {
          setCategories(data.categories)
          setFeeds(data.feeds)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 已添加的订阅 URL 集合
  const existingFeedUrls = useMemo(() => {
    return new Set(existingFeeds.map((f) => f.feed.url))
  }, [existingFeeds])

  // 过滤订阅源
  const filteredFeeds = useMemo(() => {
    let result = feeds

    // 按分类筛选
    if (selectedCategoryId) {
      result = result.filter((feed) => feed.categoryId === selectedCategoryId)
    }

    // 按搜索词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (feed) =>
          feed.title.toLowerCase().includes(query) ||
          feed.description.toLowerCase().includes(query) ||
          feed.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return result
  }, [feeds, selectedCategoryId, searchQuery])

  // 添加订阅
  const handleAddFeed = async (feed: DiscoverFeed) => {
    setSelectedFeed(feed)
    setDialogOpen(true)
  }

  // 确认添加（带 AI 配置）
  const handleConfirmAdd = async (
    url: string,
    useFullContent: boolean,
    useAiSummary: boolean,
    useAiTranslation: boolean
  ) => {
    await onAddFeed(url, useFullContent, useAiSummary, useAiTranslation)
    setDialogOpen(false)
    setSelectedFeed(null)
  }

  // 关闭对话框
  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedFeed(null)
  }

  // 加载状态
  if (isLoading) {
    return (
      <div data-testid="discover-loading" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-background via-background to-muted/20">
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
        </div>
        <span className="mt-4 text-muted-foreground font-medium tracking-wide">正在加载精选订阅...</span>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div data-testid="discover-error" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-background via-background to-destructive/5">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/10 rounded-full blur-xl scale-150" />
          <Inbox className="w-16 h-16 text-destructive/60 relative z-10" />
        </div>
        <p className="text-lg font-semibold mt-6">加载失败</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs text-center">{error}</p>
      </div>
    )
  }

  return (
    <div data-testid="discover-panel" className="flex flex-col h-full bg-background">
      {/* 标题栏 */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-border/50 bg-gradient-to-r from-background via-background to-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                发现订阅
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                探索精选 RSS 订阅源
              </p>
            </div>
          </div>
          {onClose && (
            <button
              data-testid="discover-close-button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted/80 active:scale-95 transition-all duration-200 group"
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          )}
        </div>
      </header>

      {/* 两栏布局 */}
      <div data-testid="discover-two-column-layout" className="flex-1 min-h-0">
        <Group
          orientation="horizontal"
          className="h-full"
        >
          {/* 左侧分类面板 - 使用像素单位 */}
          <Panel
            defaultSize={CATEGORY_SIDEBAR_WIDTH}
            minSize={CATEGORY_SIDEBAR_MIN_WIDTH}
            maxSize={CATEGORY_SIDEBAR_MAX_WIDTH}
          >
            <aside
              data-testid="discover-category-panel"
              className="h-full flex flex-col bg-muted/30 dark:bg-muted/10 backdrop-blur-sm"
            >
              {/* 分类标题 */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-border/50">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  分类筛选
                </h3>
              </div>

              {/* 分类列表 */}
              <div className="flex-1 min-h-0 relative">
                <ScrollArea
                  data-testid="discover-category-list"
                  className="absolute inset-0 px-3 py-3"
                >
                  <DiscoverCategoryFilter
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={setSelectedCategoryId}
                    layout="vertical"
                  />
                </ScrollArea>
              </div>

              {/* 底部装饰 */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground/60">
                  {categories.length} 个分类 · {feeds.length} 个订阅源
                </p>
              </div>
            </aside>
          </Panel>

          {/* 拖拽手柄 */}
          <ResizeHandle className="!w-1" id="discover-inner-handle" />

          {/* 右侧订阅源面板 */}
          <Panel
            minSize={400}
          >
            <main
              data-testid="discover-feeds-panel"
              className="h-full flex flex-col"
            >
              {/* 搜索框 */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-border/50">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    data-testid="discover-search-input"
                    placeholder="搜索订阅源名称、描述或标签..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="relative w-full h-11 pl-11 pr-4 rounded-xl border border-border/60 bg-background/50
                               text-sm placeholder:text-muted-foreground/60
                               focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10
                               transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* 订阅源列表 */}
              <div className="flex-1 min-h-0 relative">
                <ScrollArea className="absolute inset-0 px-6 py-5">
                  {filteredFeeds.length === 0 ? (
                    <div data-testid="discover-empty" className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Inbox className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                      <p className="text-lg font-medium">没有找到订阅源</p>
                      <p className="text-sm mt-2 text-muted-foreground/70">尝试更换搜索词或选择其他分类</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                      {filteredFeeds.map((feed, index) => (
                        <div
                          key={feed.id}
                          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                          style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                        >
                          <DiscoverFeedCard
                            feed={feed}
                            isAdded={existingFeedUrls.has(feed.url)}
                            onAdd={handleAddFeed}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </main>
          </Panel>
        </Group>
      </div>

      {/* AI 配置对话框 */}
      <AddFromDiscoverDialog
        isOpen={dialogOpen}
        feed={selectedFeed}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmAdd}
      />
    </div>
  )
}
