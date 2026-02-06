import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Article Viewer component
 * Handles interactions with the article reading interface
 */
export class ArticleViewerPage {
  readonly page: Page
  readonly container: Locator
  readonly toolbar: Locator
  readonly closeButton: Locator
  readonly favoriteButton: Locator
  readonly unfavoriteButton: Locator
  readonly previousButton: Locator
  readonly nextButton: Locator
  readonly settingsButton: Locator
  readonly externalLinkButton: Locator
  readonly contentArea: Locator
  readonly articleTitle: Locator
  readonly progressBar: Locator
  readonly settingsPanel: Locator
  readonly articleCounter: Locator
  readonly keyboardShortcutsHint: Locator

  // Settings controls
  readonly fontSizeSlider: Locator
  readonly lineHeightSlider: Locator
  readonly letterSpacingSlider: Locator
  readonly maxWidthSlider: Locator
  readonly textAlignLeft: Locator
  readonly textAlignCenter: Locator
  readonly textAlignJustify: Locator
  readonly showProgressCheckbox: Locator
  readonly resetSettingsButton: Locator

  constructor(page: Page) {
    this.page = page

    // Main container - article viewer replaces article list when article is selected
    this.container = page.locator('div').filter({ hasText: /Esc: 关闭/ }).first()
    this.toolbar = page.locator('div').filter({ hasText: /上一篇/ }).first()

    // Navigation buttons
    this.closeButton = page.locator('button').filter({ hasText: '' }).nth(-1) // X icon
    this.previousButton = page.locator('button').filter({ hasNotText: '' }).filter({ hasText: /上一篇/ })
    this.nextButton = page.locator('button').filter({ hasNotText: '' }).filter({ hasText: /下一篇/ })

    // Favorite button (can be Star or StarOff icon)
    this.favoriteButton = page.locator('button').filter({ hasNotText: '' }).filter({ hasText: /收藏/ })
    this.unfavoriteButton = page.locator('button').filter({ hasNotText: '' }).filter({ hasText: /取消收藏/ })

    // Settings and external link
    this.settingsButton = page.getByTitle('阅读设置')
    this.externalLinkButton = page.getByTitle('在浏览器中打开')

    // Content area
    this.contentArea = page.locator('div').filter({ hasText: /查看原文/ }).first()
    this.articleTitle = page.locator('h1').first()

    // Progress bar
    this.progressBar = page.locator('div.bg-primary').filter({ hasNotText: '' })

    // Settings panel
    this.settingsPanel = page.locator('div').filter({ hasText: /阅读设置/ }).nth(0)

    // Settings controls
    this.fontSizeSlider = this.settingsPanel.locator('input[type="range"]').nth(0)
    this.lineHeightSlider = this.settingsPanel.locator('input[type="range"]').nth(1)
    this.letterSpacingSlider = this.settingsPanel.locator('input[type="range"]').nth(2)
    this.maxWidthSlider = this.settingsPanel.locator('input[type="range"]').nth(3)

    // Text alignment buttons
    this.textAlignLeft = page.locator('button', { hasText: '左对齐' })
    this.textAlignCenter = page.locator('button', { hasText: '居中' })
    this.textAlignJustify = page.locator('button', { hasText: '两端' })

    // Progress checkbox and reset button
    this.showProgressCheckbox = this.settingsPanel.locator('input[type="checkbox"]')
    this.resetSettingsButton = this.settingsPanel.locator('button', { hasText: '重置为默认设置' })

    // Article counter (e.g., "1 / 10")
    this.articleCounter = page.locator('div').filter({ hasText: /\d+ \/ \d+/ })

    // Keyboard shortcuts hint
    this.keyboardShortcutsHint = page.locator('div').filter({ hasText: /Esc: 关闭/ })
  }

  /**
   * Wait for the article viewer to be visible
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
   * Click the close button to close the reader
   */
  async close() {
    await this.closeButton.click()
    // Wait for reader to close
    await this.page.waitForTimeout(500)
  }

  /**
   * Press Escape key to close the reader
   */
  async closeWithEscape() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(500)
  }

  /**
   * Check if the favorite button shows as favorited (filled star)
   */
  async isFavorited(): Promise<boolean> {
    const button = page => page.locator('button').filter({ hasNotText: '' }).filter({ hasText: /取消收藏/ })
    return await button(this.page).isVisible().catch(() => false)
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite() {
    // Click the favorite button (either Star or StarOff)
    const favoriteBtn = this.page.locator('button').filter({ hasNotText: '' }).filter({
      hasText: /收藏|取消收藏/
    }).first()
    await favoriteBtn.click()
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
   * Get the article counter text (e.g., "1 / 10")
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
   * Open the settings panel
   */
  async openSettings() {
    await this.settingsButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Close the settings panel
   */
  async closeSettings() {
    await this.settingsButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if settings panel is visible
   */
  async isSettingsPanelVisible(): Promise<boolean> {
    return await this.settingsPanel.isVisible().catch(() => false)
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
   * Get current text alignment (by checking which button is active)
   */
  async getTextAlign(): Promise<'left' | 'center' | 'justify'> {
    const leftActive = await this.page.locator('button.bg-primary').filter({ hasText: '左对齐' }).isVisible().catch(() => false)
    if (leftActive) return 'left'

    const centerActive = await this.page.locator('button.bg-primary').filter({ hasText: '居中' }).isVisible().catch(() => false)
    if (centerActive) return 'center'

    return 'justify'
  }

  /**
   * Toggle show progress checkbox
   */
  async toggleShowProgress() {
    await this.showProgressCheckbox.click()
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
    const content = this.page.locator('article').first()
    return await content.innerHTML()
  }

  /**
   * Check if content contains XSS (script tags should be sanitized)
   */
  async hasUnsanitizedScript(): Promise<boolean> {
    const scripts = await this.page.locator('article script').count()
    return scripts > 0
  }

  /**
   * Get the article link
   */
  async getArticleLink(): Promise<string | null> {
    const link = this.page.locator('a').filter({ hasText: '查看原文' })
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
    await this.page.waitForSelector('article', { state: 'attached', timeout: 5000 })
    await this.page.waitForTimeout(500)
  }

  /**
   * Get the article meta info (publish time, etc.)
   */
  async getArticleMeta(): Promise<string | null> {
    const meta = this.page.locator('div').filter({ hasText: /查看原文/ })
    return await meta.textContent()
  }

  /**
   * Verify keyboard shortcuts hint is displayed
   */
  async isKeyboardShortcutsHintVisible(): Promise<boolean> {
    return await this.keyboardShortcutsHint.isVisible().catch(() => false)
  }
}
