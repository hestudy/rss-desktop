import { useEffect } from 'react'
import type { Article } from '../../types'
import { ExternalLink, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ScrollArea } from '../ui/ScrollArea'
import { Button } from '../ui/Button'
import { useRss } from '../../contexts/RssContext'
import { useReader } from '../../contexts/ReaderContext'

export function ArticleList() {
  const {
    articles,
    selectedFeedId,
    isLoading,
    markArticleRead,
    openLink,
    loadArticles,
    markAllRead,
    feeds,
    showFavoritesOnly,
  } = useRss()

  const { selectedArticleId, selectArticle } = useReader()

  useEffect(() => {
    if (selectedFeedId) {
      loadArticles(selectedFeedId)
    }
  }, [selectedFeedId, loadArticles])

  const handleArticleClick = async (article: Article) => {
    // 选择文章并在阅读器中打开
    selectArticle(article.id)
    // 标记为已读
    if (!article.read) {
      await markArticleRead(article.id, true)
    }
  }

  const handleOpenLink = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    await openLink(url)
  }

  const handleMarkAllRead = async () => {
    if (selectedFeedId) {
      await markAllRead(selectedFeedId)
    }
  }

  // 格式化日期，处理无效日期
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '未知时间'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '无效日期'
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: zhCN,
    })
  }

  // 获取文章来源 feed 名称
  const getFeedName = (feedId: string): string | undefined => {
    const found = feeds.find(f => f.feed.id === feedId)
    return found?.feed.title
  }

  const currentFeed = feeds.find(f => f.feed.id === selectedFeedId)
  const unreadCount = currentFeed?.unread_count || 0

  const headerTitle = showFavoritesOnly
    ? '收藏文章'
    : currentFeed
      ? currentFeed.feed.title
      : '全部文章'

  return (
    <div className="h-full flex flex-col border-r border-border">
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {headerTitle}
          </h2>
          {unreadCount > 0 && !showFavoritesOnly && (
            <Button size="sm" variant="ghost" onClick={handleMarkAllRead}>
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* 文章列表 */}
      <ScrollArea className="flex-1">
        <div>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showFavoritesOnly ? '暂无收藏文章' : '暂无文章'}
            </div>
          ) : (
            <div>
              {articles.map(article => {
                const isSelected = selectedArticleId === article.id
                return (
                  <div
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className={`group relative px-4 py-3 border-b border-border/50 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-accent border-l-2 border-l-primary'
                        : article.read
                          ? 'bg-read-background opacity-80 hover:opacity-100'
                          : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`mb-1 line-clamp-2 leading-snug text-sm ${
                            article.read
                              ? 'text-read-foreground font-normal'
                              : 'text-card-foreground font-medium'
                          }`}
                        >
                          {article.title}
                        </h3>
                        {article.description && (
                          <p className={`text-xs line-clamp-1 mb-1 ${
                            article.read
                              ? 'text-read-foreground'
                              : 'text-muted-foreground'
                          }`}>
                            {article.description}
                          </p>
                        )}
                        <div className={`flex items-center gap-1.5 text-xs ${
                          article.read
                            ? 'text-read-foreground'
                            : 'text-muted-foreground'
                        }`}>
                          {!selectedFeedId && !showFavoritesOnly && (
                            <>
                              <span className="truncate max-w-[120px]">{getFeedName(article.feed_id)}</span>
                              <span>·</span>
                            </>
                          )}
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(article.published_at)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleOpenLink(e, article.link)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
