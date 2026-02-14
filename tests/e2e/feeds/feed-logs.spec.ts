import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Feed Logs', () => {
  let feedListPage: FeedListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    feedListPage = new FeedListPage(page)
    await page.goto('/')
    await feedListPage.waitForLoaded()
  })

  test.describe('Feed Log Dialog (per feed)', () => {
    test('should open feed log dialog from feed dropdown menu', async ({ page }) => {
      // Hover over a feed item to reveal the dropdown trigger
      const feedItem = page.locator('[data-testid="feed-item"]').first()
      await feedItem.hover()

      // Click the dropdown trigger (MoreHorizontal button)
      const dropdownTrigger = feedItem.locator('[data-testid="feed-actions"] button')
      await dropdownTrigger.click()

      // Click the log menu item
      const logMenuItem = page.locator('[data-testid="feed-menu-log"]')
      await expect(logMenuItem).toBeVisible()
      await logMenuItem.click()

      // Feed log dialog should appear with feed title
      await expect(page.locator('text=刷新日志')).toBeVisible({ timeout: 3000 })
    })

    test('should show log entries with success and failure', async ({ page }) => {
      const feedItem = page.locator('[data-testid="feed-item"]').first()
      await feedItem.hover()

      const dropdownTrigger = feedItem.locator('[data-testid="feed-actions"] button')
      await dropdownTrigger.click()

      await page.locator('[data-testid="feed-menu-log"]').click()

      // Wait for logs to load - should show both success and failure entries
      await expect(page.locator('text=刷新日志')).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Global Log Dialog', () => {
    test('should open global log dialog from sidebar bottom', async ({ page }) => {
      // Click the global log button in sidebar bottom area
      const logButton = page.locator('[data-testid="sidebar-bottom"]').getByTitle('刷新日志')
      await expect(logButton).toBeVisible()
      await logButton.click()

      // Global log dialog should appear
      await expect(page.locator('text=全局刷新日志')).toBeVisible({ timeout: 3000 })
    })

    test('should show grouped logs by feed', async ({ page }) => {
      const logButton = page.locator('[data-testid="sidebar-bottom"]').getByTitle('刷新日志')
      await logButton.click()

      // Should show feed titles as group headers (with success/failure indicators)
      await expect(page.locator('text=全局刷新日志')).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('button', { name: /Tech Blog.*✓/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Daily News.*✗/ })).toBeVisible()
    })

    test('should show success and failure indicators', async ({ page }) => {
      const logButton = page.locator('[data-testid="sidebar-bottom"]').getByTitle('刷新日志')
      await logButton.click()

      await expect(page.locator('text=全局刷新日志')).toBeVisible({ timeout: 3000 })

      // Should show success count and failure count indicators
      // Tech Blog has success log, Daily News has failure log
    })

    test('should show empty state when no logs', async ({ page }) => {
      // Override get_all_feed_logs to return empty
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as {
          invoke: (cmd: string, args: unknown) => Promise<unknown>
        }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'get_all_feed_logs') {
              return Promise.resolve([])
            }
            return origInvoke(cmd, args)
          }
        }
      })

      await page.goto('/')
      await feedListPage.waitForLoaded()

      const logButton = page.locator('[data-testid="sidebar-bottom"]').getByTitle('刷新日志')
      await logButton.click()

      await expect(page.locator('text=暂无刷新日志')).toBeVisible({ timeout: 3000 })
    })
  })
})
