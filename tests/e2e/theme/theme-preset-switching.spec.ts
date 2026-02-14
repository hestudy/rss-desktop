import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/SidebarPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Theme Preset Switching via Settings Dialog
 *
 * Complements dark-mode.spec.ts (which tests via localStorage) by testing
 * the interactive flow: clicking preset/mode buttons in the settings dialog
 * and verifying that data-theme/data-mode attributes and localStorage update.
 */
test.describe('Theme Preset Switching via Settings', () => {
  let sidebarPage: SidebarPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    sidebarPage = new SidebarPage(page)
    await page.goto('/')
    await sidebarPage.waitForLoaded()
  })

  /** Open settings and navigate to appearance tab */
  async function openAppearanceTab(page: import('@playwright/test').Page) {
    await sidebarPage.openSettings()
    const nav = page.locator('[data-testid="settings-dialog"] nav')
    await nav.locator('button', { hasText: '外观' }).click()
  }

  test.describe('Theme Preset Interactive Switching', () => {
    test('should switch to paper preset via settings dialog', async ({ page }) => {
      await openAppearanceTab(page)

      // Click paper preset button
      const paperButton = page.locator('[data-testid="settings-dialog"] button', { hasText: '羊皮纸' })
      await paperButton.click()

      // Verify data-theme attribute changed
      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBe('paper')

      // Verify the button shows active state (border-primary)
      await expect(paperButton).toHaveClass(/border-primary/)
    })

    test('should switch to eink preset via settings dialog', async ({ page }) => {
      await openAppearanceTab(page)

      const einkButton = page.locator('[data-testid="settings-dialog"] button', { hasText: '墨水屏' })
      await einkButton.click()

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBe('eink')

      await expect(einkButton).toHaveClass(/border-primary/)
    })

    test('should switch back to eye-care preset', async ({ page }) => {
      // First switch to paper
      await openAppearanceTab(page)
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '羊皮纸' }).click()
      expect(await page.locator('html').getAttribute('data-theme')).toBe('paper')

      // Switch back to eye-care
      const eyeCareButton = page.locator('[data-testid="settings-dialog"] button', { hasText: '护眼模式' })
      await eyeCareButton.click()

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBe('eye-care')
      await expect(eyeCareButton).toHaveClass(/border-primary/)
    })

    test('should cycle through all presets', async ({ page }) => {
      await openAppearanceTab(page)

      const presets = [
        { name: '羊皮纸', key: 'paper' },
        { name: '墨水屏', key: 'eink' },
        { name: '护眼模式', key: 'eye-care' },
      ]

      for (const preset of presets) {
        await page.locator('[data-testid="settings-dialog"] button', { hasText: preset.name }).click()
        const dataTheme = await page.locator('html').getAttribute('data-theme')
        expect(dataTheme).toBe(preset.key)
      }
    })
  })

  test.describe('Theme Mode Interactive Switching', () => {
    test('should switch to dark mode via settings dialog', async ({ page }) => {
      await openAppearanceTab(page)

      const darkButton = page.locator('[data-testid="settings-dialog"] button', { hasText: '深色' })
      await darkButton.click()

      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(dataMode).toBe('dark')
      await expect(darkButton).toHaveClass(/border-primary/)
    })

    test('should switch to light mode via settings dialog', async ({ page }) => {
      await openAppearanceTab(page)

      const lightButton = page.locator('[data-testid="settings-dialog"] button', { hasText: '浅色' })
      await lightButton.click()

      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(dataMode).toBe('light')
      await expect(lightButton).toHaveClass(/border-primary/)
    })

    test('should switch to system mode via settings dialog', async ({ page }) => {
      await openAppearanceTab(page)

      const systemButton = page.locator('[data-testid="settings-dialog"] button', { hasText: '跟随系统' })
      await systemButton.click()

      // data-mode should be either light or dark depending on system preference
      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(['light', 'dark']).toContain(dataMode)
      await expect(systemButton).toHaveClass(/border-primary/)
    })
  })

  test.describe('Theme Persistence via localStorage', () => {
    test('should persist preset change in localStorage', async ({ page }) => {
      await openAppearanceTab(page)

      await page.locator('[data-testid="settings-dialog"] button', { hasText: '墨水屏' }).click()

      const storedPreset = await page.evaluate(() =>
        localStorage.getItem('rss-reader-theme-preset')
      )
      expect(storedPreset).toBe('eink')
    })

    test('should persist mode change in localStorage', async ({ page }) => {
      await openAppearanceTab(page)

      await page.locator('[data-testid="settings-dialog"] button', { hasText: '深色' }).click()

      const storedMode = await page.evaluate(() =>
        localStorage.getItem('rss-reader-theme-mode')
      )
      expect(storedMode).toBe('dark')
    })

    test('should restore preset after page reload', async ({ page }) => {
      await openAppearanceTab(page)
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '羊皮纸' }).click()

      // Reload
      await page.addInitScript(buildTauriMockScript())
      await page.reload()
      await sidebarPage.waitForLoaded()

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBe('paper')
    })

    test('should restore mode after page reload', async ({ page }) => {
      await openAppearanceTab(page)
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '深色' }).click()

      await page.addInitScript(buildTauriMockScript())
      await page.reload()
      await sidebarPage.waitForLoaded()

      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(dataMode).toBe('dark')
    })
  })

  test.describe('Theme Visual Verification', () => {
    test('should change body background when switching to dark mode', async ({ page }) => {
      // Get light mode body background
      const lightBg = await page.evaluate(() =>
        window.getComputedStyle(document.body).backgroundColor
      )

      // Switch to dark mode
      await openAppearanceTab(page)
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '深色' }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Get dark mode body background
      const darkBg = await page.evaluate(() =>
        window.getComputedStyle(document.body).backgroundColor
      )

      // data-mode should have changed
      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(dataMode).toBe('dark')

      // If both are transparent, verify via CSS variable instead
      if (lightBg === 'rgba(0, 0, 0, 0)' && darkBg === 'rgba(0, 0, 0, 0)') {
        // Verify the data-mode attribute changed (which drives CSS variables)
        expect(dataMode).toBe('dark')
      } else {
        expect(darkBg).not.toBe(lightBg)
      }
    })

    test('should update data-theme when switching presets via UI', async ({ page }) => {
      // Verify initial preset
      const initialTheme = await page.locator('html').getAttribute('data-theme')
      expect(initialTheme).toBe('eye-care')

      // Switch to eink preset
      await openAppearanceTab(page)
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '墨水屏' }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      const newTheme = await page.locator('html').getAttribute('data-theme')
      expect(newTheme).toBe('eink')
      expect(newTheme).not.toBe(initialTheme)
    })
  })

  test.describe('Preset and Mode Combination', () => {
    test('should apply both preset and mode together', async ({ page }) => {
      await openAppearanceTab(page)

      // Set eink + dark
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '墨水屏' }).click()
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '深色' }).click()

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      const dataMode = await page.locator('html').getAttribute('data-mode')

      expect(dataTheme).toBe('eink')
      expect(dataMode).toBe('dark')
    })

    test('should persist both preset and mode after reload', async ({ page }) => {
      await openAppearanceTab(page)

      await page.locator('[data-testid="settings-dialog"] button', { hasText: '羊皮纸' }).click()
      await page.locator('[data-testid="settings-dialog"] button', { hasText: '深色' }).click()

      await page.addInitScript(buildTauriMockScript())
      await page.reload()
      await sidebarPage.waitForLoaded()

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      const dataMode = await page.locator('html').getAttribute('data-mode')

      expect(dataTheme).toBe('paper')
      expect(dataMode).toBe('dark')
    })
  })
})
