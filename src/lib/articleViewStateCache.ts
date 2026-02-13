export interface ArticleViewState {
  fetchedFullContent: string | null
  contentMode: 'original' | 'fulltext'
  isFetchingContent: boolean
  aiSummary: string | null
  isGeneratingSummary: boolean
  summaryCollapsed: boolean
  aiTranslation: string | null
  isTranslating: boolean
  showTranslation: boolean
  fetchError: string | null
  hasAttemptedAutoFetch: boolean
  hasAttemptedAutoSummary: boolean
  isFullContentFetched: boolean
}

const MAX_CACHE_SIZE = 50

const cache = new Map<string, ArticleViewState>()

const accessOrder: string[] = []

function touchAccessOrder(articleId: string): void {
  const idx = accessOrder.indexOf(articleId)
  if (idx !== -1) accessOrder.splice(idx, 1)
  accessOrder.push(articleId)
}

function evictIfNeeded(): void {
  while (cache.size > MAX_CACHE_SIZE && accessOrder.length > 0) {
    const oldest = accessOrder.shift()!
    cache.delete(oldest)
  }
}

export function createDefaultState(article?: { full_content?: string; ai_summary?: string; ai_translation?: string }): ArticleViewState {
  return {
    fetchedFullContent: null,
    contentMode: article?.full_content ? 'fulltext' : 'original',
    isFetchingContent: false,
    aiSummary: article?.ai_summary ?? null,
    isGeneratingSummary: false,
    summaryCollapsed: false,
    aiTranslation: article?.ai_translation ?? null,
    isTranslating: false,
    showTranslation: !!article?.ai_translation,
    fetchError: null,
    hasAttemptedAutoFetch: false,
    hasAttemptedAutoSummary: false,
    isFullContentFetched: false,
  }
}

export function saveArticleViewState(articleId: string, state: ArticleViewState): void {
  cache.set(articleId, { ...state })
  touchAccessOrder(articleId)
  evictIfNeeded()
}

export function loadArticleViewState(articleId: string): ArticleViewState | null {
  const state = cache.get(articleId)
  if (!state) return null
  touchAccessOrder(articleId)
  return { ...state }
}

export function clearStaleEntries(validArticleIds: string[]): void {
  const validSet = new Set(validArticleIds)
  for (const key of [...cache.keys()]) {
    if (!validSet.has(key)) {
      cache.delete(key)
      const idx = accessOrder.indexOf(key)
      if (idx !== -1) accessOrder.splice(idx, 1)
    }
  }
}

export function getCacheSize(): number {
  return cache.size
}

export function clearAllCache(): void {
  cache.clear()
  accessOrder.length = 0
}
