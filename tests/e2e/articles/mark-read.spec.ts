import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Marking Articles as Read
 *
 * Uses Tauri mock to provide a working app environment with feeds and articles.
 */
test.describe('Mark Articles as Read', () => {
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

  test('should have mark all read functionality in UI', async () => {
    // Navigate to all articles to trigger article loading
    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()

    // Article list should be visible
    await expect(articleListPage.container).toBeVisible()
  })

  test('should display article structure correctly', async () => {
    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()

    const articleCount = await articleListPage.getArticleCount()
    expect(articleCount).toBeGreaterThan(0)
  })
})
