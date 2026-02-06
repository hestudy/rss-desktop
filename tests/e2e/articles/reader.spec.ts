import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { AddFeedDialogPage } from '../../pages/AddFeedDialogPage'
import { WAIT_TIMES } from '../../fixtures/test-helpers'
import { createTestDataSetup } from '../../fixtures/test-data-setup'

/**
 * E2E Tests for Article Reader Feature
 *
 * These tests verify the article reading functionality including:
 * - Opening articles in the reader
 * - Reading progress tracking
 * - Favorite/unfavorite articles
 * - Navigation between articles
 * - Reader settings customization
 * - Keyboard shortcuts
 * - XSS protection
 *
 * Note: These tests require the Tauri backend to be running with existing feeds/articles.
 * When running in a browser-only environment, tests will be skipped if no articles are available.
 */

// Global availability flags
let articlesAvailable = false
let multipleArticlesAvailable = false

test.describe('Article Reader', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage
  let addFeedDialogPage: AddFeedDialogPage
  let testDataSetup: ReturnType<typeof createTestDataSetup>

  test.beforeAll(async () => {
    // Initialize flags
    articlesAvailable = false
    multipleArticlesAvailable = false
  })

  test.beforeEach(async ({ page }) => {
    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)
    addFeedDialogPage = new AddFeedDialogPage(page)
    testDataSetup = createTestDataSetup(page, feedListPage, addFeedDialogPage, articleListPage)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()

    // Try to ensure articles exist (best effort)
    await testDataSetup.ensureFeedWithArticles()

    // Check article availability
    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()
    const count = await articleListPage.getArticleCount()
    articlesAvailable = count > 0
    multipleArticlesAvailable = count >= 2
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
    // Close reader if open
    if (await articleViewerPage.isVisible()) {
      await articleViewerPage.close()
    }
  })

  /**
   * Basic Reader Opening Tests
   */
  test.describe('Opening Articles', () => {
    test('should open article when clicked from article list', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      // Click on the first article
      await articleListPage.clickArticle(0)

      // Verify reader is now visible
      await articleViewerPage.waitForVisible()
      await expect(articleViewerPage.articleTitle).toBeVisible()
    })

    test('should display article title and meta information', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Check title
      const title = await articleViewerPage.getArticleTitle()
      expect(title).toBeTruthy()
      expect(title?.length).toBeGreaterThan(0)

      // Check meta information (should have "查看原文" link)
      const meta = await articleViewerPage.getArticleMeta()
      expect(meta).toContain('查看原文')
    })

    test('should display article content', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForContent()

      // Get article content
      const content = await articleViewerPage.getArticleContent()
      expect(content?.length).toBeGreaterThan(0)
    })

    test('should show article counter', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Check counter
      const counter = await articleViewerPage.getArticleCounter()
      expect(counter).toMatch(/\d+ \/ \d+/)

      // Verify it shows current position
      expect(counter).toContain('1 /')
    })

    test('should have all toolbar buttons', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Check settings button
      await expect(articleViewerPage.settingsButton).toBeVisible()

      // Check external link button
      await expect(articleViewerPage.externalLinkButton).toBeVisible()

      // Check close button
      await expect(articleViewerPage.closeButton).toBeVisible()
    })
  })

  /**
   * Closing Reader Tests
   */
  test.describe('Closing Reader', () => {
    test('should close reader when clicking close button', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Close the reader
      await articleViewerPage.close()

      // Verify reader is closed (article list should be visible again)
      await expect(articleViewerPage.articleTitle).not.toBeVisible()
    })

    test('should close reader when pressing Escape', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Close with Escape key
      await articleViewerPage.closeWithEscape()

      // Verify reader is closed
      await expect(articleViewerPage.articleTitle).not.toBeVisible()
    })
  })

  /**
   * Favorite/Unfavorite Tests
   */
  test.describe('Favorite Articles', () => {
    test('should show favorite button in toolbar', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Favorite button should be visible
      await expect(articleViewerPage.favoriteButton).toBeVisible()
    })

    test('should toggle favorite status when clicking button', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Get initial state
      const wasFavorited = await articleViewerPage.isFavorited()

      // Toggle favorite
      await articleViewerPage.toggleFavorite()

      // Verify state changed
      const isNowFavorited = await articleViewerPage.isFavorited()
      expect(isNowFavorited).not.toBe(wasFavorited)
    })

    test('should toggle favorite with F key', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Get initial state
      const wasFavorited = await articleViewerPage.isFavorited()

      // Press F to toggle
      await articleViewerPage.toggleFavoriteWithKeyboard()

      // Verify state changed
      const isNowFavorited = await articleViewerPage.isFavorited()
      expect(isNowFavorited).not.toBe(wasFavorited)
    })
  })

  /**
   * Navigation Tests
   */
  test.describe('Article Navigation', () => {
    test('should show navigation buttons when multiple articles exist', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles for navigation test')

      // Open first article (should have next but not previous)
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Should have next button
      expect(await articleViewerPage.hasNextArticle()).toBe(true)
    })

    test('should navigate to next article with button', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      // Click next
      await articleViewerPage.clickNext()

      // Should show different article
      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      // Counter should update
      const counter = await articleViewerPage.getArticleCounter()
      expect(counter).toContain('2 /')
    })

    test('should navigate to previous article with button', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      // Go to next
      await articleViewerPage.clickNext()
      await page.waitForTimeout(500)

      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      // Go back to previous
      await articleViewerPage.clickPrevious()

      // Should be back to first article
      const backToFirstTitle = await articleViewerPage.getArticleTitle()
      expect(backToFirstTitle).toBe(firstTitle)

      // Counter should show position 1
      const counter = await articleViewerPage.getArticleCounter()
      expect(counter).toMatch(/1\s*\/\s*\d+/)
    })

    test('should navigate with N and P keys', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      // Press N for next
      await articleViewerPage.goToNextWithKeyboard()

      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      // Press P for previous
      await articleViewerPage.goToPreviousWithKeyboard()

      const backToFirstTitle = await articleViewerPage.getArticleTitle()
      expect(backToFirstTitle).toBe(firstTitle)
    })

    test('should navigate with arrow keys', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      // Press ArrowRight for next
      await articleViewerPage.goToNextWithArrowKey()

      const secondTitle = await articleViewerPage.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      // Press ArrowLeft for previous
      await articleViewerPage.goToPreviousWithArrowKey()

      const backToFirstTitle = await articleViewerPage.getArticleTitle()
      expect(backToFirstTitle).toBe(firstTitle)
    })
  })

  /**
   * Reader Settings Tests
   */
  test.describe('Reader Settings', () => {
    test('should open settings panel', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Open settings
      await articleViewerPage.openSettings()

      // Settings panel should be visible
      expect(await articleViewerPage.isSettingsPanelVisible()).toBe(true)

      // Should show all setting controls
      await expect(articleViewerPage.fontSizeSlider).toBeVisible()
      await expect(articleViewerPage.lineHeightSlider).toBeVisible()
      await expect(articleViewerPage.letterSpacingSlider).toBeVisible()
      await expect(articleViewerPage.maxWidthSlider).toBeVisible()
    })

    test('should adjust font size', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Get initial font size
      const initialSize = await articleViewerPage.getFontSize()

      // Increase font size
      await articleViewerPage.setFontSize(initialSize + 4)

      // Verify font size changed
      const newSize = await articleViewerPage.getFontSize()
      expect(newSize).toBe(initialSize + 4)
    })

    test('should adjust line height', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Get initial line height
      const initialHeight = await articleViewerPage.getLineHeight()

      // Change line height
      await articleViewerPage.setLineHeight(2.0)

      // Verify line height changed
      const newHeight = await articleViewerPage.getLineHeight()
      expect(newHeight).toBeCloseTo(2.0, 1)
    })

    test('should adjust letter spacing', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Get initial letter spacing
      const initialSpacing = await articleViewerPage.getLetterSpacing()

      // Change letter spacing
      await articleViewerPage.setLetterSpacing(2.0)

      // Verify letter spacing changed
      const newSpacing = await articleViewerPage.getLetterSpacing()
      expect(newSpacing).toBeCloseTo(2.0, 1)
      expect(newSpacing).not.toBe(initialSpacing)
    })

    test('should adjust content width', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Get initial max width
      const initialWidth = await articleViewerPage.getMaxWidth()

      // Change max width
      await articleViewerPage.setMaxWidth(100)

      // Verify max width changed
      const newWidth = await articleViewerPage.getMaxWidth()
      expect(newWidth).toBe(100)
      expect(newWidth).not.toBe(initialWidth)
    })

    test('should change text alignment', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Default should be left
      let currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('left')

      // Change to center
      await articleViewerPage.setTextAlign('center')
      currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('center')

      // Change to justify
      await articleViewerPage.setTextAlign('justify')
      currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('justify')

      // Change back to left
      await articleViewerPage.setTextAlign('left')
      currentAlign = await articleViewerPage.getTextAlign()
      expect(currentAlign).toBe('left')
    })

    test('should toggle progress bar visibility', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Progress bar should be visible by default
      expect(await articleViewerPage.isProgressBarVisible()).toBe(true)

      await articleViewerPage.openSettings()

      // Toggle off
      await articleViewerPage.toggleShowProgress()

      // Progress bar should now be hidden
      expect(await articleViewerPage.isProgressBarVisible()).toBe(false)

      // Toggle back on
      await articleViewerPage.toggleShowProgress()

      // Progress bar should be visible again
      expect(await articleViewerPage.isProgressBarVisible()).toBe(true)
    })

    test('should reset settings to defaults', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Change settings from default
      await articleViewerPage.setFontSize(20)
      await articleViewerPage.setLineHeight(2.2)

      // Reset settings
      await articleViewerPage.resetSettings()

      // Should be back to defaults (font size 16, line height 1.8)
      const fontSize = await articleViewerPage.getFontSize()
      const lineHeight = await articleViewerPage.getLineHeight()

      expect(fontSize).toBe(16)
      expect(lineHeight).toBeCloseTo(1.8, 1)
    })

    test('should persist settings after closing and reopening reader', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles')

      // Open first article
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Change a setting
      await articleViewerPage.setFontSize(20)

      // Close reader
      await articleViewerPage.closeSettings()
      await articleViewerPage.close()

      // Open another article
      await articleListPage.clickArticle(1)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Setting should persist
      const fontSize = await articleViewerPage.getFontSize()
      expect(fontSize).toBe(20)

      // Clean up - reset to default
      await articleViewerPage.resetSettings()
    })
  })

  /**
   * Reading Progress Tests
   */
  test.describe('Reading Progress', () => {
    test('should show progress bar', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Progress bar should be visible by default
      expect(await articleViewerPage.isProgressBarVisible()).toBe(true)

      // Initial progress should be at or near 0
      const initialProgress = await articleViewerPage.getScrollProgress()
      expect(initialProgress).toBeGreaterThanOrEqual(0)
      expect(initialProgress).toBeLessThanOrEqual(100)
    })

    test('should update progress when scrolling', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Scroll to middle
      await articleViewerPage.scrollBy(500)

      // Wait for progress update
      await page.waitForTimeout(300)

      // Progress should have increased
      const progressAfterScroll = await articleViewerPage.getScrollProgress()
      expect(progressAfterScroll).toBeGreaterThan(0)
    })

    test('should show near 100% progress at bottom', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Scroll to bottom
      await articleViewerPage.scrollToBottom()

      // Wait for progress update
      await page.waitForTimeout(500)

      // Progress should be near 100%
      const progress = await articleViewerPage.getScrollProgress()
      expect(progress).toBeGreaterThan(80) // Allow some margin
    })

    test('should restore scroll position when reopening article', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Scroll down
      await articleViewerPage.scrollBy(300)

      // Get current scroll position
      const scrollPosition = await page.evaluate(() => {
        const element = document.querySelector('div.overflow-y-auto')
        return element ? (element as HTMLElement).scrollTop : 0
      })
      expect(scrollPosition).toBeGreaterThan(0)

      // Close reader
      await articleViewerPage.close()

      // Reopen same article
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Wait for scroll position restoration
      await page.waitForTimeout(500)

      // Scroll position should be restored (or close to it)
      const restoredScrollPosition = await page.evaluate(() => {
        const element = document.querySelector('div.overflow-y-auto')
        return element ? (element as HTMLElement).scrollTop : 0
      })

      // Allow some tolerance but should be near the previous position
      expect(restoredScrollPosition).toBeGreaterThan(scrollPosition * 0.5)
    })
  })

  /**
   * Keyboard Shortcuts Tests
   */
  test.describe('Keyboard Shortcuts', () => {
    test('should display keyboard shortcuts hint', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Keyboard shortcuts hint should be visible
      expect(await articleViewerPage.isKeyboardShortcutsHintVisible()).toBe(true)
    })

    test('should show correct shortcuts in hint', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Check for all expected shortcuts
      const hint = await articleViewerPage.keyboardShortcutsHint.textContent()
      expect(hint).toContain('Esc')
      expect(hint).toContain('关闭')
      expect(hint).toContain('F')
      expect(hint).toContain('收藏')
      expect(hint).toContain('P')
      expect(hint).toContain('上一篇')
      expect(hint).toContain('N')
      expect(hint).toContain('下一篇')
    })

    test('should use Escape key to close', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Press Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      // Reader should be closed
      await expect(articleViewerPage.articleTitle).not.toBeVisible()
    })

    test('should use F key to toggle favorite', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const initialFavState = await articleViewerPage.isFavorited()

      // Press F
      await page.keyboard.press('f')
      await page.waitForTimeout(500)

      const newFavState = await articleViewerPage.isFavorited()
      expect(newFavState).not.toBe(initialFavState)
    })

    test('should use arrow keys for navigation', async ({ page }) => {
      test.skip(!multipleArticlesAvailable, 'Need at least 2 articles')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const firstTitle = await articleViewerPage.getArticleTitle()

      // Press ArrowRight
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(500)

      let currentTitle = await articleViewerPage.getArticleTitle()
      expect(currentTitle).not.toBe(firstTitle)

      // Press ArrowLeft
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
    test('should sanitize script tags from article content', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForContent()

      // Check that no script tags are present in the article content
      const hasScripts = await articleViewerPage.hasUnsanitizedScript()
      expect(hasScripts).toBe(false)
    })

    test('should render allowed HTML tags', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForContent()

      // Get article content
      const content = await articleViewerPage.getArticleContent()

      // Should contain some allowed HTML tags
      expect(content?.length).toBeGreaterThan(0)

      // Check that content is HTML (has tags)
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content || '')
      expect(hasHtmlTags).toBe(true)
    })
  })

  /**
   * Screenshot Tests for Visual Verification
   */
  test.describe('Visual Verification', () => {
    test('should take screenshot of reader view', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Take screenshot for visual verification
      await articleViewerPage.screenshot('test-results/reader-view.png')
    })

    test('should take screenshot with settings panel open', async ({ page }) => {
      test.skip(!articlesAvailable, 'No articles available')

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.openSettings()

      // Take screenshot with settings panel
      await articleViewerPage.screenshot('test-results/reader-with-settings.png')
    })
  })
})
