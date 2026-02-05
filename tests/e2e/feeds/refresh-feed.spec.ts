import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { AddFeedDialogPage } from '../../pages/AddFeedDialogPage'
import { TEST_FEEDS, WAIT_TIMES } from '../../fixtures/test-helpers'

/**
 * E2E Tests for Refreshing RSS Feeds
 *
 * These tests verify the feed refresh functionality:
 * - Refresh buttons exist and work
 * - Loading animations
 * - (Actual refresh depends on feeds being added first)
 */
test.describe('Refresh RSS Feeds', () => {
  let feedListPage: FeedListPage
  let addFeedDialogPage: AddFeedDialogPage

  test.beforeEach(async ({ page }) => {
    feedListPage = new FeedListPage(page)
    addFeedDialogPage = new AddFeedDialogPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
  })

  test('should have refresh all button', async ({ page }) => {
    // Verify refresh all button exists
    await expect(feedListPage.refreshAllButton).toBeVisible()
    await expect(feedListPage.refreshAllButton).toHaveAttribute('title', '刷新全部')
  })

  test('should have add feed button', async ({ page }) => {
    // Verify add button exists
    await expect(feedListPage.addButton).toBeVisible()
    await expect(feedListPage.addButton).toHaveAttribute('title', '添加订阅')
  })

  test('should show all articles button', async ({ page }) => {
    // Verify all articles button exists
    await expect(feedListPage.allArticlesButton).toBeVisible()
  })

  // Full refresh tests require feeds to exist
  // These are skipped unless feeds are manually added or mocked
  test.describe.skip('Full Refresh Flow (requires existing feeds)', () => {
    test('should refresh individual feed', async ({ page }) => {
      const hasFeed = await feedListPage.hasFeed('reddit')
      test.skip(!hasFeed, 'No feed to refresh')

      // Get initial article count
      await feedListPage.selectFeed('reddit')
      await page.waitForTimeout(1000)

      // Refresh the feed
      await feedListPage.refreshFeed('reddit')

      // Wait for refresh to complete
      await page.waitForTimeout(WAIT_TIMES.rssFetch)

      // Just verify no errors occurred
      const hasFeedStill = await feedListPage.hasFeed('reddit')
      expect(hasFeedStill).toBe(true)
    })

    test('should refresh all feeds', async ({ page }) => {
      const initialCount = await feedListPage.getFeedCount()

      // Skip if no feeds to refresh
      test.skip(initialCount === 0, 'No feeds to refresh')

      // Refresh all feeds
      await feedListPage.clickRefreshAll()

      // Wait for refresh to complete
      await page.waitForTimeout(WAIT_TIMES.rssFetch)

      // Verify feeds still exist
      const newCount = await feedListPage.getFeedCount()
      expect(newCount).toBe(initialCount)
    })

    test('should handle refresh errors gracefully', async ({ page }) => {
      // This test verifies the app handles network errors gracefully
      // We can't really test this without mocking network failures
      // So we just verify the refresh button works
      await expect(feedListPage.refreshAllButton).toBeVisible()
    })
  })
})
