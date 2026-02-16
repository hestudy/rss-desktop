/**
 * Tauri API Mock Module
 *
 * This module is used to replace @tauri-apps/api/core in E2E tests.
 * It provides mock implementations of all Tauri commands.
 *
 * Usage in vite.config.ts:
 * ```ts
 * resolve: {
 *   alias: {
 *     '@tauri-apps/api/core': path.resolve(__dirname, 'tests/fixtures/tauri-api-mock.ts')
 *   }
 * }
 * ```
 */

import type { Article, FeedWithUnreadCount } from '../../src/types'

// --- Mock data ---------------------------------------------------------------

const MOCK_FEEDS: FeedWithUnreadCount[] = [
  {
    feed: {
      id: 'feed-1',
      url: 'https://example.com/feed.xml',
      title: 'Tech Blog',
      description: 'A technology blog',
      icon_url: undefined,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z',
    },
    unread_count: 3,
  },
  {
    feed: {
      id: 'feed-2',
      url: 'https://example.com/news.xml',
      title: 'Daily News',
      description: 'Breaking news feed',
      icon_url: undefined,
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-02-05T00:00:00Z',
    },
    unread_count: 1,
  },
]

const MOCK_ARTICLES: Article[] = [
  {
    id: 'article-1',
    feed_id: 'feed-1',
    title: 'Understanding TypeScript Generics',
    link: 'https://example.com/article-1',
    description: 'A deep dive into TypeScript generics and how to use them effectively.',
    content:
      '<h2>Introduction</h2><p>TypeScript generics allow you to write flexible, reusable code.</p>' +
      '<p>In this article, we explore the power of generics with practical examples.</p>' +
      '<h2>Basic Generics</h2><p>The simplest form of a generic is a function that works with any type.</p>' +
      '<pre><code>function identity&lt;T&gt;(arg: T): T { return arg; }</code></pre>' +
      '<h2>Advanced Patterns</h2><p>Generics can be constrained, conditional, and mapped.</p>' +
      '<p>These advanced patterns enable powerful type-level programming.</p>',
    published_at: '2025-02-06T10:00:00Z',
    read: false,
    created_at: '2025-02-06T10:00:00Z',
    reading_progress: 0,
    favorite: false,
    thumbnail_url: 'https://example.com/typescript-generics.jpg',
  },
  {
    id: 'article-2',
    feed_id: 'feed-1',
    title: 'Building Desktop Apps with Tauri v2',
    link: 'https://example.com/article-2',
    description: 'Learn how to build lightweight desktop applications using Tauri v2.',
    content:
      '<h2>What is Tauri?</h2><p>Tauri is a framework for building desktop apps with web technologies.</p>' +
      '<p>Unlike Electron, Tauri uses the system webview, resulting in smaller binaries.</p>' +
      '<h2>Getting Started</h2><p>Install the Tauri CLI and create a new project.</p>',
    published_at: '2025-02-05T14:30:00Z',
    read: true,
    created_at: '2025-02-05T14:30:00Z',
    reading_progress: 45,
    favorite: true,
  },
  {
    id: 'article-3',
    feed_id: 'feed-2',
    title: 'React 19 Released with New Features',
    link: 'https://example.com/article-3',
    description: 'React 19 brings exciting new features including server components.',
    content:
      '<h2>React 19 Highlights</h2><p>The React team has released version 19 with several improvements.</p>' +
      '<ul><li>Server Components</li><li>Improved hydration</li><li>Better error handling</li></ul>',
    published_at: '2025-02-04T09:15:00Z',
    read: false,
    created_at: '2025-02-04T09:15:00Z',
    reading_progress: 0,
    favorite: false,
    thumbnail_url: 'https://example.com/react19.png',
  },
]

// Mutable state
const articleState: Record<string, Article> = {}
MOCK_ARTICLES.forEach(a => { articleState[a.id] = { ...a } })

// --- Invoke handler ----------------------------------------------------------

async function mockInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  console.log(`[Tauri API Mock] invoke('${command}', ${JSON.stringify(args)})`)

  switch (command) {
    case 'get_feeds':
      return MOCK_FEEDS as T

    case 'get_articles': {
      let result = Object.values(articleState)
      if (args?.feedId) {
        result = result.filter(a => a.feed_id === args.feedId)
      }
      if (args?.unreadOnly) {
        result = result.filter(a => !a.read)
      }
      const isAllFeeds = !args?.feedId
      result.sort((a, b) => {
        const aTime = new Date(a.published_at || a.created_at).getTime()
        const bTime = new Date(b.published_at || b.created_at).getTime()
        if (isAllFeeds) {
          const readDiff = Number(a.read) - Number(b.read)
          return readDiff !== 0 ? readDiff : bTime - aTime
        }
        return bTime - aTime
      })
      if (args?.limit) {
        result = result.slice(0, args.limit as number)
      }
      return result as T
    }

    case 'get_article':
      return (articleState[args?.id as string] || null) as T

    case 'add_feed':
      return MOCK_FEEDS[0].feed as T

    case 'remove_feed':
      return undefined as T

    case 'refresh_feed':
      return (MOCK_FEEDS.find(f => f.feed.id === args?.id) || MOCK_FEEDS[0]) as T

    case 'refresh_all_feeds':
      return MOCK_FEEDS.map(f => ({
        ...f,
        feed: { ...f.feed, updated_at: new Date().toISOString() },
      })) as T

    case 'mark_article_read':
      if (articleState[args?.id as string]) {
        articleState[args?.id as string].read = args?.read as boolean
      }
      return undefined as T

    case 'mark_all_read':
      Object.values(articleState).forEach(a => {
        if (a.feed_id === args?.feedId) {
          a.read = true
        }
      })
      return undefined as T

    case 'get_unread_count': {
      let count: number
      if (args?.feedId) {
        count = Object.values(articleState).filter(a => a.feed_id === args.feedId && !a.read).length
      } else {
        count = Object.values(articleState).filter(a => !a.read).length
      }
      return count as T
    }

    case 'open_link':
      return undefined as T

    case 'update_reading_progress':
      if (articleState[args?.id as string]) {
        articleState[args?.id as string].reading_progress = args?.progress as number
      }
      return undefined as T

    case 'set_article_favorite':
      if (articleState[args?.id as string]) {
        articleState[args?.id as string].favorite = args?.favorite as boolean
      }
      return undefined as T

    case 'get_favorite_articles': {
      let result = Object.values(articleState).filter(a => a.favorite)
      if (args?.limit) {
        result = result.slice(0, args.limit as number)
      }
      return result as T
    }

    case 'fetch_full_content': {
      const art = articleState[args?.id as string]
      if (!art) {
        throw new Error('Article not found')
      }
      art.full_content = '<h2>Full Article Content</h2><p>This is the full article content fetched from the original website.</p>'
      return { ...art } as T
    }

    case 'generate_article_summary': {
      const art = articleState[args?.id as string]
      if (!art) {
        throw new Error('Article not found')
      }
      art.ai_summary = '这是一篇关于技术主题的文章。'
      return { ...art } as T
    }

    case 'translate_article': {
      const art = articleState[args?.id as string]
      if (!art) {
        throw new Error('Article not found')
      }
      art.ai_translation = '这是翻译后的文章内容。'
      return { ...art } as T
    }

    case 'get_ai_settings':
      return {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        maxTokens: 300,
        prompt: '你是一个专业的文章摘要助手。',
        enableAutoSummary: false,
        language: 'zh-CN',
        maxConcurrency: 3,
        customInputPrice: null,
        customOutputPrice: null,
      } as T

    case 'update_ai_settings':
      return args?.settings as T

    case 'update_feed_info': {
      const feed = MOCK_FEEDS.find(f => f.feed.id === args?.id)
      if (!feed) {
        throw new Error('Feed not found')
      }
      if (args?.title) feed.feed.title = args.title as string
      if (args?.url) feed.feed.url = args.url as string
      feed.feed.updated_at = new Date().toISOString()
      return feed as T
    }

    case 'get_store_value':
      return null as T

    case 'set_store_value':
      return undefined as T

    case 'get_settings':
      return {
        pollInterval: '30m',
        notificationType: 'system',
        enableNotifications: false,
        maxNotificationsPerBatch: 5,
        enableBackgroundRefresh: true,
        closeToTray: true,
      } as T

    case 'update_settings':
      return args?.settings as T

    case 'get_scheduler_state':
      return {
        isRunning: false,
        lastRunAt: null,
        nextRunAt: null,
        consecutiveErrors: 0,
      } as T

    case 'start_scheduler':
    case 'stop_scheduler':
      return undefined as T

    case 'get_feed_logs': {
      const feedId = args?.feedId as string
      return [
        {
          id: 'log-1',
          feed_id: feedId,
          feed_title: MOCK_FEEDS.find(f => f.feed.id === feedId)?.feed.title || 'Unknown',
          timestamp: '2025-02-06T10:00:00Z',
          success: true,
          new_article_count: 2,
          new_articles: [
            { title: 'New Article 1', link: 'https://example.com/new-1' },
            { title: 'New Article 2', link: 'https://example.com/new-2' },
          ],
          error: null,
          duration_ms: 350,
        },
      ] as T
    }

    case 'get_all_feed_logs':
      return [
        {
          id: 'log-g1',
          feed_id: 'feed-1',
          feed_title: 'Tech Blog',
          timestamp: '2025-02-06T10:00:00Z',
          success: true,
          new_article_count: 2,
          new_articles: [],
          error: null,
          duration_ms: 350,
        },
      ] as T

    case 'queue_get_status':
      return {
        pending_count: 1,
        running_count: 1,
        completed_count: 1,
        failed_count: 1,
        tasks: [],
      } as T

    case 'queue_cancel_task':
    case 'queue_clear_completed':
    case 'queue_add_task':
      return undefined as T

    case 'get_ai_usage_summary':
      return {
        total_prompt_tokens: 15000,
        total_completion_tokens: 5000,
        total_tokens: 20000,
        total_cost: 0.0035,
        total_calls: 10,
      } as T

    case 'clear_ai_usage_records':
      return undefined as T

    case 'get_builtin_model_prices':
      return [
        { model: 'gpt-4o-mini', input_price: 0.15, output_price: 0.6 },
        { model: 'gpt-4o', input_price: 2.5, output_price: 10 },
      ] as T

    case 'check_update':
      return null as T

    case 'export_config':
      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        feeds: MOCK_FEEDS.map(f => ({
          url: f.feed.url,
          title: f.feed.title,
        })),
        aiSettings: {},
        appSettings: {},
      } as T

    case 'import_config':
      return {
        success: true,
        feedsImported: 1,
        feedsSkipped: 0,
        settingsImported: true,
        aiSettingsImported: true,
      } as T

    case 'get_rsshub_radar_rules':
      return {} as T

    case 'detect_rsshub_feeds':
      return [] as T

    case 'search_rsshub_routes':
      return [] as T

    case 'test_rsshub_connection':
      return true as T

    case 'get_rsshub_settings':
      return {
        instance_url: 'https://rsshub.app',
        enabled: true,
      } as T

    case 'update_rsshub_settings':
      return args?.settings as T

    default:
      console.warn(`[Tauri API Mock] Unknown command: ${command}`)
      return null as T
  }
}

// Export the invoke function with the same signature as @tauri-apps/api/core
export { mockInvoke as invoke }

// Mock Resource class (used by Tauri plugins)
export class Resource {
  rid: number
  constructor(rid: number) {
    this.rid = rid
  }
}

// Mock Channel class (used by Tauri plugins for event-like communication)
export class Channel<T = unknown> {
  private listeners: Array<(data: T) => void> = []

  onmessage(handler: (data: T) => void): void {
    this.listeners.push(handler)
  }

  postMessage(data: T): void {
    this.listeners.forEach(handler => handler(data))
  }
}

// Export other commonly used Tauri API functions as mocks
export const convertFileSrc = (filePath: string): string => `file://${filePath}`

// Event listener mock
export const listen = async <T>(_event: string, _handler: (event: { payload: T }) => void): Promise<() => void> => {
  return () => {}
}
