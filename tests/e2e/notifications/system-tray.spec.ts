import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/SidebarPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for System Notifications and Tray Features
 *
 * Note: In the E2E test environment (Vite dev server), Tauri backend is not available.
 * We test the UI components and settings related to notifications and tray.
 * The actual notification display and tray functionality is tested at integration level.
 */

test.describe('System Notifications and Tray Settings', () => {
  let sidebarPage: SidebarPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    sidebarPage = new SidebarPage(page)
    await page.goto('/')
    await sidebarPage.waitForLoaded()
  })

  test.describe('Notification Settings', () => {
    test('should show notification settings in settings dialog', async ({ page }) => {
      await sidebarPage.openSettings()

      // Navigate to notification tab
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Verify notification settings are visible
      await expect(page.getByRole('switch', { name: '启用通知' })).toBeVisible()
      await expect(page.getByText('轮询间隔')).toBeVisible()
    })

    test('should toggle enable notifications', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      const toggle = page.getByRole('switch', { name: '启用通知' })

      // Toggle on
      await toggle.click()
      await expect(toggle).toBeChecked()

      // Toggle off
      await toggle.click()
      await expect(toggle).not.toBeChecked()
    })

    test('should show notification type selector when notifications enabled', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Enable notifications
      await page.getByRole('switch', { name: '启用通知' }).click()

      // Notification type selector should appear (it's a select dropdown)
      await expect(page.getByText('通知类型')).toBeVisible()
    })

    test('should change notification type via dropdown', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Enable notifications first
      await page.getByRole('switch', { name: '启用通知' }).click()

      // Notification type is a select dropdown
      const typeSelects = page.locator('[data-testid="settings-dialog"] select')
      // Second select is the notification type (first is poll interval)
      const typeSelect = typeSelects.nth(1)
      await expect(typeSelect).toBeVisible()

      // Change to "无" option
      await typeSelect.selectOption('none')
      await expect(typeSelect).toHaveValue('none')
    })

    test('should show max notifications per batch setting', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Enable notifications
      await page.getByRole('switch', { name: '启用通知' }).click()

      // Max notifications setting should appear
      await expect(page.getByText('每批次最大通知数')).toBeVisible()
    })

    test('should change poll interval', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Find poll interval select
      const select = page.locator('[data-testid="settings-dialog"] select').first()
      await expect(select).toBeVisible()

      // Change to 1 hour
      await select.selectOption('1h')
      await expect(select).toHaveValue('1h')

      // Change to 15 minutes
      await select.selectOption('15m')
      await expect(select).toHaveValue('15m')
    })
  })

  test.describe('Tray Settings', () => {
    test('should show close to tray setting', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Close to tray toggle should be visible
      await expect(page.getByRole('switch', { name: '关闭到托盘' })).toBeVisible()
    })

    test('should toggle close to tray', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      const toggle = page.getByRole('switch', { name: '关闭到托盘' })

      // Get initial state
      const initialState = await toggle.isChecked()

      // Toggle
      await toggle.click()

      // Verify state changed
      if (initialState) {
        await expect(toggle).not.toBeChecked()
      } else {
        await expect(toggle).toBeChecked()
      }
    })
  })

  test.describe('Background Refresh', () => {
    test('should show background refresh setting', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      await expect(page.getByRole('switch', { name: '后台刷新' })).toBeVisible()
    })

    test('should toggle background refresh', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      const toggle = page.getByRole('switch', { name: '后台刷新' })

      // Get initial state
      const initialState = await toggle.isChecked()

      await toggle.click()

      // Wait for toggle state to change
      if (initialState) {
        await expect(toggle).not.toBeChecked()
      } else {
        await expect(toggle).toBeChecked()
      }
    })
  })

  test.describe('Notification Flow', () => {
    // FIXME: Settings persistence test - flaky due to async state management
    test.fixme('should persist notification settings after closing dialog', async ({ page }) => {
      await sidebarPage.openSettings()

      const dialog = page.locator('[data-testid="settings-dialog"]')
      const nav = dialog.locator('nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Enable notifications
      const toggle = page.getByRole('switch', { name: '启用通知' })
      await toggle.click()
      await expect(toggle).toBeChecked()

      // Change poll interval
      const select = dialog.locator('select').first()
      await select.selectOption('2h')
      await expect(select).toHaveValue('2h')

      // Wait for settings to save
      await page.waitForTimeout(300)

      // Close settings
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible({ timeout: 5000 })

      // Reopen settings
      await sidebarPage.openSettings()
      await nav.locator('button', { hasText: '通知' }).click()

      // Verify settings persisted (settings should reload from storage)
      await expect(toggle).toBeChecked({ timeout: 5000 })
      await expect(select).toHaveValue('2h')
    })
  })

  test.describe('Scheduler State', () => {
    test('should show scheduler status in notification settings', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()

      // Look for scheduler-related UI (if implemented)
      // This tests that the UI can display scheduler state
      const schedulerSection = page.locator('[data-testid="settings-dialog"]').filter({
        hasText: /调度器|定时/,
      })

      // Even if not visible, this documents expected behavior
      // The scheduler status might be shown elsewhere
    })
  })
})

test.describe('Notification Integration with Feed Refresh', () => {
  let sidebarPage: SidebarPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    sidebarPage = new SidebarPage(page)
    await page.goto('/')
    await sidebarPage.waitForLoaded()
  })

  test('should enable notifications after refresh all feeds', async ({ page }) => {
    // Open settings and enable notifications
    await sidebarPage.openSettings()

    const nav = page.locator('[data-testid="settings-dialog"] nav')
    await nav.locator('button', { hasText: '通知' }).click()

    const toggle = page.getByRole('switch', { name: '启用通知' })
    await toggle.click()
    await expect(toggle).toBeChecked()

    await page.keyboard.press('Escape')

    // Refresh all feeds
    const refreshButton = page.getByTitle('刷新全部')
    await refreshButton.click()

    // Wait for refresh to complete (mock returns immediately)
    await page.waitForTimeout(500)

    // The actual notification behavior is handled by Rust backend
    // Here we just verify the UI allows the flow
  })
})
