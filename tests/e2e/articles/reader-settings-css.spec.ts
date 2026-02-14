import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Reader Settings CSS Verification
 *
 * Complements reader.spec.ts by verifying that settings changes
 * are actually applied to the article content DOM (CSS styles).
 * Also tests persistence across page reload.
 */
test.describe('Reader Settings CSS Application', () => {
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
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()
  })

  test.afterEach(async ({ page }) => {
    // Reset settings to defaults (dialog may or may not be open)
    const isSettingsOpen = await articleViewerPage.isSettingsPanelVisible()
    if (!isSettingsOpen) {
      // Check if article is still selected
      const isArticleVisible = await articleViewerPage.isVisible()
      if (isArticleVisible) {
        await articleViewerPage.openSettings()
      } else {
        // Re-select article to access settings
        await feedListPage.clickAllArticles()
        await articleListPage.waitForLoaded()
        await articleListPage.clickArticle(0)
        await articleViewerPage.waitForVisible()
        await articleViewerPage.openSettings()
      }
    }
    await articleViewerPage.resetSettings()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })

  /** Helper to get computed style of the article element */
  async function getArticleStyle(page: import('@playwright/test').Page) {
    return page.evaluate(() => {
      const article = document.querySelector(
        '[data-testid="article-content-area"] article'
      ) as HTMLElement
      if (!article) return null
      return {
        fontSize: article.style.fontSize,
        lineHeight: article.style.lineHeight,
        letterSpacing: article.style.letterSpacing,
        textAlign: article.style.textAlign,
        maxWidth: article.style.maxWidth,
      }
    })
  }

  test.describe('Font Size CSS', () => {
    test('should apply default font size to article content', async ({ page }) => {
      const style = await getArticleStyle(page)
      expect(style?.fontSize).toBe('16px')
    })

    test('should apply changed font size to article content', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setFontSize(20)

      // Close settings to verify on article
      await articleViewerPage.closeSettings()

      const style = await getArticleStyle(page)
      expect(style?.fontSize).toBe('20px')
    })
  })

  test.describe('Line Height CSS', () => {
    test('should apply default line height to article content', async ({ page }) => {
      const style = await getArticleStyle(page)
      expect(style?.lineHeight).toBe('1.8')
    })

    test('should apply changed line height to article content', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setLineHeight(2.2)
      await articleViewerPage.closeSettings()

      const style = await getArticleStyle(page)
      expect(parseFloat(style?.lineHeight ?? '0')).toBeCloseTo(2.2, 1)
    })
  })

  test.describe('Letter Spacing CSS', () => {
    test('should apply default letter spacing to article content', async ({ page }) => {
      const style = await getArticleStyle(page)
      expect(style?.letterSpacing).toBe('0px')
    })

    test('should apply changed letter spacing to article content', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setLetterSpacing(2)
      await articleViewerPage.closeSettings()

      const style = await getArticleStyle(page)
      expect(style?.letterSpacing).toBe('2px')
    })
  })

  test.describe('Text Align CSS', () => {
    test('should apply default text alignment to article content', async ({ page }) => {
      const style = await getArticleStyle(page)
      expect(style?.textAlign).toBe('left')
    })

    test('should apply center alignment to article content', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setTextAlign('center')

      // Check style while settings dialog is still open (Escape would deselect article)
      const style = await getArticleStyle(page)
      expect(style?.textAlign).toBe('center')
    })

    test('should apply justify alignment to article content', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setTextAlign('justify')

      const style = await getArticleStyle(page)
      expect(style?.textAlign).toBe('justify')
    })
  })

  test.describe('Max Width CSS', () => {
    test('should apply default max width to article content', async ({ page }) => {
      const style = await getArticleStyle(page)
      expect(style?.maxWidth).toBe('80ch')
    })

    test('should apply changed max width to article content', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setMaxWidth(100)
      await articleViewerPage.closeSettings()

      const style = await getArticleStyle(page)
      expect(style?.maxWidth).toBe('100ch')
    })
  })

  test.describe('Settings Persistence Across Reload', () => {
    test('should persist font size after page reload', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setFontSize(22)
      await articleViewerPage.closeSettings()

      // Reload the page
      await page.addInitScript(buildTauriMockScript())
      await page.reload()
      await feedListPage.waitForLoaded()
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const style = await getArticleStyle(page)
      expect(style?.fontSize).toBe('22px')
    })

    test('should persist text alignment after page reload', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setTextAlign('justify')
      await articleViewerPage.closeSettings()

      await page.addInitScript(buildTauriMockScript())
      await page.reload()
      await feedListPage.waitForLoaded()
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const style = await getArticleStyle(page)
      expect(style?.textAlign).toBe('justify')
    })
  })

  test.describe('Multiple Settings Combined', () => {
    test('should apply multiple settings simultaneously', async ({ page }) => {
      await articleViewerPage.openSettings()
      await articleViewerPage.setFontSize(18)
      await articleViewerPage.setLineHeight(2.0)
      await articleViewerPage.setLetterSpacing(1)
      await articleViewerPage.setMaxWidth(90)
      await articleViewerPage.setTextAlign('justify')

      // Check style while settings dialog is still open
      const style = await getArticleStyle(page)
      expect(style?.fontSize).toBe('18px')
      expect(parseFloat(style?.lineHeight ?? '0')).toBeCloseTo(2.0, 1)
      expect(style?.letterSpacing).toBe('1px')
      expect(style?.maxWidth).toBe('90ch')
      expect(style?.textAlign).toBe('justify')
    })

    test('should reset all settings to defaults', async ({ page }) => {
      // Change multiple settings
      await articleViewerPage.openSettings()
      await articleViewerPage.setFontSize(20)
      await articleViewerPage.setLineHeight(2.2)
      await articleViewerPage.setLetterSpacing(3)
      await articleViewerPage.setMaxWidth(100)
      await articleViewerPage.setTextAlign('center')

      // Reset
      await articleViewerPage.resetSettings()

      // Check style while settings dialog is still open
      const style = await getArticleStyle(page)
      expect(style?.fontSize).toBe('16px')
      expect(style?.lineHeight).toBe('1.8')
      expect(style?.letterSpacing).toBe('0px')
      expect(style?.maxWidth).toBe('80ch')
      expect(style?.textAlign).toBe('left')
    })
  })
})
