import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Refreshing RSS Feeds
 *
 * Uses Tauri mock to provide a working app environment with feeds.
 */
test.describe('Refresh RSS Feeds', () => {
  let feedListPage: FeedListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
  })

  test('should have refresh all button', async () => {
    await expect(feedListPage.refreshAllButton).toBeVisible()
    await expect(feedListPage.refreshAllButton).toHaveAttribute('title', '刷新全部')
  })

  test('should have add feed button', async () => {
    await expect(feedListPage.addButton).toBeVisible()
    await expect(feedListPage.addButton).toHaveAttribute('title', '添加订阅')
  })

  test('should show all articles button', async () => {
    await expect(feedListPage.allArticlesButton).toBeVisible()
  })
})
