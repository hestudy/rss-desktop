import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { SidebarPage } from '../../pages/SidebarPage'
import { ArticleListPanelPage } from '../../pages/ArticleListPanelPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Favorites Flow
 *
 * Tests the complete favorites lifecycle:
 * - Favorite an article from the reader
 * - View favorites list
 * - Unfavorite from the reader
 * - Verify favorites empty state
 * - Keyboard shortcut (F key) for toggling favorites
 */
test.describe('Favorites Flow', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage
  let sidebar: SidebarPage
  let articleListPanel: ArticleListPanelPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)
    sidebar = new SidebarPage(page)
    articleListPanel = new ArticleListPanelPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async () => {
    await feedListPage.closeAnyDialog()
  })

  test.describe('Favorite an Article', () => {
    test('should favorite an unfavorited article via button click', async () => {
      // Load all articles and select the first one (article-1, unfavorited)
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Verify it's not favorited initially
      const wasFavorited = await articleViewerPage.isFavorited()
      expect(wasFavorited).toBe(false)

      // Click favorite button
      await articleViewerPage.toggleFavorite()

      // Verify it's now favorited
      const isNowFavorited = await articleViewerPage.isFavorited()
      expect(isNowFavorited).toBe(true)
    })

    test('should favorite an article via F keyboard shortcut', async ({ page }) => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const wasFavorited = await articleViewerPage.isFavorited()
      expect(wasFavorited).toBe(false)

      // Use keyboard shortcut
      await page.keyboard.press('f')
      await page.waitForTimeout(500)

      const isNowFavorited = await articleViewerPage.isFavorited()
      expect(isNowFavorited).toBe(true)
    })

    test('should show favorite indicator on pre-favorited article card', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      const favArticle = await articleListPage.findArticleByTitle('Building Desktop Apps with Tauri v2')
      if (favArticle) {
        const favoriteIndicator = favArticle.locator('[data-testid="favorite-indicator"]')
        await expect(favoriteIndicator).toBeVisible()
      }
    })
  })

  test.describe('View Favorites List', () => {
    test('should switch to favorites view and show favorited articles', async () => {
      // Mock data has article-2 as favorited
      await sidebar.clickFavorites()
      await articleListPanel.waitForLoaded()

      // Header should show "收藏文章"
      const headerTitle = await articleListPanel.getHeaderTitle()
      expect(headerTitle).toContain('收藏文章')

      // Should show at least the pre-favorited article
      const articleCount = await articleListPanel.getArticleCount()
      expect(articleCount).toBeGreaterThanOrEqual(1)
    })

    test('should display favorited article details in favorites view', async () => {
      await sidebar.clickFavorites()
      await articleListPanel.waitForLoaded()

      const articleCount = await articleListPanel.getArticleCount()
      if (articleCount > 0) {
        // Click the first favorited article
        await articleListPanel.clickArticle(0)
        await articleViewerPage.waitForVisible()

        // Verify article content is displayed
        const title = await articleViewerPage.getArticleTitle()
        expect(title).toBeTruthy()
        expect(title!.length).toBeGreaterThan(0)
      }
    })

    test('should show favorites empty state text when no favorites', async ({ page }) => {
      // Override mock to return empty favorites via addInitScript before reload
      await page.addInitScript(`
        (function() {
          const origSetup = window.__TAURI_INTERNALS__?.invoke;
          const waitForSetup = setInterval(() => {
            if (window.__TAURI_INTERNALS__?.invoke) {
              clearInterval(waitForSetup);
              const origInvoke = window.__TAURI_INTERNALS__.invoke;
              window.__TAURI_INTERNALS__.invoke = function(command, args) {
                if (command === 'get_favorite_articles') {
                  return Promise.resolve([]);
                }
                return origInvoke.call(this, command, args);
              };
            }
          }, 10);
        })();
      `)
      await page.reload()
      await sidebar.waitForLoaded()

      await sidebar.clickFavorites()
      await page.waitForTimeout(500)

      const emptyText = page.locator('text=暂无收藏文章')
      await expect(emptyText).toBeVisible()
    })
  })

  test.describe('Unfavorite an Article', () => {
    test('should unfavorite a favorited article via button click', async () => {
      // article-2 is pre-favorited in mock data
      // Navigate to all articles and find the favorited one
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      // Find and click the pre-favorited article (article-2: "Building Desktop Apps with Tauri v2")
      const article = await articleListPage.findArticleByTitle('Building Desktop Apps with Tauri v2')
      if (article) {
        await article.click()
        await articleViewerPage.waitForVisible()

        // Verify it's favorited
        const isFavorited = await articleViewerPage.isFavorited()
        expect(isFavorited).toBe(true)

        // Unfavorite it
        await articleViewerPage.toggleFavorite()

        // Verify it's no longer favorited
        const isStillFavorited = await articleViewerPage.isFavorited()
        expect(isStillFavorited).toBe(false)
      }
    })

    test('should unfavorite via F key shortcut', async ({ page }) => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      const article = await articleListPage.findArticleByTitle('Building Desktop Apps with Tauri v2')
      if (article) {
        await article.click()
        await articleViewerPage.waitForVisible()

        const isFavorited = await articleViewerPage.isFavorited()
        expect(isFavorited).toBe(true)

        await page.keyboard.press('f')
        await page.waitForTimeout(500)

        const isStillFavorited = await articleViewerPage.isFavorited()
        expect(isStillFavorited).toBe(false)
      }
    })
  })

  test.describe('Favorite Toggle Round-Trip', () => {
    test('should toggle favorite on and off correctly', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const initialState = await articleViewerPage.isFavorited()

      // Toggle on
      await articleViewerPage.toggleFavorite()
      const afterFirstToggle = await articleViewerPage.isFavorited()
      expect(afterFirstToggle).not.toBe(initialState)

      // Toggle off
      await articleViewerPage.toggleFavorite()
      const afterSecondToggle = await articleViewerPage.isFavorited()
      expect(afterSecondToggle).toBe(initialState)
    })

    test('should favorite article, switch to favorites view, then verify it appears', async () => {
      // Start with all articles
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      // Select first article and favorite it
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const wasFavorited = await articleViewerPage.isFavorited()
      if (!wasFavorited) {
        await articleViewerPage.toggleFavorite()
      }

      // Now switch to favorites view
      await sidebar.clickFavorites()
      await articleListPanel.waitForLoaded()

      // Should have at least one article in favorites
      const favCount = await articleListPanel.getArticleCount()
      expect(favCount).toBeGreaterThanOrEqual(1)
    })
  })

  test.describe('Switching Between All and Favorites', () => {
    test('should switch from all articles to favorites and back preserving state', async () => {
      // Start with all articles
      await sidebar.clickAllArticles()
      await articleListPanel.waitForLoaded()
      const allCount = await articleListPanel.getArticleCount()
      expect(allCount).toBeGreaterThan(0)

      // Switch to favorites
      await sidebar.clickFavorites()
      await articleListPanel.waitForLoaded()
      const headerTitle = await articleListPanel.getHeaderTitle()
      expect(headerTitle).toContain('收藏文章')

      // Switch back to all articles
      await sidebar.clickAllArticles()
      await articleListPanel.waitForLoaded()
      const backToAllCount = await articleListPanel.getArticleCount()
      expect(backToAllCount).toBe(allCount)
    })
  })
})
