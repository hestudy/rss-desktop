import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Feed Action Buttons Hover Behavior', () => {
  let feedListPage: FeedListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    feedListPage = new FeedListPage(page)
    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test('action buttons are transparent by default', async () => {
    const feedCount = await feedListPage.getFeedCount()
    expect(feedCount).toBeGreaterThan(0)

    const actionContainers = feedListPage.feedActionButtons
    const count = await actionContainers.count()
    expect(count).toBe(feedCount)

    for (let i = 0; i < count; i++) {
      await expect(actionContainers.nth(i)).toHaveCSS('opacity', '0')
    }
  })

  test('action buttons become opaque on feed item hover', async ({ page }) => {
    const actions = feedListPage.getFeedActions('Tech Blog')
    await expect(actions).toHaveCSS('opacity', '0')

    await feedListPage.hoverFeed('Tech Blog')

    await expect(actions).not.toHaveCSS('opacity', '0')
  })

  test('action buttons contain dropdown menu trigger', async () => {
    await feedListPage.hoverFeed('Tech Blog')

    const actions = feedListPage.getFeedActions('Tech Blog')
    const buttons = actions.locator('button')
    await expect(buttons).toHaveCount(1)
  })

  test('action buttons return to transparent when mouse leaves', async ({ page }) => {
    const actions = feedListPage.getFeedActions('Tech Blog')

    await feedListPage.hoverFeed('Tech Blog')
    await expect(actions).not.toHaveCSS('opacity', '0')

    await page.locator('h1').hover()

    await expect(actions).toHaveCSS('opacity', '0')
  })

  test('only hovered feed shows opaque action buttons', async () => {
    const techActions = feedListPage.getFeedActions('Tech Blog')
    const newsActions = feedListPage.getFeedActions('Daily News')

    await feedListPage.hoverFeed('Tech Blog')
    await expect(techActions).not.toHaveCSS('opacity', '0')
    await expect(newsActions).toHaveCSS('opacity', '0')

    await feedListPage.hoverFeed('Daily News')
    await expect(newsActions).not.toHaveCSS('opacity', '0')
    await expect(techActions).toHaveCSS('opacity', '0')
  })
})
