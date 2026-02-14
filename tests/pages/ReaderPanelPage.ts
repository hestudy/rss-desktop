import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for the Reader panel (right panel)
 *
 * The reader panel shows either:
 * - EmptyReaderPlaceholder when no article is selected
 * - ArticleViewer when an article is selected
 *
 * ArticleViewer contains:
 * - Toolbar: navigation (prev/next), counter, favorite, external link, settings
 * - Reading progress bar
 * - Article content area (title, meta, body)
 * - Optional settings side panel
 */
export class ReaderPanelPage {
  readonly page: Page

  // Panel wrapper
  readonly panelContent: Locator

  // Empty placeholder
  readonly emptyPlaceholder: Locator
  readonly emptyPlaceholderTitle: Locator
  readonly emptyPlaceholderSubtitle: Locator

  // Article viewer elements
  readonly articleTitle: Locator
  readonly articleMeta: Locator
  readonly articleBody: Locator

  // Toolbar buttons
  readonly previousButton: Locator
  readonly nextButton: Locator
  readonly articleCounter: Locator
  readonly favoriteButton: Locator
  readonly externalLinkButton: Locator
  readonly settingsButton: Locator

  // Progress bar
  readonly progressBar: Locator

  constructor(page: Page) {
    this.page = page

    // Use the data-testid for reader panel content
    this.panelContent = page.locator('[data-testid="reader-panel-content"]')

    // Empty placeholder elements (updated for UI redesign)
    this.emptyPlaceholder = this.panelContent.locator('text=准备好开始阅读了吗?')
    this.emptyPlaceholderTitle = this.panelContent.locator('h2').filter({ hasText: '准备好开始阅读了吗?' })
    this.emptyPlaceholderSubtitle = this.panelContent.locator('p').filter({ hasText: '从左侧选择一篇文章' })

    // Article viewer elements
    this.articleTitle = this.panelContent.locator('h1').first()
    this.articleMeta = this.panelContent.locator('a').filter({ hasText: '查看原文' })
    this.articleBody = this.panelContent.locator('article').first()

    // Toolbar navigation buttons (identified by title attributes)
    this.previousButton = this.panelContent.locator('button[title*="上一篇"]')
    this.nextButton = this.panelContent.locator('button[title*="下一篇"]')

    // Article counter
    this.articleCounter = page.locator('[data-testid="article-counter"]')

    // Favorite button (identified by title)
    this.favoriteButton = this.panelContent.locator('button[title*="收藏"]')

    // External link and settings
    this.externalLinkButton = this.panelContent.locator('button[title="在浏览器中打开"]')
    this.settingsButton = this.panelContent.locator('button[title="阅读设置"]')

    // Progress bar
    this.progressBar = page.locator('[data-testid="reading-progress-bar"]')
  }

  /**
   * Wait for the reader panel to be visible
   */
  async waitForVisible() {
    await expect(this.panelContent).toBeVisible()
  }

  /**
   * Check if the empty placeholder is currently shown
   */
  async isEmptyPlaceholderVisible(): Promise<boolean> {
    return await this.emptyPlaceholder.isVisible().catch(() => false)
  }

  /**
   * Check if the article viewer is showing an article
   */
  async isArticleVisible(): Promise<boolean> {
    return await this.articleTitle.isVisible().catch(() => false)
  }

  /**
   * Wait for article content to appear
   */
  async waitForArticle() {
    await expect(this.articleTitle).toBeVisible({ timeout: 5000 })
  }

  /**
   * Get the displayed article title
   */
  async getArticleTitle(): Promise<string | null> {
    return await this.articleTitle.textContent()
  }

  /**
   * Get the article counter text (e.g., "1 / 3")
   */
  async getArticleCounter(): Promise<string | null> {
    return await this.articleCounter.textContent()
  }

  /**
   * Check if the article is favorited (yellow star)
   */
  async isFavorited(): Promise<boolean> {
    // When favorited, the button title says "取消收藏"
    const unfavBtn = this.panelContent.locator('button[title*="取消收藏"]')
    return await unfavBtn.isVisible().catch(() => false)
  }

  /**
   * Toggle favorite status by clicking the button
   */
  async toggleFavorite() {
    await this.favoriteButton.click()
  }

  /**
   * Navigate to the next article
   */
  async clickNext() {
    await this.nextButton.click()
  }

  /**
   * Navigate to the previous article
   */
  async clickPrevious() {
    await this.previousButton.click()
  }

  /**
   * Check if the progress bar is visible
   */
  async isProgressBarVisible(): Promise<boolean> {
    return await this.progressBar.isVisible().catch(() => false)
  }

  /**
   * Take a screenshot of the reader panel
   */
  async screenshot(path: string) {
    await this.panelContent.screenshot({ path })
  }
}
