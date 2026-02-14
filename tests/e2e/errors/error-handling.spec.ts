import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { AddFeedDialogPage } from '../../pages/AddFeedDialogPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Error Handling', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)
    await page.goto('/')
    await feedListPage.waitForLoaded()
  })

  test.describe('Add Feed Errors', () => {
    test('should handle add_feed failure gracefully', async ({ page }) => {
      // Override add_feed to reject
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as {
          invoke: (cmd: string, args: unknown) => Promise<unknown>
        }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'add_feed') {
              return Promise.reject('Invalid RSS feed URL')
            }
            return origInvoke(cmd, args)
          }
        }
      })

      await page.goto('/')
      await feedListPage.waitForLoaded()

      // Open add feed dialog and submit
      await feedListPage.clickAddFeed()
      const addFeedDialog = new AddFeedDialogPage(page)
      await addFeedDialog.waitForOpen()
      await addFeedDialog.fillUrl('https://invalid-feed.example.com/rss')
      await addFeedDialog.submit()

      // Dialog should still be visible (not closed on error)
      // or show an error message
      await page.waitForTimeout(1000)
    })
  })

  test.describe('Refresh Feed Errors', () => {
    test('should handle refresh_all_feeds failure', async ({ page }) => {
      // Override refresh_all_feeds to reject
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as {
          invoke: (cmd: string, args: unknown) => Promise<unknown>
        }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'refresh_all_feeds') {
              return Promise.reject('Network error: connection timeout')
            }
            return origInvoke(cmd, args)
          }
        }
      })

      await page.goto('/')
      await feedListPage.waitForLoaded()

      // App should still be functional after refresh failure
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()
      const count = await articleListPage.getArticleCount()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Fetch Full Content Errors', () => {
    test('should handle fetch_full_content failure', async ({ page }) => {
      // Override fetch_full_content to reject
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as {
          invoke: (cmd: string, args: unknown) => Promise<unknown>
        }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'fetch_full_content') {
              return Promise.reject('Failed to fetch content: 403 Forbidden')
            }
            return origInvoke(cmd, args)
          }
        }
      })

      await page.goto('/')
      await feedListPage.waitForLoaded()
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Click fetch full content - should handle error gracefully
      await articleViewerPage.clickFetchFullContent()
      await page.waitForTimeout(1000)

      // Article viewer should still be functional
      await expect(articleViewerPage.articleTitle).toBeVisible()
    })
  })

  test.describe('AI Summary Errors', () => {
    test('should handle generate_article_summary failure', async ({ page }) => {
      // Override generate_article_summary to reject
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as {
          invoke: (cmd: string, args: unknown) => Promise<unknown>
        }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'generate_article_summary') {
              return Promise.reject('API key invalid or expired')
            }
            return origInvoke(cmd, args)
          }
        }
      })

      await page.goto('/')
      await feedListPage.waitForLoaded()
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Click AI summary - should handle error gracefully
      await articleViewerPage.clickAiSummary()
      await page.waitForTimeout(1000)

      // Article viewer should still be functional
      await expect(articleViewerPage.articleTitle).toBeVisible()
    })
  })

  test.describe('Mark Read Errors', () => {
    test('should handle mark_article_read failure gracefully', async ({ page }) => {
      // Override mark_article_read to reject
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as {
          invoke: (cmd: string, args: unknown) => Promise<unknown>
        }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'mark_article_read') {
              return Promise.reject('Database write error')
            }
            return origInvoke(cmd, args)
          }
        }
      })

      await page.goto('/')
      await feedListPage.waitForLoaded()
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      // Click article - mark read will fail but UI should still work
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Article content should still be displayed
      await expect(articleViewerPage.articleTitle).toBeVisible()
    })
  })
})
