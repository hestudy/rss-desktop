import { useEffect, useState } from 'react'
import type { Article } from '../../types'
import { ScrollArea } from '../ui/ScrollArea'
import { useRss } from '../../contexts/RssContext'
import { useReader } from '../../contexts/ReaderContext'
import { ArticleListHeader } from './ArticleListHeader'
import { ArticleCard } from './ArticleCard'

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
    refreshFeed,
    refreshAllFeeds,
  } = useRss()

  const { selectedArticleId, selectArticle } = useReader()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (selectedFeedId) {
      loadArticles(selectedFeedId)
    }
  }, [selectedFeedId, loadArticles])

  const handleArticleClick = async (article: Article) => {
    selectArticle(article.id)
    if (!article.read) {
      await markArticleRead(article.id, true)
    }
  }

  const handleOpenLink = async (url: string) => {
    await openLink(url)
  }

  const handleMarkAllRead = async () => {
    if (selectedFeedId) {
      await markAllRead(selectedFeedId)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (selectedFeedId) {
        await refreshFeed(selectedFeedId)
      } else {
        await refreshAllFeeds()
      }
    } finally {
      setIsRefreshing(false)
    }
  }

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
      {/* 顶部工具栏 */}
      <ArticleListHeader
        title={headerTitle}
        unreadCount={unreadCount}
        onRefresh={handleRefresh}
        onMarkAllRead={handleMarkAllRead}
        isRefreshing={isRefreshing}
        hideFilter
        hideMarkAllRead={showFavoritesOnly || unreadCount === 0}
      />

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
              {articles.map(article => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  description={article.description}
                  feedName={!selectedFeedId && !showFavoritesOnly ? getFeedName(article.feed_id) : undefined}
                  publishedAt={article.published_at || article.created_at}
                  isRead={article.read}
                  isSelected={selectedArticleId === article.id}
                  isFavorite={article.favorite}
                  onClick={() => handleArticleClick(article)}
                  onOpenExternal={() => handleOpenLink(article.link)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
