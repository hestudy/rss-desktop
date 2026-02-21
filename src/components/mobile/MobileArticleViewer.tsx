import { useState, useRef, useEffect, useCallback } from 'react'
import { FileText, Sparkles, Languages, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'
import { MobileToolbar, MenuItem } from './MobileToolbar'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import type { Article } from '@/types'

// 允许的 HTML 标签和属性
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  ALLOW_DATA_ATTR: false,
}

export interface MobileArticleViewerProps {
  /** 文章数据 */
  article: Article | null
  /** 是否正在加载 */
  isLoading?: boolean
  /** 返回回调 */
  onBack?: () => void
  /** 收藏状态切换回调 */
  onToggleFavorite?: () => void
  /** 全文抓取回调 */
  onFetchFullContent?: () => void
  /** AI 摘要回调 */
  onAISummary?: () => void
  /** 翻译回调 */
  onTranslate?: () => void
  /** 上一篇文章 */
  onPrevious?: () => void
  /** 下一篇文章 */
  onNext?: () => void
  /** 是否有上一篇 */
  hasPrevious?: boolean
  /** 是否有下一篇 */
  hasNext?: boolean
  /** 阅读进度回调 (0-100) */
  onProgressChange?: (progress: number) => void
  /** 内容区自定义样式 */
  contentClassName?: string
}

// 滚动方向的类型
type ScrollDirection = 'up' | 'down' | null

export function MobileArticleViewer({
  article,
  isLoading = false,
  onBack,
  onToggleFavorite,
  onFetchFullContent,
  onAISummary,
  onTranslate,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  onProgressChange,
  contentClassName,
}: MobileArticleViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)
  const lastScrollTopRef = useRef(0)
  const lastScrollDirectionRef = useRef<ScrollDirection>(null)
  const progressThrottleRef = useRef<number | null>(null)

  // 滑动手势处理
  const { swipeState, handlers: swipeHandlers } = useSwipeGesture({
    threshold: 100,
    velocity: 0.3,
    onSwipeRight: () => {
      onBack?.()
    },
  })

  // 清理 HTML 内容 - 使用 DOMPurify
  const sanitizeHtml = useCallback((html?: string): string => {
    if (!html) return ''
    return DOMPurify.sanitize(html, SANITIZE_CONFIG)
  }, [])

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return

    const element = contentRef.current
    const scrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight - element.clientHeight
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0

    setScrollProgress(progress)

    // 节流更新进度回调
    if (onProgressChange && progressThrottleRef.current === null) {
      progressThrottleRef.current = window.setTimeout(() => {
        onProgressChange(Math.round(progress))
        progressThrottleRef.current = null
      }, 100)
    }

    // 检测滚动方向并控制工具栏显示
    const scrollDiff = scrollTop - lastScrollTopRef.current

    // 忽略微小滚动
    if (Math.abs(scrollDiff) < 10) return

    const newDirection: ScrollDirection = scrollDiff > 0 ? 'down' : 'up'

    // 在顶部时始终显示工具栏
    if (scrollTop <= 10) {
      setIsToolbarVisible(true)
    }
    // 向下滚动时隐藏工具栏
    else if (newDirection === 'down' && lastScrollDirectionRef.current !== 'down') {
      setIsToolbarVisible(false)
    }
    // 向上滚动时显示工具栏
    else if (newDirection === 'up' && lastScrollDirectionRef.current !== 'up') {
      setIsToolbarVisible(true)
    }

    lastScrollTopRef.current = scrollTop
    lastScrollDirectionRef.current = newDirection
  }, [onProgressChange])

  // 清理节流定时器
  useEffect(() => {
    return () => {
      if (progressThrottleRef.current !== null) {
        clearTimeout(progressThrottleRef.current)
      }
    }
  }, [])

  // 初始化滚动位置
  useEffect(() => {
    if (contentRef.current && article?.reading_progress) {
      const element = contentRef.current
      const scrollHeight = element.scrollHeight - element.clientHeight
      const scrollTop = (article.reading_progress / 100) * scrollHeight
      element.scrollTop = scrollTop
    }
  }, [article?.id, article?.reading_progress])

  // 切换文章时重置状态
  useEffect(() => {
    setScrollProgress(article?.reading_progress ?? 0)
    setIsToolbarVisible(true)
    lastScrollTopRef.current = 0
    lastScrollDirectionRef.current = null
  }, [article?.id, article?.reading_progress])

  // 构建菜单项
  const menuItems: MenuItem[] = []

  if (onFetchFullContent) {
    menuItems.push({
      label: '获取全文',
      icon: <FileText className="w-4 h-4" />,
      onClick: onFetchFullContent,
    })
  }

  if (onAISummary) {
    menuItems.push({
      label: 'AI 摘要',
      icon: <Sparkles className="w-4 h-4" />,
      onClick: onAISummary,
    })
  }

  if (onTranslate) {
    menuItems.push({
      label: '翻译',
      icon: <Languages className="w-4 h-4" />,
      onClick: onTranslate,
    })
  }

  // 获取显示的内容
  const getDisplayContent = () => {
    if (!article) return ''
    return article.content || article.description || ''
  }

  // 空状态渲染
  if (!article) {
    return (
      <div className="flex flex-col h-full bg-background">
        <MobileToolbar
          showBack={!!onBack}
          onBack={onBack}
          visible={isToolbarVisible}
        />
        <div
          data-testid="empty-state"
          className="flex-1 flex items-center justify-center text-muted-foreground"
        >
          <div className="text-center p-4">
            <p className="text-lg">选择一篇文章开始阅读</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* 滑动返回进度指示器 */}
      {swipeState.isSwiping && swipeState.direction === 'right' && (
        <div
          data-testid="swipe-progress-indicator"
          className="absolute left-0 top-0 bottom-0 bg-primary/20 z-40 transition-all"
          style={{ width: `${swipeState.progress * 100}%` }}
        >
          <div className="h-full w-1 bg-primary" />
        </div>
      )}

      {/* 顶部工具栏 */}
      <MobileToolbar
        title={article.title}
        showBack={!!onBack}
        onBack={onBack}
        isFavorited={article.favorite ?? false}
        onToggleFavorite={onToggleFavorite}
        menuItems={menuItems.length > 0 ? menuItems : undefined}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        visible={isToolbarVisible}
      />

      {/* 阅读进度条 */}
      <div
        data-testid="reading-progress-bar"
        className="h-1 bg-muted"
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div
          data-testid="loading-indicator"
          className="absolute inset-0 flex items-center justify-center bg-background/80 z-30"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* 内容区域 */}
      <div
        ref={contentRef}
        data-testid="article-content-area"
        role="article"
        tabIndex={0}
        className={cn(
          'flex-1 overflow-y-auto px-4 py-6 scroll-smooth',
          contentClassName
        )}
        onScroll={handleScroll}
        {...swipeHandlers}
      >
        <article className="mx-auto max-w-prose">
          {/* 文章标题 */}
          <h1 className="text-xl font-bold mb-4 text-foreground">
            {article.title}
          </h1>

          {/* 文章元信息 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-4 border-b border-border/60">
            {article.published_at && (
              <span>
                {formatDistanceToNow(new Date(article.published_at), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </span>
            )}
          </div>

          {/* 文章内容 */}
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(getDisplayContent()),
            }}
          />
        </article>
      </div>
    </div>
  )
}
