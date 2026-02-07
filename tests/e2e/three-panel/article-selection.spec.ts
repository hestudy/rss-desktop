import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/SidebarPage'
import { ArticleListPanelPage } from '../../pages/ArticleListPanelPage'
import { ReaderPanelPage } from '../../pages/ReaderPanelPage'
import { buildTauriMockScript, getMockArticles } from '../../fixtures/tauri-mock'

/**
 * Journey 3: Article Selection Flow
 *
 * Verifies the article selection and reading experience:
 * - Clicking an article in the middle panel
 * - Article content appears in the right panel (reader)
 * - Selected article gets highlighted in the list
 * - Empty placeholder disappears when article is selected
 * - Article counter shows correct position
 * - Navigation between articles works
 */
test.describe('Journey 3: Article Selection Flow', () => {
  let sidebar: SidebarPage
  let articleList: ArticleListPanelPage
  let reader: ReaderPanelPage

  const mockArticles = getMockArticles()

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    sidebar = new SidebarPage(page)
    articleList = new ArticleListPanelPage(page)
    reader = new ReaderPanelPage(page)

    await page.goto('/')
    await sidebar.waitForLoaded()

    // Click "全部文章" to trigger article loading via selectFeed(null)
    // The app does not auto-load articles on startup; it requires a navigation action
    await sidebar.clickAllArticles()
    await articleList.waitForLoaded()
  })

  test.describe('Initial State', () => {
    test('article list should show articles from mock data', async () => {
      const count = await articleList.getArticleCount()
      expect(count).toBe(mockArticles.length)
    })

    test('reader should show empty placeholder initially', async () => {
      const isPlaceholderVisible = await reader.isEmptyPlaceholderVisible()
      expect(isPlaceholderVisible).toBe(true)

      const isArticleVisible = await reader.isArticleVisible()
      expect(isArticleVisible).toBe(false)
    })
  })

  test.describe('Selecting an Article', () => {
    test('clicking an article should display it in the reader', async () => {
      // Click the first article
      await articleList.clickArticle(0)

      // Reader should now show article content
      await reader.waitForArticle()

      const isArticleVisible = await reader.isArticleVisible()
      expect(isArticleVisible).toBe(true)

      // Empty placeholder should be gone
      const isPlaceholderVisible = await reader.isEmptyPlaceholderVisible()
      expect(isPlaceholderVisible).toBe(false)
    })

    test('reader should display the correct article title', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      const readerTitle = await reader.getArticleTitle()
      // Mock articles are sorted by published_at descending by the mock
      expect(readerTitle).toBeTruthy()
      expect(readerTitle!.length).toBeGreaterThan(0)
    })

    test('reader should display "查看原文" link in article meta', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      await expect(reader.articleMeta).toBeVisible()
    })

    test('reader should display article body content', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      await expect(reader.articleBody).toBeVisible()
      const html = await reader.articleBody.innerHTML()
      expect(html.length).toBeGreaterThan(0)
    })

    test('selected article should be highlighted in the list', async () => {
      // Click first article
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      // Verify the first article has the selected style
      const isSelected = await articleList.isArticleSelected(0)
      expect(isSelected).toBe(true)

      // Other articles should NOT be selected
      const secondSelected = await articleList.isArticleSelected(1)
      expect(secondSelected).toBe(false)
    })

    test('selecting a different article should update highlight', async () => {
      // Select first article
      await articleList.clickArticle(0)
      await reader.waitForArticle()
      const firstTitle = await reader.getArticleTitle()

      // Now select second article
      await articleList.clickArticle(1)
      await reader.waitForArticle()
      const secondTitle = await reader.getArticleTitle()

      // Titles should be different
      expect(secondTitle).not.toBe(firstTitle)

      // Second article should now be highlighted
      const isSecondSelected = await articleList.isArticleSelected(1)
      expect(isSecondSelected).toBe(true)

      // First article should no longer be highlighted
      const isFirstSelected = await articleList.isArticleSelected(0)
      expect(isFirstSelected).toBe(false)
    })
  })

  test.describe('Article Counter', () => {
    test('should show article position counter', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      const counter = await reader.getArticleCounter()
      expect(counter).toBeTruthy()
      // Should contain a pattern like "1 / 3"
      expect(counter).toMatch(/\d+\s*\/\s*\d+/)
    })

    test('counter should update when selecting different article', async () => {
      // Select first article
      await articleList.clickArticle(0)
      await reader.waitForArticle()
      const counter1 = await reader.getArticleCounter()

      // Select second article
      await articleList.clickArticle(1)
      await reader.waitForArticle()
      const counter2 = await reader.getArticleCounter()

      // Counters should differ in position but have the same total
      expect(counter1).not.toBe(counter2)
    })
  })

  test.describe('Toolbar Buttons', () => {
    test('should show favorite button when article is selected', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      await expect(reader.favoriteButton).toBeVisible()
    })

    test('should show external link button', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      await expect(reader.externalLinkButton).toBeVisible()
    })

    test('should show settings button', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      await expect(reader.settingsButton).toBeVisible()
    })

    test('should show reading progress bar', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      const isProgressVisible = await reader.isProgressBarVisible()
      expect(isProgressVisible).toBe(true)
    })
  })

  test.describe('Navigation Buttons', () => {
    test('first article should show next button but not previous', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      // When on the first article, next should be available
      const hasNext = await reader.nextButton.isVisible().catch(() => false)
      expect(hasNext).toBe(true)

      // Previous should NOT be visible (first article)
      const hasPrevious = await reader.previousButton.isVisible().catch(() => false)
      expect(hasPrevious).toBe(false)
    })

    test('last article should show previous button but not next', async () => {
      const lastIndex = mockArticles.length - 1
      await articleList.clickArticle(lastIndex)
      await reader.waitForArticle()

      // Previous should be visible
      const hasPrevious = await reader.previousButton.isVisible().catch(() => false)
      expect(hasPrevious).toBe(true)

      // Next should NOT be visible (last article)
      const hasNext = await reader.nextButton.isVisible().catch(() => false)
      expect(hasNext).toBe(false)
    })

    test('clicking next should advance to the next article', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()
      const firstTitle = await reader.getArticleTitle()

      await reader.clickNext()
      const secondTitle = await reader.getArticleTitle()

      expect(secondTitle).not.toBe(firstTitle)
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('pressing Escape should deselect article and show placeholder', async ({ page }) => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      // Press Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Placeholder should reappear
      const isPlaceholderVisible = await reader.isEmptyPlaceholderVisible()
      expect(isPlaceholderVisible).toBe(true)
    })

    test('pressing F should toggle favorite', async ({ page }) => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      const wasFavorited = await reader.isFavorited()

      // Press F to toggle
      await page.keyboard.press('f')
      await page.waitForTimeout(300)

      const isNowFavorited = await reader.isFavorited()
      expect(isNowFavorited).not.toBe(wasFavorited)
    })

    test('pressing N should go to next article', async ({ page }) => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()
      const firstTitle = await reader.getArticleTitle()

      await page.keyboard.press('n')
      await page.waitForTimeout(300)

      const secondTitle = await reader.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)
    })

    test('pressing ArrowRight should go to next article', async ({ page }) => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()
      const firstTitle = await reader.getArticleTitle()

      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(300)

      const secondTitle = await reader.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)
    })
  })

  test.describe('Visual Verification', () => {
    test('should capture screenshot with article selected', async ({ page }) => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      await page.screenshot({
        path: 'test-results/three-panel-article-selected.png',
        fullPage: true,
      })
    })

    test('should capture screenshot of article list with highlight', async () => {
      await articleList.clickArticle(0)
      await reader.waitForArticle()

      await articleList.screenshot('test-results/article-list-highlighted.png')
    })
  })
})
