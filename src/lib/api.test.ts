/**
 * RssApi 测试
 *
 * 注意：这些测试需要模拟 Tauri invoke 函数
 * 在实际测试环境中，我们需要使用 Vitest 和 Tauri 的测试工具
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RssApi } from './api'

// 模拟 Tauri invoke 函数
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

const mockInvoke = invoke as ReturnType<typeof vi.fn>

describe('RssApi - 阅读器功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getArticle', () => {
    it('应该成功获取单个文章', async () => {
      const mockArticle = {
        id: 'article-1',
        feed_id: 'feed-1',
        title: 'Test Article',
        link: 'https://example.com/article',
        description: 'Test Description',
        content: '<p>Test Content</p>',
        published_at: '2024-01-01T00:00:00Z',
        read: false,
        created_at: '2024-01-01T00:00:00Z',
        reading_progress: 50,
        favorite: false,
      }

      mockInvoke.mockResolvedValue(mockArticle)

      const result = await RssApi.getArticle('article-1')

      expect(mockInvoke).toHaveBeenCalledWith('get_article', { id: 'article-1' })
      expect(result).toEqual(mockArticle)
    })

    it('应该返回 null 当文章不存在时', async () => {
      mockInvoke.mockResolvedValue(null)

      const result = await RssApi.getArticle('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('updateReadingProgress', () => {
    it('应该成功更新阅读进度', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.updateReadingProgress('article-1', 75)

      expect(mockInvoke).toHaveBeenCalledWith('update_reading_progress', {
        id: 'article-1',
        progress: 75,
      })
    })

    it('应该处理 0 的进度', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.updateReadingProgress('article-1', 0)

      expect(mockInvoke).toHaveBeenCalledWith('update_reading_progress', {
        id: 'article-1',
        progress: 0,
      })
    })

    it('应该处理 100 的进度', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.updateReadingProgress('article-1', 100)

      expect(mockInvoke).toHaveBeenCalledWith('update_reading_progress', {
        id: 'article-1',
        progress: 100,
      })
    })

    it('应该抛出错误当更新失败时', async () => {
      mockInvoke.mockRejectedValue(new Error('Article not found'))

      await expect(RssApi.updateReadingProgress('nonexistent', 50)).rejects.toThrow(
        'Article not found'
      )
    })
  })

  describe('setArticleFavorite', () => {
    it('应该成功收藏文章', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.setArticleFavorite('article-1', true)

      expect(mockInvoke).toHaveBeenCalledWith('set_article_favorite', {
        id: 'article-1',
        favorite: true,
      })
    })

    it('应该成功取消收藏文章', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.setArticleFavorite('article-1', false)

      expect(mockInvoke).toHaveBeenCalledWith('set_article_favorite', {
        id: 'article-1',
        favorite: false,
      })
    })

    it('应该抛出错误当操作失败时', async () => {
      mockInvoke.mockRejectedValue(new Error('Article not found'))

      await expect(RssApi.setArticleFavorite('nonexistent', true)).rejects.toThrow(
        'Article not found'
      )
    })
  })

  describe('getFavoriteArticles', () => {
    it('应该成功获取所有收藏文章', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          feed_id: 'feed-1',
          title: 'Favorite Article 1',
          link: 'https://example.com/1',
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          favorite: true,
        },
        {
          id: 'article-2',
          feed_id: 'feed-1',
          title: 'Favorite Article 2',
          link: 'https://example.com/2',
          read: false,
          created_at: '2024-01-02T00:00:00Z',
          favorite: true,
        },
      ]

      mockInvoke.mockResolvedValue(mockArticles)

      const result = await RssApi.getFavoriteArticles()

      expect(mockInvoke).toHaveBeenCalledWith('get_favorite_articles', { limit: undefined })
      expect(result).toEqual(mockArticles)
      expect(result).toHaveLength(2)
    })

    it('应该支持限制返回数量', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          feed_id: 'feed-1',
          title: 'Favorite Article 1',
          link: 'https://example.com/1',
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          favorite: true,
        },
      ]

      mockInvoke.mockResolvedValue(mockArticles)

      const result = await RssApi.getFavoriteArticles(5)

      expect(mockInvoke).toHaveBeenCalledWith('get_favorite_articles', { limit: 5 })
      expect(result).toHaveLength(1)
    })

    it('应该返回空数组当没有收藏文章时', async () => {
      mockInvoke.mockResolvedValue([])

      const result = await RssApi.getFavoriteArticles()

      expect(result).toEqual([])
    })
  })
})
