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

describe('RssApi - 订阅管理', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addFeed', () => {
    it('应该使用所有参数添加订阅', async () => {
      const mockFeed = { id: 'feed-1', title: 'Test Feed', url: 'https://example.com/rss' }
      mockInvoke.mockResolvedValue(mockFeed)

      const result = await RssApi.addFeed('https://example.com/rss', true, false, true)

      expect(mockInvoke).toHaveBeenCalledWith('add_feed', {
        url: 'https://example.com/rss',
        useFullContent: true,
        useAiSummary: false,
        useAiTranslation: true,
      })
      expect(result).toEqual(mockFeed)
    })

    it('应该支持仅传 url 的情况', async () => {
      const mockFeed = { id: 'feed-1', title: 'Test Feed', url: 'https://example.com/rss' }
      mockInvoke.mockResolvedValue(mockFeed)

      await RssApi.addFeed('https://example.com/rss')

      expect(mockInvoke).toHaveBeenCalledWith('add_feed', {
        url: 'https://example.com/rss',
        useFullContent: undefined,
        useAiSummary: undefined,
        useAiTranslation: undefined,
      })
    })
  })

  describe('getFeeds', () => {
    it('应该获取所有订阅', async () => {
      const mockFeeds = [{ id: 'feed-1', title: 'Feed 1', unread_count: 3 }]
      mockInvoke.mockResolvedValue(mockFeeds)

      const result = await RssApi.getFeeds()

      expect(mockInvoke).toHaveBeenCalledWith('get_feeds')
      expect(result).toEqual(mockFeeds)
    })
  })

  describe('removeFeed', () => {
    it('应该删除指定订阅', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.removeFeed('feed-1')

      expect(mockInvoke).toHaveBeenCalledWith('remove_feed', { id: 'feed-1' })
    })
  })

  describe('refreshFeed', () => {
    it('应该刷新单个订阅并返回结果', async () => {
      const mockFeed = { id: 'feed-1', title: 'Feed 1', unread_count: 5 }
      mockInvoke.mockResolvedValue(mockFeed)

      const result = await RssApi.refreshFeed('feed-1')

      expect(mockInvoke).toHaveBeenCalledWith('refresh_feed', { id: 'feed-1' })
      expect(result).toEqual(mockFeed)
    })
  })

  describe('refreshAllFeeds', () => {
    it('应该刷新所有订阅', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.refreshAllFeeds()

      expect(mockInvoke).toHaveBeenCalledWith('refresh_all_feeds')
    })
  })

  describe('updateFeed', () => {
    it('应该使用所有参数更新订阅', async () => {
      const mockFeed = { id: 'feed-1', title: 'Updated', unread_count: 0 }
      mockInvoke.mockResolvedValue(mockFeed)

      const result = await RssApi.updateFeed('feed-1', 'Updated', 'https://new.com/rss', true, true, false)

      expect(mockInvoke).toHaveBeenCalledWith('update_feed_info', {
        id: 'feed-1',
        title: 'Updated',
        url: 'https://new.com/rss',
        useFullContent: true,
        useAiSummary: true,
        useAiTranslation: false,
      })
      expect(result).toEqual(mockFeed)
    })
  })
})

describe('RssApi - 文章操作', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getArticles', () => {
    it('应该使用参数获取文章列表', async () => {
      const mockArticles = [{ id: 'a-1', title: 'Article 1' }]
      mockInvoke.mockResolvedValue(mockArticles)

      const result = await RssApi.getArticles({ feed_id: 'feed-1', limit: 10, unread_only: true })

      expect(mockInvoke).toHaveBeenCalledWith('get_articles', {
        feedId: 'feed-1',
        limit: 10,
        unreadOnly: true,
      })
      expect(result).toEqual(mockArticles)
    })

    it('应该支持无参数调用', async () => {
      mockInvoke.mockResolvedValue([])

      await RssApi.getArticles()

      expect(mockInvoke).toHaveBeenCalledWith('get_articles', {
        feedId: undefined,
        limit: undefined,
        unreadOnly: undefined,
      })
    })
  })

  describe('markArticleRead', () => {
    it('应该标记文章为已读', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.markArticleRead('article-1', true)

      expect(mockInvoke).toHaveBeenCalledWith('mark_article_read', { id: 'article-1', read: true })
    })
  })

  describe('markAllRead', () => {
    it('应该标记订阅下所有文章为已读', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.markAllRead('feed-1')

      expect(mockInvoke).toHaveBeenCalledWith('mark_all_read', { feedId: 'feed-1' })
    })
  })

  describe('getUnreadCount', () => {
    it('应该获取指定订阅的未读数', async () => {
      mockInvoke.mockResolvedValue(42)

      const result = await RssApi.getUnreadCount('feed-1')

      expect(mockInvoke).toHaveBeenCalledWith('get_unread_count', { feedId: 'feed-1' })
      expect(result).toBe(42)
    })

    it('应该支持不传 feedId 获取全部未读数', async () => {
      mockInvoke.mockResolvedValue(100)

      const result = await RssApi.getUnreadCount()

      expect(mockInvoke).toHaveBeenCalledWith('get_unread_count', { feedId: undefined })
      expect(result).toBe(100)
    })
  })

  describe('openLink', () => {
    it('应该在浏览器中打开链接', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.openLink('https://example.com')

      expect(mockInvoke).toHaveBeenCalledWith('open_link', { url: 'https://example.com' })
    })
  })

  describe('fetchFullContent', () => {
    it('应该获取文章全文', async () => {
      const mockArticle = { id: 'a-1', content: '<p>Full content</p>' }
      mockInvoke.mockResolvedValue(mockArticle)

      const result = await RssApi.fetchFullContent('a-1')

      expect(mockInvoke).toHaveBeenCalledWith('fetch_full_content', { id: 'a-1' })
      expect(result).toEqual(mockArticle)
    })
  })
})

describe('RssApi - AI 功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSummary', () => {
    it('应该生成文章摘要', async () => {
      const mockArticle = { id: 'a-1', ai_summary: 'Summary text' }
      mockInvoke.mockResolvedValue(mockArticle)

      const result = await RssApi.generateSummary('a-1')

      expect(mockInvoke).toHaveBeenCalledWith('generate_article_summary', { id: 'a-1' })
      expect(result).toEqual(mockArticle)
    })
  })

  describe('translateArticle', () => {
    it('应该翻译文章并指定目标语言', async () => {
      const mockArticle = { id: 'a-1', translated_content: '翻译内容' }
      mockInvoke.mockResolvedValue(mockArticle)

      const result = await RssApi.translateArticle('a-1', 'zh-CN')

      expect(mockInvoke).toHaveBeenCalledWith('translate_article', { id: 'a-1', targetLang: 'zh-CN' })
      expect(result).toEqual(mockArticle)
    })

    it('应该支持不传目标语言', async () => {
      const mockArticle = { id: 'a-1' }
      mockInvoke.mockResolvedValue(mockArticle)

      await RssApi.translateArticle('a-1')

      expect(mockInvoke).toHaveBeenCalledWith('translate_article', { id: 'a-1', targetLang: undefined })
    })
  })

  describe('getAiUsageSummary', () => {
    it('应该获取 AI 使用统计', async () => {
      const mockSummary = { totalTokens: 1000, totalCost: 0.5 }
      mockInvoke.mockResolvedValue(mockSummary)

      const result = await RssApi.getAiUsageSummary()

      expect(mockInvoke).toHaveBeenCalledWith('get_ai_usage_summary')
      expect(result).toEqual(mockSummary)
    })
  })

  describe('clearAiUsageRecords', () => {
    it('应该清除 AI 使用记录', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.clearAiUsageRecords()

      expect(mockInvoke).toHaveBeenCalledWith('clear_ai_usage_records')
    })
  })

  describe('getBuiltinModelPrices', () => {
    it('应该获取内置模型价格列表', async () => {
      const mockPrices = [{ model: 'gpt-4', inputPrice: 0.03, outputPrice: 0.06 }]
      mockInvoke.mockResolvedValue(mockPrices)

      const result = await RssApi.getBuiltinModelPrices()

      expect(mockInvoke).toHaveBeenCalledWith('get_builtin_model_prices')
      expect(result).toEqual(mockPrices)
    })
  })
})

describe('RssApi - 任务队列', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('queueAddTask', () => {
    it('应该添加任务到队列并传递所有选项', async () => {
      mockInvoke.mockResolvedValue('task-123')

      const result = await RssApi.queueAddTask('fetch_full_content', 'a-1', {
        url: 'https://example.com',
        targetLang: 'zh-CN',
        priority: 'high',
      })

      expect(mockInvoke).toHaveBeenCalledWith('queue_add_task', {
        taskType: 'fetch_full_content',
        articleId: 'a-1',
        url: 'https://example.com',
        targetLang: 'zh-CN',
        priority: 'high',
      })
      expect(result).toBe('task-123')
    })

    it('应该支持不传 options', async () => {
      mockInvoke.mockResolvedValue('task-456')

      await RssApi.queueAddTask('generate_summary', 'a-2')

      expect(mockInvoke).toHaveBeenCalledWith('queue_add_task', {
        taskType: 'generate_summary',
        articleId: 'a-2',
        url: undefined,
        targetLang: undefined,
        priority: undefined,
      })
    })
  })

  describe('queueGetStatus', () => {
    it('应该获取队列状态快照', async () => {
      const mockStatus = { pending: 2, running: 1, completed: 5 }
      mockInvoke.mockResolvedValue(mockStatus)

      const result = await RssApi.queueGetStatus()

      expect(mockInvoke).toHaveBeenCalledWith('queue_get_status')
      expect(result).toEqual(mockStatus)
    })
  })

  describe('queueCancelTask', () => {
    it('应该取消指定任务', async () => {
      mockInvoke.mockResolvedValue(undefined)

      await RssApi.queueCancelTask('task-123')

      expect(mockInvoke).toHaveBeenCalledWith('queue_cancel_task', { taskId: 'task-123' })
    })
  })

  describe('queueClearCompleted', () => {
    it('应该清除已完成任务并返回清除数量', async () => {
      mockInvoke.mockResolvedValue(3)

      const result = await RssApi.queueClearCompleted()

      expect(mockInvoke).toHaveBeenCalledWith('queue_clear_completed')
      expect(result).toBe(3)
    })
  })
})

describe('RssApi - 日志', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getFeedLogs', () => {
    it('应该获取指定订阅的日志', async () => {
      const mockLogs = [{ id: 'log-1', feedId: 'feed-1', message: 'Refreshed' }]
      mockInvoke.mockResolvedValue(mockLogs)

      const result = await RssApi.getFeedLogs('feed-1', 50)

      expect(mockInvoke).toHaveBeenCalledWith('get_feed_logs', { feedId: 'feed-1', limit: 50 })
      expect(result).toEqual(mockLogs)
    })

    it('应该支持不传 limit', async () => {
      mockInvoke.mockResolvedValue([])

      await RssApi.getFeedLogs('feed-1')

      expect(mockInvoke).toHaveBeenCalledWith('get_feed_logs', { feedId: 'feed-1', limit: undefined })
    })
  })

  describe('getAllFeedLogs', () => {
    it('应该获取所有订阅日志', async () => {
      const mockLogs = [{ id: 'log-1', message: 'Log entry' }]
      mockInvoke.mockResolvedValue(mockLogs)

      const result = await RssApi.getAllFeedLogs(100)

      expect(mockInvoke).toHaveBeenCalledWith('get_all_feed_logs', { limit: 100 })
      expect(result).toEqual(mockLogs)
    })

    it('应该支持不传 limit', async () => {
      mockInvoke.mockResolvedValue([])

      await RssApi.getAllFeedLogs()

      expect(mockInvoke).toHaveBeenCalledWith('get_all_feed_logs', { limit: undefined })
    })
  })
})
