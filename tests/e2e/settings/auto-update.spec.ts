import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/SidebarPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

type UpdaterScenario = 'up-to-date' | 'available' | 'error'

/** Returns the JS code for the `plugin:updater|check` handler per scenario. */
function buildCheckHandler(scenario: UpdaterScenario): string {
  const handlers: Record<UpdaterScenario, string> = {
    'up-to-date': `return Promise.resolve(null);`,
    'available': `return Promise.resolve({
          rid: 1, currentVersion: '0.0.1', version: '1.0.0',
          date: '2025-02-06', body: '修复了若干问题，提升了性能和稳定性。', rawJson: '{}',
        });`,
    'error': `return Promise.reject(new Error('Network error: failed to check for updates'));`,
  }
  return handlers[scenario]
}

/** Returns the JS code for the download-and-install mock with progress simulation. */
function buildDownloadHandler(): string {
  return `
        var channelId = args && args.onEvent;
        if (channelId != null) {
          var callbackKey = '__TAURI_CB_' + channelId;
          var cb = window[callbackKey];
          if (typeof cb === 'function') {
            setTimeout(function() { cb({ index: 0, message: { event: 'Started', data: { contentLength: 10000 } } }); }, 100);
            setTimeout(function() { cb({ index: 1, message: { event: 'Progress', data: { chunkLength: 3000 } } }); }, 200);
            setTimeout(function() { cb({ index: 2, message: { event: 'Progress', data: { chunkLength: 3000 } } }); }, 300);
            setTimeout(function() { cb({ index: 3, message: { event: 'Progress', data: { chunkLength: 4000 } } }); }, 400);
            setTimeout(function() { cb({ index: 4, message: { event: 'Finished' } }); }, 500);
          }
        }
        return new Promise(function(resolve) { setTimeout(resolve, 600); });`
}

/**
 * Build an updater plugin mock script.
 *
 * Intercepts `invoke('plugin:updater|check')` and related commands
 * used by @tauri-apps/plugin-updater.
 */
function buildUpdaterMockScript(scenario: UpdaterScenario): string {
  return `
(function() {
  var originalInvoke = window.__TAURI_INTERNALS__.invoke;
  window.__TAURI_INTERNALS__.invoke = function(command, args) {
    switch (command) {
      case 'plugin:updater|check': { ${buildCheckHandler(scenario)} }
      case 'plugin:updater|download_and_install': { ${buildDownloadHandler()} }
      case 'plugin:updater|download': { return Promise.resolve(2); }
      case 'plugin:updater|install':
      case 'plugin:process|restart':
      case 'plugin:resources|close': { return Promise.resolve(undefined); }
      default: return originalInvoke.call(this, command, args);
    }
  };
})();
`
}

test.describe('Auto-Update Flow', () => {
  let sidebarPage: SidebarPage

  /** Navigate to the About tab in settings */
  async function openAboutTab(page: import('@playwright/test').Page) {
    await sidebarPage.openSettings()
    const nav = page.locator('[data-testid="settings-dialog"] nav')
    await nav.locator('button', { hasText: '关于' }).click()
  }

  test.describe('Up-to-date Scenario', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(buildTauriMockScript())
      await page.addInitScript(buildUpdaterMockScript('up-to-date'))
      sidebarPage = new SidebarPage(page)
      await page.goto('/')
      await sidebarPage.waitForLoaded()
    })

    test('should show check update button', async ({ page }) => {
      await openAboutTab(page)
      await expect(page.locator('button', { hasText: '检查更新' })).toBeVisible()
    })

    test('should show up-to-date message after checking', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()

      // Should show "已是最新版本"
      await expect(page.getByText('已是最新版本')).toBeVisible({ timeout: 5000 })
    })

    test('should show check button again after up-to-date', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()
      await expect(page.getByText('已是最新版本')).toBeVisible({ timeout: 5000 })

      // Check button should still be available
      await expect(page.locator('button', { hasText: '检查更新' })).toBeVisible()
    })
  })

  test.describe('Update Available Scenario', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(buildTauriMockScript())
      await page.addInitScript(buildUpdaterMockScript('available'))
      sidebarPage = new SidebarPage(page)
      await page.goto('/')
      await sidebarPage.waitForLoaded()
    })

    test('should show new version info after checking', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()

      // Should show new version
      await expect(page.getByText('v1.0.0')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('发现新版本')).toBeVisible()
    })

    test('should show release notes', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()

      await expect(page.getByText(/修复了若干问题/)).toBeVisible({ timeout: 5000 })
    })

    test('should show download button when update available', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()

      await expect(page.locator('button', { hasText: '下载并安装' })).toBeVisible({
        timeout: 5000,
      })
    })

    test('should show download progress after clicking download', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()
      await expect(page.locator('button', { hasText: '下载并安装' })).toBeVisible({
        timeout: 5000,
      })

      await page.locator('button', { hasText: '下载并安装' }).click()

      // Should show downloading state
      await expect(page.getByText(/正在下载/)).toBeVisible({ timeout: 5000 })

      // Should show progress bar
      await expect(page.locator('[role="progressbar"]')).toBeVisible({ timeout: 5000 })
    })

    test('should show restart button after download completes', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()
      await expect(page.locator('button', { hasText: '下载并安装' })).toBeVisible({
        timeout: 5000,
      })

      await page.locator('button', { hasText: '下载并安装' }).click()

      // Wait for download to complete and show restart button
      await expect(page.locator('button', { hasText: '重启应用' })).toBeVisible({
        timeout: 10000,
      })
      await expect(page.getByText('更新已下载完成')).toBeVisible()
    })

    test('should handle restart button click', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()
      await expect(page.locator('button', { hasText: '下载并安装' })).toBeVisible({
        timeout: 5000,
      })

      await page.locator('button', { hasText: '下载并安装' }).click()
      await expect(page.locator('button', { hasText: '重启应用' })).toBeVisible({
        timeout: 10000,
      })

      // Click restart - should not crash (mocked to no-op)
      await page.locator('button', { hasText: '重启应用' }).click()
      // Page should still be functional
      await expect(page.locator('[data-testid="settings-dialog"]')).toBeVisible()
    })
  })

  test.describe('Error Scenario', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(buildTauriMockScript())
      await page.addInitScript(buildUpdaterMockScript('error'))
      sidebarPage = new SidebarPage(page)
      await page.goto('/')
      await sidebarPage.waitForLoaded()
    })

    test('should show error message when check fails', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()

      // Should show error message
      await expect(page.getByText(/Network error|检查更新失败/)).toBeVisible({
        timeout: 5000,
      })
    })

    test('should show check button again after error', async ({ page }) => {
      await openAboutTab(page)

      await page.locator('button', { hasText: '检查更新' }).click()
      await expect(page.getByText(/Network error|检查更新失败/)).toBeVisible({
        timeout: 5000,
      })

      // Check button should be available to retry
      await expect(page.locator('button', { hasText: '检查更新' })).toBeVisible()
    })
  })

  test.describe('About Section Info', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(buildTauriMockScript())
      await page.addInitScript(buildUpdaterMockScript('up-to-date'))
      sidebarPage = new SidebarPage(page)
      await page.goto('/')
      await sidebarPage.waitForLoaded()
    })

    test('should display app version', async ({ page }) => {
      await openAboutTab(page)
      await expect(page.getByText('v0.0.1')).toBeVisible()
    })

    test('should display tech stack information', async ({ page }) => {
      await openAboutTab(page)
      await expect(page.getByText('Tauri v2 + React 19')).toBeVisible()
      await expect(page.getByText('TypeScript + Vite')).toBeVisible()
      await expect(page.getByText('Rust')).toBeVisible()
    })
  })
})
