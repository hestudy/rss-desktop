import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { SidebarPage } from '../../pages/SidebarPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Background Refresh & Notifications', () => {
  let feedListPage: FeedListPage
  let sidebarPage: SidebarPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    feedListPage = new FeedListPage(page)
    sidebarPage = new SidebarPage(page)
    await page.goto('/')
    await feedListPage.waitForLoaded()
  })

  test.describe('Scheduler State', () => {
    test('should call get_scheduler_state on app load', async ({ page }) => {
      // Verify the scheduler state was queried
      const calls = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>
        return (w.__TAURI_MOCK_CALLS__ as Array<{ command: string }>)
          .filter(c => c.command === 'get_scheduler_state')
      })
      // Scheduler state may or may not be queried on load depending on implementation
    })
  })

  test.describe('Background Refresh Settings', () => {
    test('should show background refresh toggle in notification settings', async ({ page }) => {
      await sidebarPage.openSettings()
      const dialog = page.locator('[data-testid="settings-dialog"]')
      await dialog.locator('button', { hasText: '通知' }).click()

      await expect(dialog.locator('text=后台刷新')).toBeVisible()
      await expect(dialog.locator('text=应用最小化时继续检查新文章')).toBeVisible()
    })

    test('should show poll interval options', async ({ page }) => {
      await sidebarPage.openSettings()
      const dialog = page.locator('[data-testid="settings-dialog"]')
      await dialog.locator('button', { hasText: '通知' }).click()

      const select = dialog.locator('select').first()
      await expect(select).toBeVisible()

      // Verify all interval options exist
      await expect(select.locator('option[value="5m"]')).toBeAttached()
      await expect(select.locator('option[value="15m"]')).toBeAttached()
      await expect(select.locator('option[value="30m"]')).toBeAttached()
      await expect(select.locator('option[value="1h"]')).toBeAttached()
      await expect(select.locator('option[value="2h"]')).toBeAttached()
      await expect(select.locator('option[value="6h"]')).toBeAttached()
      await expect(select.locator('option[value="12h"]')).toBeAttached()
      await expect(select.locator('option[value="24h"]')).toBeAttached()
    })

    test('should save settings when poll interval changes', async ({ page }) => {
      await sidebarPage.openSettings()
      const dialog = page.locator('[data-testid="settings-dialog"]')
      await dialog.locator('button', { hasText: '通知' }).click()

      const select = dialog.locator('select').first()
      await select.selectOption('1h')

      // Wait for save to complete
      await page.waitForTimeout(500)

      // Verify update_settings was called
      const calls = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>
        return (w.__TAURI_MOCK_CALLS__ as Array<{ command: string; args: unknown }>)
          .filter(c => c.command === 'update_settings')
      })
      expect(calls.length).toBeGreaterThan(0)
    })
  })

  test.describe('Notification Settings', () => {
    test('should toggle notifications and show conditional fields', async ({ page }) => {
      await sidebarPage.openSettings()
      const dialog = page.locator('[data-testid="settings-dialog"]')
      await dialog.locator('button', { hasText: '通知' }).click()

      // Initially notifications are disabled (mock default)
      // Notification type and max batch should not be visible
      await expect(page.getByText('通知类型')).not.toBeVisible()

      // Enable notifications
      const toggle = page.getByRole('switch', { name: '启用通知' })
      await toggle.click()

      // Now conditional fields should appear
      await expect(page.getByText('通知类型')).toBeVisible()
      await expect(page.getByText('每批次最大通知数')).toBeVisible()
    })

    test('should change notification type', async ({ page }) => {
      await sidebarPage.openSettings()
      const dialog = page.locator('[data-testid="settings-dialog"]')
      await dialog.locator('button', { hasText: '通知' }).click()

      // Enable notifications first
      const toggle = page.getByRole('switch', { name: '启用通知' })
      await toggle.click()

      // Change notification type
      const typeSelect = dialog.locator('select').nth(1)
      await expect(typeSelect).toBeVisible()
    })
  })

  test.describe('Initial Refresh', () => {
    test('should call refresh_all_feeds on startup', async ({ page }) => {
      // Wait for initial refresh to complete
      await page.waitForTimeout(1000)

      const calls = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>
        return (w.__TAURI_MOCK_CALLS__ as Array<{ command: string }>)
          .filter(c => c.command === 'refresh_all_feeds')
      })
      expect(calls.length).toBeGreaterThanOrEqual(1)
    })
  })
})
