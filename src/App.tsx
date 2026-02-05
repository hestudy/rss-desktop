import { useEffect } from 'react'
import { RssProvider, useRss } from './contexts/RssContext'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import { FeedList } from './components/feeds/FeedList'
import { ArticleList } from './components/articles/ArticleList'

function AppContent() {
  const { loadFeeds } = useRss()

  useEffect(() => {
    loadFeeds()
  }, [loadFeeds])

  return (
    <div className="h-screen flex overflow-hidden">
      {/* 左侧订阅列表 */}
      <div className="w-80 flex-shrink-0">
        <FeedList />
      </div>

      {/* 右侧文章列表 */}
      <div className="flex-1">
        <ArticleList />
      </div>
    </div>
  )
}

function App() {
  return (
    <ConfirmProvider>
      <RssProvider>
        <AppContent />
      </RssProvider>
    </ConfirmProvider>
  )
}

export default App
