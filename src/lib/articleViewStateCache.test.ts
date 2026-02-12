import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDefaultState,
  saveArticleViewState,
  loadArticleViewState,
  clearStaleEntries,
  getCacheSize,
  clearAllCache,

} from './articleViewStateCache'

describe('articleViewStateCache', () => {
  beforeEach(() => {
    clearAllCache()
  })

  describe('createDefaultState', () => {
    it('should return default state with all fields initialized', () => {
      const state = createDefaultState()

      expect(state).toEqual({
        fetchedFullContent: null,
        contentMode: 'original',
        isFetchingContent: false,
        aiSummary: null,
        isGeneratingSummary: false,
        summaryCollapsed: false,
        aiTranslation: null,
        isTranslating: false,
        showTranslation: false,
        fetchError: null,
        hasAttemptedAutoFetch: false,
        hasAttemptedAutoSummary: false,
        isFullContentFetched: false,
      })
    })

    it('should use article data when provided', () => {
      const state = createDefaultState({
        full_content: '<p>Full</p>',
        ai_summary: 'Summary text',
        ai_translation: '<p>Translated</p>',
      })

      expect(state.contentMode).toBe('fulltext')
      expect(state.aiSummary).toBe('Summary text')
      expect(state.aiTranslation).toBe('<p>Translated</p>')
    })

    it('should set contentMode to fulltext when full_content exists', () => {
      const state = createDefaultState({ full_content: '<p>content</p>' })
      expect(state.contentMode).toBe('fulltext')
    })

    it('should keep contentMode as original when no full_content', () => {
      const state = createDefaultState({ ai_summary: 'summary' })
      expect(state.contentMode).toBe('original')
    })
  })

  describe('saveArticleViewState / loadArticleViewState', () => {
    it('should save and load state by article ID', () => {
      const state = createDefaultState()
      state.aiSummary = 'test summary'
      state.contentMode = 'fulltext'

      saveArticleViewState('art-1', state)
      const loaded = loadArticleViewState('art-1')

      expect(loaded).toEqual(state)
    })

    it('should return null for unknown article ID', () => {
      expect(loadArticleViewState('nonexistent')).toBeNull()
    })

    it('should overwrite existing state on re-save', () => {
      const state1 = createDefaultState()
      state1.aiSummary = 'first'
      saveArticleViewState('art-1', state1)

      const state2 = createDefaultState()
      state2.aiSummary = 'second'
      saveArticleViewState('art-1', state2)

      const loaded = loadArticleViewState('art-1')
      expect(loaded?.aiSummary).toBe('second')
    })

    it('should not share references between saved and loaded state', () => {
      const state = createDefaultState()
      state.aiSummary = 'original'
      saveArticleViewState('art-1', state)

      state.aiSummary = 'mutated'
      const loaded = loadArticleViewState('art-1')
      expect(loaded?.aiSummary).toBe('original')
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache exceeds MAX_CACHE_SIZE', () => {
      for (let i = 0; i < 51; i++) {
        saveArticleViewState(`art-${i}`, createDefaultState())
      }

      expect(getCacheSize()).toBe(50)
      expect(loadArticleViewState('art-0')).toBeNull()
      expect(loadArticleViewState('art-1')).not.toBeNull()
    })

    it('should refresh access order on load', () => {
      for (let i = 0; i < 50; i++) {
        saveArticleViewState(`art-${i}`, createDefaultState())
      }

      loadArticleViewState('art-0')

      saveArticleViewState('art-50', createDefaultState())

      expect(loadArticleViewState('art-0')).not.toBeNull()
      expect(loadArticleViewState('art-1')).toBeNull()
    })
  })

  describe('clearStaleEntries', () => {
    it('should remove entries not in valid IDs list', () => {
      saveArticleViewState('art-1', createDefaultState())
      saveArticleViewState('art-2', createDefaultState())
      saveArticleViewState('art-3', createDefaultState())

      clearStaleEntries(['art-1', 'art-3'])

      expect(loadArticleViewState('art-1')).not.toBeNull()
      expect(loadArticleViewState('art-2')).toBeNull()
      expect(loadArticleViewState('art-3')).not.toBeNull()
      expect(getCacheSize()).toBe(2)
    })

    it('should handle empty valid IDs list', () => {
      saveArticleViewState('art-1', createDefaultState())
      clearStaleEntries([])
      expect(getCacheSize()).toBe(0)
    })
  })

  describe('clearAllCache', () => {
    it('should remove all entries', () => {
      saveArticleViewState('art-1', createDefaultState())
      saveArticleViewState('art-2', createDefaultState())

      clearAllCache()

      expect(getCacheSize()).toBe(0)
      expect(loadArticleViewState('art-1')).toBeNull()
    })
  })

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(getCacheSize()).toBe(0)
    })

    it('should return correct count', () => {
      saveArticleViewState('art-1', createDefaultState())
      saveArticleViewState('art-2', createDefaultState())
      expect(getCacheSize()).toBe(2)
    })
  })
})
