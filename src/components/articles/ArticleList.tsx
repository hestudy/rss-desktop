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
  } = useRss()

  const { selectArticle } = useReader()

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

  const currentFeed = feeds.find(f => f.feed.id === selectedFeedId)
  const unreadCount = currentFeed?.unread_count || 0

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {currentFeed ? currentFeed.feed.title : '全部文章'}
          </h2>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={handleMarkAllRead}>
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* 文章列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无文章</div>
          ) : (
            <div className="space-y-2">
              {articles.map(article => (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    article.read
                      ? 'bg-read-background border-transparent opacity-80'
                      : 'bg-card border-border shadow-sm hover:shadow-md hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`mb-2 line-clamp-2 leading-relaxed ${
                          article.read
                            ? 'text-read-foreground font-normal'
                            : 'text-card-foreground font-medium'
                        }`}
                      >
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className={`text-sm line-clamp-2 mb-2 ${
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
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
