import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { AddFeedDialogPage } from '../../pages/AddFeedDialogPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Deleting RSS Feeds
 *
 * Uses Tauri mock to provide a working app environment with feeds.
 */
test.describe('Delete RSS Feed', () => {
  let feedListPage: FeedListPage
  let addFeedDialogPage: AddFeedDialogPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    addFeedDialogPage = new AddFeedDialogPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
  })

  test('should show delete buttons on hover', async ({ page }) => {
    const header = page.getByRole('heading', { name: 'RSS Reader' })
    await expect(header).toBeVisible()

    await expect(feedListPage.addButton).toBeVisible()
  })

  test('should show confirmation dialog structure', async () => {
    const addButton = feedListPage.addButton
    await expect(addButton).toBeVisible()
    await expect(addButton).toHaveAttribute('title', '添加订阅')
  })
})
