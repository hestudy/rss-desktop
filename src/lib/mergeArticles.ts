import type { Article } from '../types'

// 不可变的稳定字段（id, feed_id, link, created_at），无需比较
const STABLE_KEYS = new Set<keyof Article>(['id', 'feed_id', 'link', 'created_at'])

function articleChanged(a: Article, b: Article): boolean {
  const keys = Object.keys(b) as (keyof Article)[]
  return keys.some(key => !STABLE_KEYS.has(key) && a[key] !== b[key])
}

/**
 * 将新获取的文章与现有文章增量合并。
 * - 保持 incoming 的顺序（后端已排序）
 * - 已有文章仅在字段变化时更新引用，否则保留原引用
 * - 如果所有项引用都未变且顺序一致，返回原数组引用
 */
export function mergeArticles(existing: Article[], incoming: Article[]): Article[] {
  if (existing.length === 0) return incoming
  if (incoming.length === 0) return existing

  const existingMap = new Map<string, Article>()
  for (const article of existing) {
    existingMap.set(article.id, article)
  }

  let allSame = incoming.length === existing.length
  const merged = incoming.map((inc, i) => {
    const prev = existingMap.get(inc.id)
    if (prev && !articleChanged(prev, inc)) {
      if (allSame && existing[i] !== prev) allSame = false
      return prev
    }
    allSame = false
    return inc
  })

  return allSame ? existing : merged
}
