import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Article Viewer component (right panel)
 * Handles interactions with the article reading interface
 *
 * Updated for the new 3-panel layout:
 * - Close button removed (Escape deselects article instead)
 * - Keyboard shortcuts hint bar removed
 * - Viewer is always visible in the right panel (shows placeholder when no article selected)
 * - Settings panel is now a unified dialog (not embedded in ArticleViewer)
 */
export class ArticleViewerPage {
  readonly page: Page
  readonly readerPanel: Locator
  readonly favoriteButton: Locator
  readonly unfavoriteButton: Locator
  readonly previousButton: Locator
  readonly nextButton: Locator
  readonly settingsButton: Locator
  readonly externalLinkButton: Locator
  readonly fetchFullContentButton: Locator
  readonly fetchErrorBanner: Locator
  readonly toggleContentButton: Locator
  readonly contentArea: Locator
  readonly articleTitle: Locator
  readonly progressBar: Locator
  readonly articleCounter: Locator

  // Unified Settings Dialog
  readonly settingsDialog: Locator
  readonly settingsCloseButton: Locator
  readonly settingsNavReading: Locator

  // Settings controls (in unified settings dialog)
  readonly fontSizeSlider: Locator
  readonly lineHeightSlider: Locator
  readonly letterSpacingSlider: Locator
  readonly maxWidthSlider: Locator
  readonly textAlignLeft: Locator
  readonly textAlignCenter: Locator
  readonly textAlignJustify: Locator
  readonly showProgressToggle: Locator
  readonly resetSettingsButton: Locator

  constructor(page: Page) {
    this.page = page

    // Reader panel container
    this.readerPanel = page.locator('[data-testid="reader-panel-content"]')

    // Navigation buttons - use title attributes
    this.previousButton = page.locator('button[title*="上一篇"]')
    this.nextButton = page.locator('button[title*="下一篇"]')

    // Favorite button
    this.favoriteButton = page.locator('button[title="收藏 (F)"]')
    this.unfavoriteButton = page.locator('button[title="取消收藏 (F)"]')

    // Settings and external link
    this.settingsButton = page.getByTitle('阅读设置')
    this.externalLinkButton = page.getByTitle('在浏览器中打开')
    this.fetchFullContentButton = page.getByTitle('抓取全文')

    this.fetchErrorBanner = page.locator('.bg-destructive\\/10')
    this.toggleContentButton = page.locator('button[title*="切换为"]')

    // Content area - the scrollable div
    this.contentArea = this.readerPanel.locator('.overflow-y-auto').first()
    this.articleTitle = this.readerPanel.locator('h1').first()

    // Progress bar - use the outer container (h-1 bg-muted) which is always visible when showProgress is true
    // The inner bar may have width: 0% initially, making it invisible to Playwright
    this.progressBar = this.readerPanel.locator('div.h-1.bg-muted')

    // Article counter (e.g., "1 / 3") - target the specific counter div with ml-2
    this.articleCounter = this.readerPanel.locator('div.text-sm.text-muted-foreground.ml-2')

    // Unified Settings Dialog (rendered via Portal to body)
    this.settingsDialog = page.locator('div.fixed.inset-0.z-50').filter({ has: page.locator('text=RSS Reader') })
    this.settingsCloseButton = this.settingsDialog.locator('button').filter({ has: page.locator('svg') }).last()
    this.settingsNavReading = this.settingsDialog.locator('button', { hasText: '阅读' })

    // Settings controls (in unified settings dialog - reading section)
    // The sliders are in order: fontSize, lineHeight, letterSpacing, maxWidth
    this.fontSizeSlider = this.settingsDialog.locator('input[type="range"]').nth(0)
    this.lineHeightSlider = this.settingsDialog.locator('input[type="range"]').nth(1)
    this.letterSpacingSlider = this.settingsDialog.locator('input[type="range"]').nth(2)
    this.maxWidthSlider = this.settingsDialog.locator('input[type="range"]').nth(3)

    // Text alignment buttons (in unified settings dialog)
    this.textAlignLeft = this.settingsDialog.locator('button', { hasText: '左对齐' })
    this.textAlignCenter = this.settingsDialog.locator('button', { hasText: '居中' })
    this.textAlignJustify = this.settingsDialog.locator('button', { hasText: '两端对齐' })

    // Progress toggle (custom toggle button, not checkbox)
    this.showProgressToggle = this.settingsDialog.locator('button.rounded-full').filter({ has: page.locator('span.rounded-full') }).first()
    this.resetSettingsButton = this.settingsDialog.locator('button', { hasText: '重置为默认设置' })
  }

  /**
   * Wait for the article viewer to be visible (article loaded)
   */
  async waitForVisible() {
    await expect(this.articleTitle).toBeVisible({ timeout: 5000 })
  }

  /**
   * Check if the article viewer is currently visible
   */
  async isVisible(): Promise<boolean> {
    return await this.articleTitle.isVisible().catch(() => false)
  }

  /**
   * Get the article title
   */
  async getArticleTitle(): Promise<string | null> {
    return await this.articleTitle.textContent()
  }

  /**
   * Press Escape key to deselect the article (shows placeholder)
   */
  async closeWithEscape() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(500)
  }

  /**
   * Deselect the current article by pressing Escape
   */
  async deselectArticle() {
    await this.closeWithEscape()
  }

  /**
   * Check if the favorite button shows as favorited (filled star)
   */
  async isFavorited(): Promise<boolean> {
    return await this.unfavoriteButton.isVisible().catch(() => false)
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite() {
    const favBtn = this.page.locator('button[title*="收藏"]').first()
    await favBtn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Press F key to toggle favorite
   */
  async toggleFavoriteWithKeyboard() {
    await this.page.keyboard.press('f')
    await this.page.waitForTimeout(500)
  }

  /**
   * Click next article button
   */
  async clickNext() {
    await this.nextButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Click previous article button
   */
  async clickPrevious() {
    await this.previousButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Press N key to go to next article
   */
  async goToNextWithKeyboard() {
    await this.page.keyboard.press('n')
    await this.page.waitForTimeout(500)
  }

  /**
   * Press P key to go to previous article
   */
  async goToPreviousWithKeyboard() {
    await this.page.keyboard.press('p')
    await this.page.waitForTimeout(500)
  }

  /**
   * Press ArrowRight to go to next article
   */
  async goToNextWithArrowKey() {
    await this.page.keyboard.press('ArrowRight')
    await this.page.waitForTimeout(500)
  }

  /**
   * Press ArrowLeft to go to previous article
   */
  async goToPreviousWithArrowKey() {
    await this.page.keyboard.press('ArrowLeft')
    await this.page.waitForTimeout(500)
  }

  /**
   * Get the article counter text (e.g., "1 / 3")
   */
  async getArticleCounter(): Promise<string | null> {
    return await this.articleCounter.textContent()
  }

  /**
   * Check if next article is available
   */
  async hasNextArticle(): Promise<boolean> {
    return await this.nextButton.isVisible().catch(() => false)
  }

  /**
   * Check if previous article is available
   */
  async hasPreviousArticle(): Promise<boolean> {
    return await this.previousButton.isVisible().catch(() => false)
  }

  /**
   * Open the unified settings dialog (navigates to Reading tab)
   */
  async openSettings() {
    await this.settingsButton.click()
    await this.page.waitForTimeout(300)
    // Wait for the dialog to appear
    await expect(this.settingsDialog).toBeVisible({ timeout: 3000 })
  }

  /**
   * Close the unified settings dialog
   */
  async closeSettings() {
    // Click the X button or press Escape
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if settings dialog is visible
   */
  async isSettingsPanelVisible(): Promise<boolean> {
    return await this.settingsDialog.isVisible().catch(() => false)
  }

  /**
   * Get current font size value
   */
  async getFontSize(): Promise<number> {
    const value = await this.fontSizeSlider.inputValue()
    return parseInt(value, 10)
  }

  /**
   * Set font size
   */
  async setFontSize(size: number) {
    await this.fontSizeSlider.fill(size.toString())
    await this.page.waitForTimeout(200)
  }

  /**
   * Get current line height value
   */
  async getLineHeight(): Promise<number> {
    const value = await this.lineHeightSlider.inputValue()
    return parseFloat(value)
  }

  /**
   * Set line height
   */
  async setLineHeight(height: number) {
    await this.lineHeightSlider.fill(height.toString())
    await this.page.waitForTimeout(200)
  }

  /**
   * Get current letter spacing value
   */
  async getLetterSpacing(): Promise<number> {
    const value = await this.letterSpacingSlider.inputValue()
    return parseFloat(value)
  }

  /**
   * Set letter spacing
   */
  async setLetterSpacing(spacing: number) {
    await this.letterSpacingSlider.fill(spacing.toString())
    await this.page.waitForTimeout(200)
  }

  /**
   * Get current max width value
   */
  async getMaxWidth(): Promise<number> {
    const value = await this.maxWidthSlider.inputValue()
    return parseInt(value, 10)
  }

  /**
   * Set max width
   */
  async setMaxWidth(width: number) {
    await this.maxWidthSlider.fill(width.toString())
    await this.page.waitForTimeout(200)
  }

  /**
   * Set text alignment
   */
  async setTextAlign(align: 'left' | 'center' | 'justify') {
    const buttonMap = {
      left: this.textAlignLeft,
      center: this.textAlignCenter,
      justify: this.textAlignJustify,
    }
    await buttonMap[align].click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Get current text alignment
   */
  async getTextAlign(): Promise<'left' | 'center' | 'justify'> {
    // Check which button has the primary background color
    const leftActive = await this.settingsDialog.locator('button.bg-primary').filter({ hasText: '左对齐' }).isVisible().catch(() => false)
    if (leftActive) return 'left'

    const centerActive = await this.settingsDialog.locator('button.bg-primary').filter({ hasText: '居中' }).isVisible().catch(() => false)
    if (centerActive) return 'center'

    return 'justify'
  }

  /**
   * Toggle show progress toggle
   */
  async toggleShowProgress() {
    await this.showProgressToggle.click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Check if progress bar is visible
   */
  async isProgressBarVisible(): Promise<boolean> {
    return await this.progressBar.first().isVisible().catch(() => false)
  }

  /**
   * Get current scroll progress percentage
   */
  async getScrollProgress(): Promise<number> {
    const progressWidth = await this.page.evaluate(() => {
      const progressBar = document.querySelector('div.bg-primary.transition-all.duration-300') as HTMLElement
      if (!progressBar) return 0
      return parseFloat(progressBar.style.width) || 0
    })
    return progressWidth
  }

  /**
   * Scroll to bottom of article
   */
  async scrollToBottom() {
    await this.contentArea.evaluate(el => {
      el.scrollTop = el.scrollHeight
    })
    await this.page.waitForTimeout(500)
  }

  /**
   * Scroll to top of article
   */
  async scrollToTop() {
    await this.contentArea.evaluate(el => {
      el.scrollTop = 0
    })
    await this.page.waitForTimeout(500)
  }

  /**
   * Scroll by a specific amount
   */
  async scrollBy(amount: number) {
    await this.contentArea.evaluate((el, scrollAmount) => {
      el.scrollTop += scrollAmount
    }, amount)
    await this.page.waitForTimeout(300)
  }

  /**
   * Reset settings to default
   */
  async resetSettings() {
    await this.resetSettingsButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Get article content HTML
   */
  async getArticleContent(): Promise<string> {
    const content = this.readerPanel.locator('article').first()
    return await content.innerHTML()
  }

  /**
   * Check if content contains XSS (script tags should be sanitized)
   */
  async hasUnsanitizedScript(): Promise<boolean> {
    const scripts = await this.readerPanel.locator('article script').count()
    return scripts > 0
  }

  /**
   * Get the article link
   */
  async getArticleLink(): Promise<string | null> {
    const link = this.readerPanel.locator('a').filter({ hasText: '查看原文' })
    return await link.getAttribute('href')
  }

  /**
   * Click external link to open in browser
   */
  async clickExternalLink() {
    await this.externalLinkButton.click()
  }

  /**
   * Take a screenshot of the reader
   */
  async screenshot(path: string) {
    await this.page.screenshot({
      path,
      fullPage: false,
    })
  }

  /**
   * Wait for content to be fully loaded
   */
  async waitForContent() {
    await this.readerPanel.locator('article').first().waitFor({ state: 'attached', timeout: 5000 })
    await this.page.waitForTimeout(500)
  }

  /**
   * Get the article meta info
   */
  async getArticleMeta(): Promise<string | null> {
    const meta = this.readerPanel.locator('div.border-b').filter({ hasText: /查看原文/ }).last()
    return await meta.textContent()
  }

  async clickFetchFullContent() {
    await this.fetchFullContentButton.click()
  }

  async isFetchFullContentButtonVisible(): Promise<boolean> {
    return await this.fetchFullContentButton.isVisible().catch(() => false)
  }

  async isFetchingContent(): Promise<boolean> {
    const spinner = this.fetchFullContentButton.locator('.animate-spin')
    return await spinner.isVisible().catch(() => false)
  }

  async isFetchErrorVisible(): Promise<boolean> {
    return await this.fetchErrorBanner.isVisible().catch(() => false)
  }

  async getFetchErrorText(): Promise<string | null> {
    return await this.fetchErrorBanner.textContent()
  }

  async isToggleContentButtonVisible(): Promise<boolean> {
    return await this.toggleContentButton.isVisible().catch(() => false)
  }

  async clickToggleContent() {
    await this.toggleContentButton.click()
    await this.page.waitForTimeout(300)
  }

  async getToggleContentButtonTitle(): Promise<string | null> {
    return await this.toggleContentButton.getAttribute('title')
  }
}
