import { test, expect } from '@playwright/test'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * Dark Mode Theme Tests
 *
 * Verifies that dark mode styles are correctly applied:
 * - Background colors change appropriately
 * - Text colors have proper contrast
 * - Theme switching works correctly
 */
test.describe('Dark Mode Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    await page.goto('/')
    await page.waitForSelector('[data-testid="feed-panel-content"]')
  })

  test.describe('Theme Attributes', () => {
    test('should have data-theme attribute on html element', async ({ page }) => {
      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBeTruthy()
      expect(['eye-care', 'paper', 'eink']).toContain(dataTheme)
    })

    test('should have data-mode attribute on html element', async ({ page }) => {
      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(dataMode).toBeTruthy()
      expect(['light', 'dark']).toContain(dataMode)
    })
  })

  test.describe('Dark Mode Activation', () => {
    test('should apply dark mode when data-mode is dark', async ({ page }) => {
      // Set dark mode via localStorage and reload
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-mode', 'dark')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      // Verify data-mode is set to dark
      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(dataMode).toBe('dark')
    })

    test('should apply light mode when data-mode is light', async ({ page }) => {
      // Set light mode via localStorage and reload
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-mode', 'light')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      // Verify data-mode is set to light
      const dataMode = await page.locator('html').getAttribute('data-mode')
      expect(dataMode).toBe('light')
    })
  })

  test.describe('Dark Mode Background Colors', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure dark mode is active
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-mode', 'dark')
        localStorage.setItem('rss-reader-theme-preset', 'eye-care')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')
    })

    test('article list panel should have dark background in dark mode', async ({ page }) => {
      const articleListPanel = page.locator('[data-testid="article-list-panel-content"]')
      await expect(articleListPanel).toBeVisible()

      // Get computed background color
      const bgColor = await articleListPanel.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      // In dark mode, background should be dark (low RGB values)
      // Parse rgb(r, g, b) format
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        // Dark background should have low luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
        expect(luminance).toBeLessThan(100) // Dark threshold
      }
    })

    test('reader panel should have dark background in dark mode', async ({ page }) => {
      const readerPanel = page.locator('[data-testid="reader-panel-content"]')
      await expect(readerPanel).toBeVisible()

      // Get computed background color
      const bgColor = await readerPanel.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      // In dark mode, background should be dark
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
        expect(luminance).toBeLessThan(100)
      }
    })

    test('sidebar should remain dark regardless of theme mode', async ({ page }) => {
      const sidebar = page.locator('[data-testid="feed-panel-content"]')
      await expect(sidebar).toBeVisible()

      // Sidebar uses fixed dark colors (sidebar-bg: #1C1917)
      const bgColor = await sidebar.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
        expect(luminance).toBeLessThan(50) // Sidebar is always very dark
      }
    })
  })

  test.describe('Light Mode Background Colors', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure light mode is active
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-mode', 'light')
        localStorage.setItem('rss-reader-theme-preset', 'eye-care')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')
    })

    test('article list panel should have light background in light mode', async ({ page }) => {
      const articleListPanel = page.locator('[data-testid="article-list-panel-content"]')
      await expect(articleListPanel).toBeVisible()

      const bgColor = await articleListPanel.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
        expect(luminance).toBeGreaterThan(200) // Light threshold
      }
    })

    test('reader panel should have light background in light mode', async ({ page }) => {
      const readerPanel = page.locator('[data-testid="reader-panel-content"]')
      await expect(readerPanel).toBeVisible()

      const bgColor = await readerPanel.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
        expect(luminance).toBeGreaterThan(200)
      }
    })
  })

  test.describe('Theme Switching via Settings', () => {
    test('should switch to dark mode via settings dialog', async ({ page }) => {
      // Open settings dialog
      const settingsButton = page.locator('button[title="设置"]')
      await settingsButton.click()

      // Wait for settings dialog
      await page.waitForSelector('text=外观')

      // Find and click dark mode option
      const darkModeButton = page.locator('button:has-text("深色")')
      if (await darkModeButton.isVisible()) {
        await darkModeButton.click()

        // Verify data-mode changed to dark
        const dataMode = await page.locator('html').getAttribute('data-mode')
        expect(dataMode).toBe('dark')
      }
    })

    test('should switch to light mode via settings dialog', async ({ page }) => {
      // First set to dark mode
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-mode', 'dark')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      // Open settings dialog
      const settingsButton = page.locator('button[title="设置"]')
      await settingsButton.click()

      // Wait for settings dialog
      await page.waitForSelector('text=外观')

      // Find and click light mode option
      const lightModeButton = page.locator('button:has-text("浅色")')
      if (await lightModeButton.isVisible()) {
        await lightModeButton.click()

        // Verify data-mode changed to light
        const dataMode = await page.locator('html').getAttribute('data-mode')
        expect(dataMode).toBe('light')
      }
    })
  })

  test.describe('Theme Presets', () => {
    test('should apply eye-care theme preset', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-preset', 'eye-care')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBe('eye-care')
    })

    test('should apply paper theme preset', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-preset', 'paper')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBe('paper')
    })

    test('should apply eink theme preset', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-preset', 'eink')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      const dataTheme = await page.locator('html').getAttribute('data-theme')
      expect(dataTheme).toBe('eink')
    })
  })

  test.describe('Visual Regression', () => {
    test('should capture screenshot in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-mode', 'dark')
        localStorage.setItem('rss-reader-theme-preset', 'eye-care')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      // Wait for transitions to complete
      await page.waitForTimeout(300)

      await page.screenshot({
        path: 'tests/screenshots/dark-mode-eye-care.png',
        fullPage: true,
      })
    })

    test('should capture screenshot in light mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('rss-reader-theme-mode', 'light')
        localStorage.setItem('rss-reader-theme-preset', 'eye-care')
      })
      await page.reload()
      await page.waitForSelector('[data-testid="feed-panel-content"]')

      // Wait for transitions to complete
      await page.waitForTimeout(300)

      await page.screenshot({
        path: 'tests/screenshots/light-mode-eye-care.png',
        fullPage: true,
      })
    })
  })
})
