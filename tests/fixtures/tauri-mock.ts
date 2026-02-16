/**
 * Tauri invoke mock for E2E tests
 *
 * Since the Vite dev server runs without the Rust backend,
 * we need to mock all @tauri-apps/api/core invoke calls.
 * This script is injected via page.addInitScript() before navigation.
 */

import type { Feed, Article, FeedWithUnreadCount } from '../../src/types'

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
    // Article with thumbnail
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
    // Article without thumbnail (to test both cases)
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
    // Article with another thumbnail
    thumbnail_url: 'https://example.com/react19.png',
  },
]

// --- Mutable state for interaction tracking ----------------------------------

const state = {
  articles: [...MOCK_ARTICLES],
  feeds: [...MOCK_FEEDS],
}

// --- Build the mock invoke function ------------------------------------------

export function buildTauriMockScript(): string {
  return `
(function() {
  // Mock state (copies of data to allow mutation)
  const feeds = ${JSON.stringify(MOCK_FEEDS)};
  const articles = ${JSON.stringify(MOCK_ARTICLES)};

  // Track article mutations
  const articleState = {};
  articles.forEach(a => { articleState[a.id] = { ...a }; });

  window.__TAURI_MOCK_CALLS__ = [];

  // Mock invoke handler
  function mockInvoke(command, args) {
    window.__TAURI_MOCK_CALLS__.push({ command, args, timestamp: Date.now() });

    switch (command) {
      case 'get_feeds':
        return Promise.resolve(feeds);

      case 'get_articles': {
        let result = Object.values(articleState);
        if (args && args.feedId) {
          result = result.filter(a => a.feed_id === args.feedId);
        }
        if (args && args.unreadOnly) {
          result = result.filter(a => !a.read);
        }
        const isAllFeeds = !args || !args.feedId;
        result.sort((a, b) => {
          const aTime = new Date(a.published_at || a.created_at).getTime();
          const bTime = new Date(b.published_at || b.created_at).getTime();
          if (isAllFeeds) {
            const readDiff = Number(a.read) - Number(b.read);
            return readDiff !== 0 ? readDiff : bTime - aTime;
          }
          return bTime - aTime;
        });
        if (args && args.limit) {
          result = result.slice(0, args.limit);
        }
        return Promise.resolve(result);
      }

      case 'get_article': {
        const article = articleState[args.id] || null;
        return Promise.resolve(article);
      }

      case 'add_feed':
        return Promise.resolve(feeds[0].feed);

      case 'remove_feed':
        return Promise.resolve(undefined);

      case 'refresh_feed':
        return Promise.resolve(feeds.find(f => f.feed.id === args.id) || feeds[0]);

      case 'refresh_all_feeds':
        return Promise.resolve(feeds.map(f => ({
          ...f,
          feed: { ...f.feed, updated_at: new Date().toISOString() },
        })));

      case 'mark_article_read': {
        if (articleState[args.id]) {
          articleState[args.id].read = args.read;
        }
        return Promise.resolve(undefined);
      }

      case 'mark_all_read': {
        Object.values(articleState).forEach(a => {
          if (a.feed_id === args.feedId) {
            a.read = true;
          }
        });
        return Promise.resolve(undefined);
      }

      case 'get_unread_count': {
        let count;
        if (args && args.feedId) {
          count = Object.values(articleState).filter(a => a.feed_id === args.feedId && !a.read).length;
        } else {
          count = Object.values(articleState).filter(a => !a.read).length;
        }
        return Promise.resolve(count);
      }

      case 'open_link':
        return Promise.resolve(undefined);

      case 'update_reading_progress': {
        if (articleState[args.id]) {
          articleState[args.id].reading_progress = args.progress;
        }
        return Promise.resolve(undefined);
      }

      case 'set_article_favorite': {
        if (articleState[args.id]) {
          articleState[args.id].favorite = args.favorite;
        }
        return Promise.resolve(undefined);
      }

      case 'get_favorite_articles': {
        let result = Object.values(articleState).filter(a => a.favorite);
        if (args && args.limit) {
          result = result.slice(0, args.limit);
        }
        return Promise.resolve(result);
      }

      case 'fetch_full_content': {
        const art = articleState[args.id];
        if (!art) {
          return Promise.reject('Article not found');
        }
        const fullContent =
          '<h2>Full Article Content</h2>' +
          '<p>This is the full article content fetched from the original website.</p>' +
          '<p>It contains much more detail than the RSS summary.</p>' +
          '<p>The readability algorithm extracted only the main content.</p>';
        art.full_content = fullContent;
        return Promise.resolve({ ...art });
      }

      case 'generate_article_summary': {
        const summaryArt = articleState[args.id];
        if (!summaryArt) {
          return Promise.reject('Article not found');
        }
        summaryArt.ai_summary = '这是一篇关于技术主题的文章。文章主要讨论了核心概念和实践应用，提供了详细的代码示例和最佳实践建议。';
        return Promise.resolve({ ...summaryArt });
      }

      case 'get_ai_settings':
        return Promise.resolve({
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
        });

      case 'update_ai_settings':
        return Promise.resolve(args.settings || {
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
        });

      case 'update_feed_info': {
        const feed = feeds.find(f => f.feed.id === args.id);
        if (!feed) {
          return Promise.reject('Feed not found');
        }
        if (args.title) {
          feed.feed.title = args.title;
        }
        if (args.url) {
          feed.feed.url = args.url;
        }
        feed.feed.updated_at = new Date().toISOString();
        return Promise.resolve(feed);
      }

      case 'get_store_value':
        return Promise.resolve(null);

      case 'set_store_value':
        return Promise.resolve(undefined);

      case 'get_settings':
        return Promise.resolve({
          pollInterval: '30m',
          notificationType: 'system',
          enableNotifications: false,
          maxNotificationsPerBatch: 5,
          enableBackgroundRefresh: true,
          closeToTray: true,
        });

      case 'update_settings':
        return Promise.resolve(args.settings || {
          pollInterval: '30m',
          notificationType: 'system',
          enableNotifications: false,
          maxNotificationsPerBatch: 5,
          enableBackgroundRefresh: true,
          closeToTray: true,
        });

      case 'get_scheduler_state':
        return Promise.resolve({
          isRunning: false,
          lastRunAt: null,
          nextRunAt: null,
          consecutiveErrors: 0,
        });

      case 'start_scheduler':
      case 'stop_scheduler':
        return Promise.resolve(undefined);

      case 'get_feed_logs': {
        const feedId = args.feedId;
        const mockLogs = [
          {
            id: 'log-1',
            feed_id: feedId,
            feed_title: feeds.find(f => f.feed.id === feedId)?.feed.title || 'Unknown',
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
          {
            id: 'log-2',
            feed_id: feedId,
            feed_title: feeds.find(f => f.feed.id === feedId)?.feed.title || 'Unknown',
            timestamp: '2025-02-05T08:00:00Z',
            success: false,
            new_article_count: 0,
            new_articles: [],
            error: 'Network timeout',
            duration_ms: 5000,
          },
        ];
        return Promise.resolve(mockLogs);
      }

      case 'get_all_feed_logs': {
        const allLogs = [
          {
            id: 'log-g1',
            feed_id: 'feed-1',
            feed_title: 'Tech Blog',
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
          {
            id: 'log-g2',
            feed_id: 'feed-2',
            feed_title: 'Daily News',
            timestamp: '2025-02-05T08:00:00Z',
            success: false,
            new_article_count: 0,
            new_articles: [],
            error: 'Connection refused',
            duration_ms: 3000,
          },
        ];
        return Promise.resolve(allLogs);
      }

      case 'queue_get_status':
        return Promise.resolve({
          pending_count: 1,
          running_count: 1,
          completed_count: 1,
          failed_count: 1,
          tasks: [
            {
              id: 'task-1',
              task_type: { type: 'ai_summary', article_id: 'article-1' },
              priority: 'normal',
              status: { status: 'running' },
              created_at: '2025-02-06T10:00:00Z',
              started_at: '2025-02-06T10:00:01Z',
              completed_at: null,
            },
            {
              id: 'task-2',
              task_type: { type: 'fetch_full_content', article_id: 'article-2', url: 'https://example.com/article-2' },
              priority: 'normal',
              status: { status: 'pending' },
              created_at: '2025-02-06T10:00:02Z',
              started_at: null,
              completed_at: null,
            },
            {
              id: 'task-3',
              task_type: { type: 'ai_translation', article_id: 'article-3', target_lang: 'zh-CN' },
              priority: 'normal',
              status: { status: 'completed' },
              created_at: '2025-02-06T09:50:00Z',
              started_at: '2025-02-06T09:50:01Z',
              completed_at: '2025-02-06T09:50:05Z',
            },
            {
              id: 'task-4',
              task_type: { type: 'ai_summary', article_id: 'article-1' },
              priority: 'normal',
              status: { status: 'failed', error: 'API rate limit exceeded', retries: 2 },
              created_at: '2025-02-06T09:40:00Z',
              started_at: '2025-02-06T09:40:01Z',
              completed_at: '2025-02-06T09:40:03Z',
            },
          ],
        });

      case 'queue_cancel_task':
        return Promise.resolve(undefined);

      case 'queue_clear_completed':
        return Promise.resolve(1);

      case 'queue_add_task':
        return Promise.resolve('task-new-1');

      case 'translate_article': {
        const transArt = articleState[args.id];
        if (!transArt) {
          return Promise.reject('Article not found');
        }
        transArt.ai_translation = '这是翻译后的文章内容。TypeScript 泛型允许你编写灵活、可复用的代码。';
        return Promise.resolve({ ...transArt });
      }

      case 'get_ai_usage_summary':
        return Promise.resolve({
          total_prompt_tokens: 15000,
          total_completion_tokens: 5000,
          total_tokens: 20000,
          total_cost: 0.0035,
          total_calls: 10,
          summary_tokens: 12000,
          summary_cost: 0.0025,
          summary_calls: 7,
          translation_tokens: 8000,
          translation_cost: 0.001,
          translation_calls: 3,
          daily_stats: [
            { date: '2025-02-06', prompt_tokens: 3000, completion_tokens: 1000, total_tokens: 4000, cost: 0.0008, calls: 3 },
            { date: '2025-02-05', prompt_tokens: 5000, completion_tokens: 2000, total_tokens: 7000, cost: 0.0014, calls: 4 },
          ],
        });

      case 'clear_ai_usage_records':
        return Promise.resolve(undefined);

      case 'get_builtin_model_prices':
        return Promise.resolve([
          { model: 'gpt-4o-mini', input_price: 0.15, output_price: 0.6 },
          { model: 'gpt-4o', input_price: 2.5, output_price: 10 },
        ]);

      case 'check_update':
        return Promise.resolve(null);

      case 'export_config':
        return Promise.resolve({
          version: '1.0',
          exportedAt: new Date().toISOString(),
          feeds: feeds.map(f => ({
            url: f.feed.url,
            title: f.feed.title,
            description: f.feed.description,
            icon_url: f.feed.icon_url,
            use_full_content: false,
            use_ai_summary: false,
            use_ai_translation: false,
          })),
          aiSettings: {
            apiEndpoint: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            maxTokens: 300,
            prompt: '你是一个专业的文章摘要助手。',
            enableAutoSummary: false,
            language: 'zh-CN',
            maxConcurrency: 3,
          },
          appSettings: {
            pollInterval: '30m',
            notificationType: 'system',
            enableNotifications: false,
            maxNotificationsPerBatch: 5,
            enableBackgroundRefresh: true,
            closeToTray: true,
          },
        });

      case 'import_config': {
        const config = args.config;
        if (!config || !config.feeds) {
          return Promise.resolve({
            success: false,
            feedsImported: 0,
            feedsSkipped: 0,
            settingsImported: false,
            aiSettingsImported: false,
            error: 'Invalid config format',
          });
        }
        let imported = 0;
        let skipped = 0;
        config.feeds.forEach(feed => {
          const exists = feeds.some(f => f.feed.url === feed.url);
          if (exists) {
            skipped++;
          } else {
            imported++;
          }
        });
        return Promise.resolve({
          success: true,
          feedsImported: imported,
          feedsSkipped: skipped,
          settingsImported: !!config.appSettings,
          aiSettingsImported: !!config.aiSettings,
        });
      }

      default:
        console.warn('[Tauri Mock] Unknown command:', command, args);
        return Promise.resolve(null);
    }
  }

  // Override the Tauri invoke bridge
  // Tauri v2 uses window.__TAURI_INTERNALS__ for IPC
  if (!window.__TAURI_INTERNALS__) {
    window.__TAURI_INTERNALS__ = {};
  }

  // Store the mock invoke function globally for debugging
  window.__TAURI_INVOKE__ = mockInvoke;

  // Tauri v2 invoke implementation
  window.__TAURI_INTERNALS__.invoke = function(command, args) {
    console.log('[Tauri Mock] Invoke called:', command, args);
    return Promise.resolve(mockInvoke(command, args || {}));
  };

  // Also intercept the @tauri-apps/api/core module's invoke
  // by patching the global IPC mechanism
  window.__TAURI_INTERNALS__.transformCallback = function(callback, once) {
    const identifier = window.crypto.getRandomValues(new Uint32Array(1))[0];
    const prop = '__TAURI_CB_' + identifier;
    Object.defineProperty(window, prop, {
      value: (response) => {
        if (once) {
          Reflect.deleteProperty(window, prop);
        }
        return callback(response);
      },
      writable: false,
      configurable: true,
    });
    return identifier;
  };

  window.__TAURI_INTERNALS__.metadata = {
    currentWindow: { label: 'main' },
    currentWebview: { label: 'main' },
  };

  // For Tauri v2, also need to mock the invoke function export
  // This is called by @tauri-apps/api/core
  window.__TAURI__ = {
    invoke: (cmd, args) => {
      console.log('[Tauri Mock] __TAURI__.invoke called:', cmd, args);
      return Promise.resolve(mockInvoke(cmd, args || {}));
    }
  };

  // Set a flag to indicate mock is active
  window.__TAURI_MOCK_ACTIVE__ = true;

  console.log('[Tauri Mock] Tauri invoke mocked successfully');
})();
`;
}

/**
 * Get the mock articles for use in test assertions
 */
export function getMockArticles(): Article[] {
  return [...MOCK_ARTICLES]
}

/**
 * Get the mock feeds for use in test assertions
 */
export function getMockFeeds(): FeedWithUnreadCount[] {
  return [...MOCK_FEEDS]
}
