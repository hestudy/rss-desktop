import { useEffect, useRef, useState, useCallback } from 'react'
import { Star, StarOff, ExternalLink, ChevronLeft, ChevronRight, Settings, FileText, Loader2, ArrowLeftRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import DOMPurify from 'dompurify'
import { RssApi } from '../../lib/api'
import type { Article, ReaderSettings } from '../../types'
import { useReader } from '../../contexts/ReaderContext'
import { useUnifiedSettings } from '../settings/UnifiedSettings'
import { useTheme } from '../../contexts/ThemeContext'
import { useRss } from '../../contexts/RssContext'

interface ArticleViewerProps {
  article: Article
  articles: Article[]
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
  readerSettings: ReaderSettings
}

// 允许的 HTML 标签和属性
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  ALLOW_DATA_ATTR: false,
}

export function ArticleViewer({
  article,
  articles,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  readerSettings,
}: ArticleViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isFavorite, setIsFavorite] = useState(article.favorite ?? false)
  const [scrollProgress, setScrollProgress] = useState(article.reading_progress ?? 0)
  const [isFetchingContent, setIsFetchingContent] = useState(false)
  const [fetchedFullContent, setFetchedFullContent] = useState<string | null>(null)
  const [contentMode, setContentMode] = useState<'original' | 'fulltext'>(
    article.full_content ? 'fulltext' : 'original'
  )
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { selectArticle } = useReader()
  const { openSettings } = useUnifiedSettings()
  const { isDark } = useTheme()
  const { updateArticleInList, feeds } = useRss()

  const feedConfig = feeds.find(f => f.feed.id === article.feed_id)
  const feedUsesFullContent = feedConfig?.feed.use_full_content ?? false
  const hasFullContent = !!(fetchedFullContent || article.full_content)

  useEffect(() => {
    setFetchedFullContent(null)
    setFetchError(null)
    setContentMode(article.full_content ? 'fulltext' : 'original')
  }, [article.id, article.full_content])

  useEffect(() => {
    if (feedUsesFullContent && !article.full_content && !fetchedFullContent && !isFetchingContent) {
      setIsFetchingContent(true)
      setFetchError(null)
      RssApi.fetchFullContent(article.id)
        .then((updated) => {
          setFetchedFullContent(updated.full_content ?? null)
          setContentMode('fulltext')
          updateArticleInList(updated)
        })
        .catch((err) => {
          setFetchError(err instanceof Error ? err.message : '抓取全文失败，请稍后重试')
        })
        .finally(() => {
          setIsFetchingContent(false)
        })
    }
  }, [article.id, article.full_content, feedUsesFullContent, fetchedFullContent, isFetchingContent, updateArticleInList])

  useEffect(() => {
    setIsFavorite(article.favorite ?? false)
  }, [article.id, article.favorite])

  useEffect(() => {
    if (!fetchError) return
    const timer = setTimeout(() => setFetchError(null), 5000)
    return () => clearTimeout(timer)
  }, [fetchError])

  const handleFetchFullContent = useCallback(async () => {
    setIsFetchingContent(true)
    setFetchError(null)
    try {
      const updated = await RssApi.fetchFullContent(article.id)
      setFetchedFullContent(updated.full_content ?? null)
      setContentMode('fulltext')
      updateArticleInList(updated)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '抓取全文失败，请稍后重试')
    } finally {
      setIsFetchingContent(false)
    }
  }, [article.id, updateArticleInList])

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return

    const element = contentRef.current
    const scrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight - element.clientHeight
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0

    setScrollProgress(progress)

    // 节流更新后端进度（每 5% 更新一次）
    if (Math.abs(progress - (article.reading_progress ?? 0)) >= 5) {
      RssApi.updateReadingProgress(article.id, Math.round(progress)).catch(() => {
        // 静默失败，不影响用户体验
      })
    }
  }, [article.id, article.reading_progress])

  // 初始化滚动位置
  useEffect(() => {
    if (contentRef.current && article.reading_progress) {
      const element = contentRef.current
      const scrollHeight = element.scrollHeight - element.clientHeight
      const scrollTop = (article.reading_progress / 100) * scrollHeight
      element.scrollTop = scrollTop
    }
  }, [article.id, article.reading_progress])

  // 处理收藏切换 - 使用 useCallback 避免闭包问题
  const handleToggleFavorite = useCallback(async () => {
    const newFavorite = !isFavorite
    setIsFavorite(newFavorite)
    try {
      await RssApi.setArticleFavorite(article.id, newFavorite)
    } catch {
      // 回滚状态
      setIsFavorite(!newFavorite)
    }
  }, [article.id, isFavorite])

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 不在输入框中时响应快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'Escape':
          selectArticle(null)
          break
        case 'f':
          handleToggleFavorite()
          break
        case 'n':
          if (hasNext) onNext?.()
          break
        case 'p':
          if (hasPrevious) onPrevious?.()
          break
        case 'ArrowLeft':
          if (hasPrevious) onPrevious?.()
          break
        case 'ArrowRight':
          if (hasNext) onNext?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasNext, hasPrevious, handleToggleFavorite, selectArticle, onNext, onPrevious])

  // 清理 HTML 内容 - 使用 DOMPurify
  const sanitizeHtml = useCallback((html?: string): string => {
    if (!html) return ''
    return DOMPurify.sanitize(html, SANITIZE_CONFIG)
  }, [])

  // 获取内容样式
  const getContentStyle = useCallback((): React.CSSProperties => ({
    fontSize: `${readerSettings.fontSize}px`,
    lineHeight: readerSettings.lineHeight,
    letterSpacing: `${readerSettings.letterSpacing}px`,
    textAlign: readerSettings.textAlign,
    maxWidth: `${readerSettings.maxWidth}ch`,
  }), [readerSettings.fontSize, readerSettings.lineHeight, readerSettings.letterSpacing, readerSettings.textAlign, readerSettings.maxWidth])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="上一篇文章 (P 或 ←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="下一篇文章 (N 或 →)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div className="text-sm text-muted-foreground ml-2">
            {articles.findIndex(a => a.id === article.id) + 1} / {articles.length}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 收藏按钮 */}
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg hover:bg-muted transition-colors ${
              isFavorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={isFavorite ? '取消收藏 (F)' : '收藏 (F)'}
          >
            {isFavorite ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
          </button>

          {/* 在浏览器中打开 */}
          <button
            onClick={() => RssApi.openLink(article.link)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="在浏览器中打开"
          >
            <ExternalLink className="w-5 h-5" />
          </button>

          {/* 抓取全文 */}
          <button
            onClick={handleFetchFullContent}
            disabled={isFetchingContent}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="抓取全文"
          >
            {isFetchingContent ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          </button>

          {/* 切换原始/全文内容 */}
          {hasFullContent && (
            <button
              onClick={() => setContentMode(prev => prev === 'fulltext' ? 'original' : 'fulltext')}
              className={`p-2 rounded-lg hover:bg-muted transition-colors ${
                contentMode === 'fulltext' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={contentMode === 'fulltext' ? '切换为原始内容' : '切换为全文内容'}
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          )}

          {/* 设置按钮 */}
          <button
            onClick={() => openSettings('reading')}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="阅读设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 阅读进度条 */}
      {readerSettings.showProgress && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {fetchError && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-destructive/20">
          {fetchError}
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-8 py-6 scroll-smooth" ref={contentRef} onScroll={handleScroll}>
        <article className="mx-auto" style={getContentStyle()}>
          {/* 文章标题 */}
          <h1 className="text-2xl font-bold mb-4 text-foreground">{article.title}</h1>

          {/* 文章元信息 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-4 border-b border-border/60">
            <span>
              {article.published_at
                ? formatDistanceToNow(new Date(article.published_at), {
                    addSuffix: true,
                    locale: zhCN,
                  })
                : '未知时间'}
            </span>
            <span className="text-border">·</span>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              查看原文
            </a>
          </div>

          {/* 文章内容 */}
          <div
            className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                contentMode === 'fulltext'
                  ? (fetchedFullContent || article.full_content || article.content || article.description || '')
                  : (article.content || article.description || '')
              ),
            }}
          />
        </article>
      </div>
    </div>
  )
}
