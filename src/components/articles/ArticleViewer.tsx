import { useEffect, useRef, useState, useCallback } from 'react'
import { Star, StarOff, ExternalLink, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import DOMPurify from 'dompurify'
import { RssApi } from '../../lib/api'
import type { Article, ReaderSettings } from '../../types'
import { useReader } from '../../contexts/ReaderContext'
import { useUnifiedSettings } from '../settings/UnifiedSettings'

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
  const { selectArticle } = useReader()
  const { openSettings } = useUnifiedSettings()

  // 处理滚动并更新阅读进度
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="p-2 rounded hover:bg-muted transition-colors"
              title="上一篇文章 (P 或 ←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="p-2 rounded hover:bg-muted transition-colors"
              title="下一篇文章 (N 或 →)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div className="text-sm text-muted-foreground ml-2">
            {articles.findIndex(a => a.id === article.id) + 1} / {articles.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 收藏按钮 */}
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded hover:bg-muted transition-colors ${
              isFavorite ? 'text-yellow-500' : 'text-muted-foreground'
            }`}
            title={isFavorite ? '取消收藏 (F)' : '收藏 (F)'}
          >
            {isFavorite ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
          </button>

          {/* 在浏览器中打开 */}
          <button
            onClick={() => RssApi.openLink(article.link)}
            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
            title="在浏览器中打开"
          >
            <ExternalLink className="w-5 h-5" />
          </button>

          {/* 设置按钮 */}
          <button
            onClick={() => openSettings('reading')}
            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
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

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-8 py-6 scroll-smooth" ref={contentRef} onScroll={handleScroll}>
        <article className="mx-auto" style={getContentStyle()}>
          {/* 文章标题 */}
          <h1 className="text-2xl font-bold mb-4 text-foreground">{article.title}</h1>

          {/* 文章元信息 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-4 border-b border-border">
            <span>
              {article.published_at
                ? formatDistanceToNow(new Date(article.published_at), {
                    addSuffix: true,
                    locale: zhCN,
                  })
                : '未知时间'}
            </span>
            <span>·</span>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              查看原文
            </a>
          </div>

          {/* 文章内容 */}
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(article.content || article.description || ''),
            }}
          />
        </article>
      </div>
    </div>
  )
}
