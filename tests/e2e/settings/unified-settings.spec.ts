import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/SidebarPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Unified Settings Dialog', () => {
  let sidebarPage: SidebarPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    sidebarPage = new SidebarPage(page)
    await page.goto('/')
    await sidebarPage.waitForLoaded()
  })

  test.describe('Navigation', () => {
    test('should open settings dialog from sidebar', async () => {
      await sidebarPage.openSettings()
      expect(await sidebarPage.isSettingsDialogVisible()).toBe(true)
    })

    test('should close settings dialog with Escape key', async ({ page }) => {
      await sidebarPage.openSettings()
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="settings-dialog"]')).not.toBeVisible()
    })

    test('should close settings dialog with close button', async ({ page }) => {
      await sidebarPage.openSettings()
      const dialog = page.locator('[data-testid="settings-dialog"]')
      await dialog.locator('button').filter({ has: page.locator('.lucide-x') }).click()
      await expect(dialog).not.toBeVisible()
    })

    test('should show all navigation tabs', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await expect(nav.locator('button', { hasText: '外观' })).toBeVisible()
      await expect(nav.locator('button', { hasText: '阅读' })).toBeVisible()
      await expect(nav.locator('button', { hasText: '通知' })).toBeVisible()
      await expect(nav.locator('button', { hasText: 'AI' }).first()).toBeVisible()
      await expect(nav.locator('button', { hasText: 'AI 费用' })).toBeVisible()
      await expect(nav.locator('button', { hasText: '关于' })).toBeVisible()
    })

    test('should switch between tabs', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()
      await expect(page.locator('h2', { hasText: '通知' })).toBeVisible()
      await nav.locator('button', { hasText: '关于' }).click()
      await expect(page.locator('h2', { hasText: '关于' })).toBeVisible()
    })
  })

  test.describe('Appearance Tab', () => {
    test('should show theme presets', async ({ page }) => {
      await sidebarPage.openSettings()
      await expect(page.getByText('护眼模式')).toBeVisible()
      await expect(page.getByText('羊皮纸')).toBeVisible()
      await expect(page.getByText('墨水屏')).toBeVisible()
    })

    test('should show mode options', async ({ page }) => {
      await sidebarPage.openSettings()
      const dialog = page.locator('[data-testid="settings-dialog"]')
      await expect(dialog.locator('button', { hasText: '浅色' })).toBeVisible()
      await expect(dialog.locator('button', { hasText: '深色' })).toBeVisible()
      await expect(dialog.locator('button', { hasText: '跟随系统' })).toBeVisible()
    })
  })

  test.describe('Notification Tab', () => {
    test('should show poll interval selector', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()
      const select = page.locator('[data-testid="settings-dialog"] select').first()
      await expect(select).toBeVisible()
      await expect(select).toHaveValue('30m')
    })

    test('should change poll interval', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()
      const select = page.locator('[data-testid="settings-dialog"] select').first()
      await select.selectOption('1h')
      await expect(select).toHaveValue('1h')
    })

    test('should toggle enable notifications', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()
      const toggle = page.getByRole('switch', { name: '启用通知' })
      await expect(toggle).toBeVisible()
      await toggle.click()
    })

    test('should show notification type when enabled', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()
      await page.getByRole('switch', { name: '启用通知' }).click()
      await expect(page.getByText('通知类型')).toBeVisible()
      await expect(page.getByText('每批次最大通知数')).toBeVisible()
    })

    test('should show background refresh and close to tray', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '通知' }).click()
      await expect(page.getByRole('switch', { name: '后台刷新' })).toBeVisible()
      await expect(page.getByRole('switch', { name: '关闭到托盘' })).toBeVisible()
    })
  })

  test.describe('AI Tab', () => {
    test('should show AI configuration fields', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()
      await expect(page.getByRole('heading', { name: 'API 地址' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'API Key' })).toBeVisible()
      await expect(page.getByRole('heading', { name: '模型' })).toBeVisible()
      await expect(page.getByRole('heading', { name: '最大 Token 数' })).toBeVisible()
    })

    test('should show default AI settings values', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()
      await expect(page.locator('input[placeholder="https://api.openai.com/v1"]')).toHaveValue('https://api.openai.com/v1')
      await expect(page.locator('input[placeholder="gpt-4o-mini"]')).toHaveValue('gpt-4o-mini')
    })

    test('should show language selector', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()
      const langSelect = page.locator('[data-testid="settings-dialog"] select').filter({
        has: page.locator('option[value="zh-CN"]'),
      })
      await expect(langSelect).toBeVisible()
      await expect(langSelect).toHaveValue('zh-CN')
    })
  })

  test.describe('AI Usage Tab', () => {
    test('should show usage summary cards', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()
      await expect(page.getByText('总 Token')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('预估费用')).toBeVisible()
      await expect(page.getByText('调用次数')).toBeVisible()
    })

    test('should show usage by type', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()
      await expect(page.getByText('按类型统计')).toBeVisible({ timeout: 5000 })
    })

    test('should show clear history confirm flow', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()
      const clearBtn = page.locator('button', { hasText: '清空历史记录' })
      await expect(clearBtn).toBeVisible({ timeout: 5000 })
      await clearBtn.click()
      await expect(page.locator('button', { hasText: '确认清空' })).toBeVisible()
      await page.locator('button', { hasText: '取消' }).click()
      await expect(clearBtn).toBeVisible()
    })
  })

  test.describe('About Tab', () => {
    test('should show app info', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '关于' }).click()
      await expect(page.locator('[data-testid="settings-dialog"] h3').filter({ hasText: 'RSS Reader' })).toBeVisible()
      await expect(page.getByText('v0.0.1')).toBeVisible()
    })

    test('should show tech stack info', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '关于' }).click()
      await expect(page.getByText('Tauri v2 + React 19')).toBeVisible()
    })

    test('should show check update button', async ({ page }) => {
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: '关于' }).click()
      await expect(page.locator('button', { hasText: '检查更新' })).toBeVisible()
    })
  })
})
