import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Article Reader Feature
 *
 * Uses Tauri mock to provide a working app environment with feeds and articles.
 *
 * Updated for the new 3-panel layout:
 * - Close button removed (Escape deselects article)
 * - Keyboard shortcuts hint bar removed
 * - Reader is always in the right panel
 */
test.describe('Article Reader', () => {
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

    // Load articles by clicking "全部文章"
    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
  })

  /**
   * Basic Reader Opening Tests
   */
  test.describe('Opening Articles', () => {
    test('should open article when clicked from article list', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()
      await expect(articleViewerPage.articleTitle).toBeVisible()
    })

    test('should display article title and meta information', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const title = await articleViewerPage.getArticleTitle()
      expect(title).toBeTruthy()
      expect(title?.length).toBeGreaterThan(0)

      const meta = await articleViewerPage.getArticleMeta()
      expect(meta).toContain('查看原文')
    })

    test('should display article content', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForContent()

      const content = await articleViewerPage.getArticleContent()
      expect(content?.length).toBeGreaterThan(0)
    })

    test('should show article counter', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const counter = await articleViewerPage.getArticleCounter()
      expect(counter).toMatch(/\d+ \/ \d+/)
    })

    test('should have toolbar buttons', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await expect(articleViewerPage.settingsButton).toBeVisible()
      await expect(articleViewerPage.externalLinkButton).toBeVisible()
    })
  })

  /**
   * Escape Key - Deselects Article (replaces "Closing Reader" tests)
   */
  test.describe('Deselecting Article', () => {
    test('should deselect article when pressing Escape', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.closeWithEscape()

      // Article should no longer be visible in the reader
      await expect(articleViewerPage.articleTitle).not.toBeVisible()
    })
  })

  /**
   * Favorite/Unfavorite Tests
   */
  test.describe('Favorite Articles', () => {
    test('should show favorite button in toolbar', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Either favorite or unfavorite button should be visible
      const hasFavorite = await articleViewerPage.favoriteButton.isVisible().catch(() => false)
      const hasUnfavorite = await articleViewerPage.unfavoriteButton.isVisible().catch(() => false)
      expect(hasFavorite || hasUnfavorite).toBe(true)
    })

    test('should toggle favorite status when clicking button', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const wasFavorited = await articleViewerPage.isFavorited()

      await articleViewerPage.toggleFavorite()

      const isNowFavorited = await articleViewerPage.isFavorited()
      expect(isNowFavorited).not.toBe(wasFavorited)
    })

    test('should toggle favorite with F key', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const wasFavorited = await articleViewerPage.isFavorited()

      await articleViewerPage.toggleFavoriteWithKeyboard()

      const isNowFavorited = await articleViewerPage.isFavorited()
      expect(isNowFavorited).not.toBe(wasFavorited)
    })
  })

  /**
   * Navigation Tests
   */
  test.describe('Article Navigation', () => {
    test('should show navigation buttons when multiple articles exist', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      expect(await articleViewerPage.hasNextArticle()).toBe(true)
    })

    test('should navigate to next article with button', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      await articleViewerPage.clickNext()

      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)
    })

    test('should navigate to previous article with button', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      await articleViewerPage.clickNext()

      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      await articleViewerPage.clickPrevious()

      const backToFirstTitle = await articleViewerPage.getArticleTitle()
      expect(backToFirstTitle).toBe(firstTitle)
    })

    test('should navigate with N and P keys', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      await articleViewerPage.goToNextWithKeyboard()

      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      await articleViewerPage.goToPreviousWithKeyboard()

      const backToFirstTitle = await articleViewerPage.getArticleTitle()
      expect(backToFirstTitle).toBe(firstTitle)
    })

    test('should navigate with arrow keys', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      await articleViewerPage.goToNextWithArrowKey()

      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      await articleViewerPage.goToPreviousWithArrowKey()

      const backToFirstTitle = await articleViewerPage.getArticleTitle()
      expect(backToFirstTitle).toBe(firstTitle)
    })
  })

  /**
   * Reader Settings Tests
   */
  test.describe('Reader Settings', () => {
    test('should open settings panel', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      expect(await articleViewerPage.isSettingsPanelVisible()).toBe(true)

      await expect(articleViewerPage.fontSizeSlider).toBeVisible()
      await expect(articleViewerPage.lineHeightSlider).toBeVisible()
      await expect(articleViewerPage.letterSpacingSlider).toBeVisible()
      await expect(articleViewerPage.maxWidthSlider).toBeVisible()
    })

    test('should adjust font size', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      const initialSize = await articleViewerPage.getFontSize()

      await articleViewerPage.setFontSize(initialSize + 4)

      const newSize = await articleViewerPage.getFontSize()
      expect(newSize).toBe(initialSize + 4)
    })

    test('should adjust line height', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      await articleViewerPage.setLineHeight(2.0)

      const newHeight = await articleViewerPage.getLineHeight()
      expect(newHeight).toBeCloseTo(2.0, 1)
    })

    test('should adjust letter spacing', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      const initialSpacing = await articleViewerPage.getLetterSpacing()

      await articleViewerPage.setLetterSpacing(2.0)

      const newSpacing = await articleViewerPage.getLetterSpacing()
      expect(newSpacing).toBeCloseTo(2.0, 1)
      expect(newSpacing).not.toBe(initialSpacing)
    })

    test('should adjust content width', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      const initialWidth = await articleViewerPage.getMaxWidth()

      await articleViewerPage.setMaxWidth(100)

      const newWidth = await articleViewerPage.getMaxWidth()
      expect(newWidth).toBe(100)
      expect(newWidth).not.toBe(initialWidth)
    })

    test('should change text alignment', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      let currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('left')

      await articleViewerPage.setTextAlign('center')
      currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('center')

      await articleViewerPage.setTextAlign('justify')
      currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('justify')

      await articleViewerPage.setTextAlign('left')
      currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('left')
    })

    test('should toggle progress bar visibility', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      expect(await articleViewerPage.isProgressBarVisible()).toBe(true)

      await articleViewerPage.openSettings()

      await articleViewerPage.toggleShowProgress()

      expect(await articleViewerPage.isProgressBarVisible()).toBe(false)

      await articleViewerPage.toggleShowProgress()

      expect(await articleViewerPage.isProgressBarVisible()).toBe(true)
    })

    test('should reset settings to defaults', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      await articleViewerPage.setFontSize(20)
      await articleViewerPage.setLineHeight(2.2)

      await articleViewerPage.resetSettings()

      const fontSize = await articleViewerPage.getFontSize()
      const lineHeight = await articleViewerPage.getLineHeight()

      expect(fontSize).toBe(16)
      expect(lineHeight).toBeCloseTo(1.8, 1)
    })

    test('should persist settings after selecting different article', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      await articleViewerPage.setFontSize(20)

      await articleViewerPage.closeSettings()

      // Select a different article
      await articleListPage.clickArticle(1)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      const fontSize = await articleViewerPage.getFontSize()
      expect(fontSize).toBe(20)

      // Clean up
      await articleViewerPage.resetSettings()
    })
  })

  /**
   * Reading Progress Tests
   */
  test.describe('Reading Progress', () => {
    test('should show progress bar', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      expect(await articleViewerPage.isProgressBarVisible()).toBe(true)

      const initialProgress = await articleViewerPage.getScrollProgress()
      expect(initialProgress).toBeGreaterThanOrEqual(0)
      expect(initialProgress).toBeLessThanOrEqual(100)
    })
  })

  /**
   * Keyboard Shortcuts Tests
   */
  test.describe('Keyboard Shortcuts', () => {
    test('should use Escape key to deselect article', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      await expect(articleViewerPage.articleTitle).not.toBeVisible()
    })

    test('should use F key to toggle favorite', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const initialFavState = await articleViewerPage.isFavorited()

      await page.keyboard.press('f')
      await page.waitForTimeout(500)

      const newFavState = await articleViewerPage.isFavorited()
      expect(newFavState).not.toBe(initialFavState)
    })

    test('should use arrow keys for navigation', async ({ page }) => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(500)

      let currentTitle = await articleViewerPage.getArticleTitle()
      expect(currentTitle).not.toBe(firstTitle)

      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(500)

      currentTitle = await articleViewerPage.getArticleTitle()
      expect(currentTitle).toBe(firstTitle)
    })
  })

  /**
   * XSS Protection Tests
   */
  test.describe('XSS Protection', () => {
    test('should sanitize script tags from article content', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForContent()

      const hasScripts = await articleViewerPage.hasUnsanitizedScript()
      expect(hasScripts).toBe(false)
    })

    test('should render allowed HTML tags', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForContent()

      const content = await articleViewerPage.getArticleContent()

      expect(content?.length).toBeGreaterThan(0)

      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content || '')
      expect(hasHtmlTags).toBe(true)
    })
  })

  /**
   * Screenshot Tests for Visual Verification
   */
  test.describe('Visual Verification', () => {
    test('should take screenshot of reader view', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.screenshot('test-results/reader-view.png')
    })

    test('should take screenshot with settings panel open', async () => {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      await articleViewerPage.screenshot('test-results/reader-with-settings.png')
    })
  })
})
