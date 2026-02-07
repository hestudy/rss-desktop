import { test, expect } from '@playwright/test'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * UI Rendering Tests
 *
 * These tests verify that the UI renders correctly.
 * Uses Tauri mock for a consistent test environment.
 */
test.describe('UI Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    await page.goto('/')
  })

  test('should render page structure', async ({ page }) => {
    // The main container has h-screen class
    const container = page.locator('div.h-screen')
    expect(await container.count()).toBeGreaterThanOrEqual(1)
  })

  test('page should be accessible', async ({ page }) => {
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('should have a body element', async ({ page }) => {
    const body = page.locator('body')
    await expect(body).toBeAttached()
  })
})

test.describe('Playwright Test Infrastructure', () => {
  test('playwright is properly configured', async ({ page }) => {
    await page.goto('about:blank')
    const url = page.url()
    expect(url).toContain('about:blank')
  })

  test('can navigate to localhost', async ({ page }) => {
    const response = await page.goto('http://localhost:1420')
    expect(response?.status()).toBe(200)
  })
})
