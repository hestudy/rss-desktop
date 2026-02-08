import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Viewing Articles
 *
 * Uses Tauri mock to provide a working app environment with feeds and articles.
 */
test.describe('View Articles', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
  })

  test('should show feeds in the sidebar', async () => {
    const feedCount = await feedListPage.getFeedCount()
    expect(feedCount).toBeGreaterThan(0)
  })

  test('should display article list structure', async () => {
    const articleContainer = articleListPage.container
    await expect(articleContainer).toBeVisible()
  })

  test('should have all articles button', async () => {
    await expect(feedListPage.allArticlesButton).toBeVisible()
  })

  test('should show all articles on initial load without clicking', async () => {
    await articleListPage.waitForLoaded()

    const articleCount = await articleListPage.getArticleCount()
    expect(articleCount).toBeGreaterThan(0)
  })

  test('should click all articles button and show articles', async ({ page }) => {
    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()

    const articleCount = await articleListPage.getArticleCount()
    expect(articleCount).toBeGreaterThan(0)
  })
})
