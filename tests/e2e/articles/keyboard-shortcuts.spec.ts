import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Keyboard Shortcuts (edge cases)
 *
 * Complements reader.spec.ts by testing:
 * - Shortcuts disabled when typing in input fields
 * - Boundary cases (first/last article navigation)
 * - Multiple rapid key presses
 */
test.describe('Keyboard Shortcuts Edge Cases', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()
  })

  test.afterEach(async () => {
    await feedListPage.closeAnyDialog()
  })

  test.describe('Shortcuts Disabled in Input Fields', () => {
    test('should not toggle favorite when pressing F in search/input', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const wasFavorited = await articleViewerPage.isFavorited()

      // Open settings to get an input field
      await articleViewerPage.openSettings()

      // Focus on a slider input and press 'f'
      const slider = page.locator('[data-testid="settings-dialog"] input[type="range"]').first()
      await slider.focus()
      await page.keyboard.press('f')

      // Close settings
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Favorite state should NOT have changed
      const isStillSame = await articleViewerPage.isFavorited()
      expect(isStillSame).toBe(wasFavorited)
    })
  })

  test.describe('Navigation Boundary Cases', () => {
    test('should not crash when pressing P on first article', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      // Press P when already on first article (no previous)
      await page.keyboard.press('p')
      await page.waitForTimeout(300)

      // Should still show the same article
      const currentTitle = await articleViewerPage.getArticleTitle()
      expect(currentTitle).toBe(firstTitle)
    })

    test('should not crash when pressing ArrowLeft on first article', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(300)

      const currentTitle = await articleViewerPage.getArticleTitle()
      expect(currentTitle).toBe(firstTitle)
    })

    test('should not crash when pressing N on last article', async ({ page }) => {
      // Click the last article
      const articleCount = await articleListPage.getArticleCount()
      await articleListPage.clickArticle(articleCount - 1)
      await articleViewerPage.waitForVisible()

      const lastTitle = await articleViewerPage.getArticleTitle()

      await page.keyboard.press('n')
      await page.waitForTimeout(300)

      const currentTitle = await articleViewerPage.getArticleTitle()
      expect(currentTitle).toBe(lastTitle)
    })

    test('should not crash when pressing ArrowRight on last article', async ({ page }) => {
      const articleCount = await articleListPage.getArticleCount()
      await articleListPage.clickArticle(articleCount - 1)
      await articleViewerPage.waitForVisible()

      const lastTitle = await articleViewerPage.getArticleTitle()

      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(300)

      const currentTitle = await articleViewerPage.getArticleTitle()
      expect(currentTitle).toBe(lastTitle)
    })
  })

  test.describe('Sequential Navigation', () => {
    test('should navigate through all articles with N key', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const titles: string[] = []
      const firstTitle = await articleViewerPage.getArticleTitle()
      titles.push(firstTitle ?? '')

      // Navigate forward through articles
      const articleCount = await articleListPage.getArticleCount()
      for (let i = 1; i < articleCount; i++) {
        await articleViewerPage.goToNextWithKeyboard()
        const title = await articleViewerPage.getArticleTitle()
        titles.push(title ?? '')
      }

      // All titles should be unique
      const uniqueTitles = new Set(titles)
      expect(uniqueTitles.size).toBe(articleCount)
    })

    test('should navigate back to first article after forward navigation', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      // Go forward
      await articleViewerPage.goToNextWithKeyboard()
      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      // Go back
      await articleViewerPage.goToPreviousWithKeyboard()
      const backTitle = await articleViewerPage.getArticleTitle()
      expect(backTitle).toBe(firstTitle)
    })
  })

  test.describe('Escape Key Behavior', () => {
    test('should deselect article and show placeholder', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Article title should not be visible (placeholder shown)
      await expect(articleViewerPage.articleTitle).not.toBeVisible()

      // Empty reader icon should be visible
      await expect(page.locator('[data-testid="empty-reader-icon"]')).toBeVisible()
    })

    test('should close settings dialog with Escape (may also deselect article)', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Open settings
      await articleViewerPage.openSettings()
      expect(await articleViewerPage.isSettingsPanelVisible()).toBe(true)

      // Escape closes settings dialog
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      expect(await articleViewerPage.isSettingsPanelVisible()).toBe(false)
    })
  })

  test.describe('Article Counter Updates', () => {
    test('should update counter when navigating with keyboard', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const initialCounter = await articleViewerPage.getArticleCounter()
      expect(initialCounter).toMatch(/^1 \/ \d+$/)

      await articleViewerPage.goToNextWithKeyboard()

      const nextCounter = await articleViewerPage.getArticleCounter()
      expect(nextCounter).toMatch(/^2 \/ \d+$/)
    })
  })
})
