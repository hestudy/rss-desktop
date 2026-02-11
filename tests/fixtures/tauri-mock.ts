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
          enableBackgroundRefresh: false,
        });

      case 'save_settings':
        return Promise.resolve(undefined);

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

  window.__TAURI_INTERNALS__.invoke = function(command, args) {
    return mockInvoke(command, args || {});
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
