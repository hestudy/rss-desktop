import { describe, it, expect } from 'vitest'
import { mergeArticles } from './mergeArticles'
import type { Article } from '../types'

function makeArticle(overrides: Partial<Article> & { id: string }): Article {
  return {
    feed_id: 'feed-1',
    title: `Article ${overrides.id}`,
    link: `https://example.com/${overrides.id}`,
    read: false,
    created_at: '2024-01-01T00:00:00Z',
    published_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('mergeArticles', () => {
  it('should return incoming articles when existing is empty', () => {
    const incoming = [makeArticle({ id: '1' }), makeArticle({ id: '2' })]
    const result = mergeArticles([], incoming)
    expect(result).toEqual(incoming)
  })

  it('should return existing articles when incoming is empty', () => {
    const existing = [makeArticle({ id: '1' })]
    const result = mergeArticles(existing, [])
    expect(result).toEqual(existing)
  })

  it('should preserve existing article references when data unchanged', () => {
    const a1 = makeArticle({ id: '1', title: 'Hello' })
    const a1Copy = makeArticle({ id: '1', title: 'Hello' })
    const result = mergeArticles([a1], [a1Copy])
    // Same reference — not a new object
    expect(result[0]).toBe(a1)
  })

  it('should update article reference when data changed', () => {
    const a1 = makeArticle({ id: '1', title: 'Old Title' })
    const a1Updated = makeArticle({ id: '1', title: 'New Title' })
    const result = mergeArticles([a1], [a1Updated])
    expect(result[0]).toBe(a1Updated)
    expect(result[0].title).toBe('New Title')
  })

  it('should prepend new articles to the list', () => {
    const existing = [makeArticle({ id: '1', published_at: '2024-01-01T00:00:00Z' })]
    const incoming = [
      makeArticle({ id: '2', published_at: '2024-01-02T00:00:00Z' }),
      makeArticle({ id: '1', published_at: '2024-01-01T00:00:00Z' }),
    ]
    const result = mergeArticles(existing, incoming)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('2')
    expect(result[1].id).toBe('1')
  })

  it('should preserve existing reference for unchanged articles in mixed update', () => {
    const a1 = makeArticle({ id: '1', title: 'Unchanged' })
    const a2 = makeArticle({ id: '2', title: 'Old' })
    const incoming = [
      makeArticle({ id: '2', title: 'Updated' }),
      makeArticle({ id: '1', title: 'Unchanged' }),
    ]
    const result = mergeArticles([a2, a1], incoming)
    expect(result.find(a => a.id === '1')).toBe(a1)
    expect(result.find(a => a.id === '2')!.title).toBe('Updated')
  })

  it('should maintain incoming order', () => {
    const existing = [
      makeArticle({ id: '1', published_at: '2024-01-01T00:00:00Z' }),
    ]
    const incoming = [
      makeArticle({ id: '3', published_at: '2024-01-03T00:00:00Z' }),
      makeArticle({ id: '2', published_at: '2024-01-02T00:00:00Z' }),
      makeArticle({ id: '1', published_at: '2024-01-01T00:00:00Z' }),
    ]
    const result = mergeArticles(existing, incoming)
    expect(result.map(a => a.id)).toEqual(['3', '2', '1'])
  })

  it('should return same array reference when nothing changed', () => {
    const a1 = makeArticle({ id: '1' })
    const a2 = makeArticle({ id: '2' })
    const existing = [a1, a2]
    const incoming = [makeArticle({ id: '1' }), makeArticle({ id: '2' })]
    const result = mergeArticles(existing, incoming)
    // All items unchanged and same order → same array reference
    expect(result).toBe(existing)
  })
})
