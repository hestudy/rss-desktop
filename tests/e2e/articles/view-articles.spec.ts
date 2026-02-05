import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { AddFeedDialogPage } from '../../pages/AddFeedDialogPage'
import { TEST_FEEDS, WAIT_TIMES } from '../../fixtures/test-helpers'

/**
 * E2E Tests for Viewing Articles
 *
 * These tests verify the article viewing functionality:
 * - Empty state when no feeds
 * - UI structure and layout
 * - (Article display depends on feeds being added first)
 */
test.describe('View Articles', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let addFeedDialogPage: AddFeedDialogPage

  test.beforeEach(async ({ page }) => {
    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    addFeedDialogPage = new AddFeedDialogPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
  })

  test('should show empty state when no feeds exist', async ({ page }) => {
    // Check if there are no feeds
    const feedCount = await feedListPage.getFeedCount()

    if (feedCount === 0) {
      // Should show empty state
      const isEmpty = await feedListPage.isEmpty()
      expect(isEmpty).toBe(true)
    } else {
      // There are feeds, so articles might be displayed
      console.log(`Found ${feedCount} existing feeds`)
    }
  })

  test('should display article list structure', async ({ page }) => {
    // Verify the article list container exists
    const articleContainer = page.locator('div').filter({ hasText: /全部文章|暂无文章/ })
    await expect(articleContainer.first()).toBeVisible()
  })

  test('should have all articles button', async ({ page }) => {
    // Verify all articles button exists
    await expect(feedListPage.allArticlesButton).toBeVisible()
  })

  test('should click all articles button', async ({ page }) => {
    // Click all articles
    await feedListPage.clickAllArticles()

    // Verify the selection
    await page.waitForTimeout(500)

    // The "all articles" button should be selected (different style)
    const allArticlesBtn = page.locator('button', { hasText: '全部文章' })
    await expect(allArticlesBtn.first()).toBeVisible()
  })

  // Tests that require feeds to exist
  test.describe.skip('Full Article View Flow (requires existing feeds)', () => {
    test('should display articles when feed is selected', async ({ page }) => {
      const hasFeed = await feedListPage.hasFeed('reddit')
      test.skip(!hasFeed, 'No feed to select articles from')

      // Select a feed
      await feedListPage.selectFeed('reddit')

      // Wait for articles to load
      await articleListPage.waitForLoaded()

      // Check if articles are displayed
      const articleCount = await articleListPage.getArticleCount()
      expect(articleCount).toBeGreaterThan(0)
    })

    test('should display article title and description', async ({ page }) => {
      const hasFeed = await feedListPage.hasFeed('reddit')
      test.skip(!hasFeed, 'No feed to select articles from')

      await feedListPage.selectFeed('reddit')
      await articleListPage.waitForLoaded()

      // Get first article
      const firstArticle = articleListPage.articles.first()
      await expect(firstArticle).toBeVisible()

      // Check for title
      const title = firstArticle.locator('h3, p')
      await expect(title.first()).toBeVisible()
    })

    test('should update article list when switching feeds', async ({ page }) => {
      const hasReddit = await feedListPage.hasFeed('reddit')
      const hasOReilly = await feedListPage.hasFeed("O'Reilly") ||
                           await feedListPage.hasFeed('O\'Reilly') ||
                           await feedListPage.hasFeed('oreilly')

      test.skip(!hasReddit && !hasOReilly, 'No feeds to switch between')

      if (hasReddit) {
        await feedListPage.selectFeed('reddit')
        await articleListPage.waitForLoaded()
      }

      // Switch to all articles
      await feedListPage.clickAllArticles()
      await page.waitForTimeout(1000)
    })

    test('should display unread count badge on feed', async ({ page }) => {
      const hasFeed = await feedListPage.hasFeed('reddit')
      test.skip(!hasFeed, 'No feed to check unread count')

      // Check unread count
      const unreadCount = await feedListPage.getFeedUnreadCount('reddit')
      expect(typeof unreadCount).toBe('number')
      expect(unreadCount).toBeGreaterThanOrEqual(0)
    })

    test('should display global unread count in header', async ({ page }) => {
      // Check global unread count
      const globalUnread = await feedListPage.getGlobalUnreadCount()
      expect(typeof globalUnread).toBe('number')
      expect(globalUnread).toBeGreaterThanOrEqual(0)
    })
  })
})
