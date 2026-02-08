import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Initial Silent Refresh on Startup', () => {
  let feedListPage: FeedListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    feedListPage = new FeedListPage(page)
  })

  test('should call refresh_all_feeds after loading feeds on startup', async ({ page }) => {
    await page.goto('/')
    await feedListPage.waitForLoaded()

    await page.waitForFunction(
      () => (window as any).__TAURI_MOCK_CALLS__?.some(
        (c: any) => c.command === 'refresh_all_feeds'
      ),
      { timeout: 10000 },
    )

    const calls: { command: string }[] = await page.evaluate(
      () => (window as any).__TAURI_MOCK_CALLS__,
    )

    const commandSequence = calls.map(c => c.command)
    const getFeedsIndex = commandSequence.indexOf('get_feeds')
    const refreshIndex = commandSequence.indexOf('refresh_all_feeds')

    expect(getFeedsIndex).toBeGreaterThanOrEqual(0)
    expect(refreshIndex).toBeGreaterThan(getFeedsIndex)
  })

  test('should call refresh_all_feeds exactly once on startup', async ({ page }) => {
    await page.goto('/')
    await feedListPage.waitForLoaded()

    await page.waitForFunction(
      () => (window as any).__TAURI_MOCK_CALLS__?.some(
        (c: any) => c.command === 'refresh_all_feeds'
      ),
      { timeout: 10000 },
    )

    await page.waitForTimeout(2000)

    const refreshCount: number = await page.evaluate(
      () => (window as any).__TAURI_MOCK_CALLS__
        .filter((c: any) => c.command === 'refresh_all_feeds').length,
    )

    expect(refreshCount).toBe(1)
  })

  test('should display feeds normally while silent refresh runs', async ({ page }) => {
    await page.goto('/')
    await feedListPage.waitForLoaded()

    const hasTechBlog = await feedListPage.hasFeed('Tech Blog')
    const hasDailyNews = await feedListPage.hasFeed('Daily News')

    expect(hasTechBlog).toBe(true)
    expect(hasDailyNews).toBe(true)
  })

  test('should not show loading spinner during silent refresh', async ({ page }) => {
    await page.goto('/')
    await feedListPage.waitForLoaded()

    await page.waitForFunction(
      () => (window as any).__TAURI_MOCK_CALLS__?.some(
        (c: any) => c.command === 'refresh_all_feeds'
      ),
      { timeout: 10000 },
    )

    const spinningIcon = page.locator('button[title="刷新全部"] svg.animate-spin')
    await expect(spinningIcon).not.toBeVisible()
  })
})
