import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for the Article List panel (middle panel)
 *
 * The article list contains:
 * - Header with current view title (全部文章 / 收藏文章 / feed name)
 * - Optional "全部已读" mark all read button
 * - Scrollable list of article items
 * - Empty state when no articles
 * - Loading state
 */
export class ArticleListPanelPage {
  readonly page: Page

  // Panel wrapper
  readonly panelContent: Locator

  // Header
  readonly headerTitle: Locator
  readonly markAllReadButton: Locator

  // Article items - each article is a clickable div with border-b
  readonly articleItems: Locator

  // States
  readonly emptyState: Locator
  readonly favoritesEmptyState: Locator
  readonly loadingState: Locator

  constructor(page: Page) {
    this.page = page

    // Use the data-testid for article list panel content
    this.panelContent = page.locator('[data-testid="article-list-panel-content"]')

    // Header elements
    this.headerTitle = this.panelContent.locator('h2').first()
    this.markAllReadButton = this.panelContent.locator('button', { hasText: '全部已读' })

    // Article items - clickable rows with border-b
    this.articleItems = this.panelContent.locator('div.cursor-pointer.border-b')

    // States
    this.emptyState = this.panelContent.locator('text=暂无文章')
    this.favoritesEmptyState = this.panelContent.locator('text=暂无收藏文章')
    this.loadingState = this.panelContent.locator('text=加载中')
  }

  /**
   * Wait for the article list panel to be visible and loaded
   */
  async waitForLoaded() {
    await expect(this.panelContent).toBeVisible()
    // Wait for either articles, empty state, or loading to complete
    await Promise.race([
      this.articleItems.first().waitFor({ state: 'visible' }).catch(() => {}),
      this.emptyState.waitFor({ state: 'visible' }).catch(() => {}),
      this.favoritesEmptyState.waitFor({ state: 'visible' }).catch(() => {}),
    ])
    // Small buffer for React state to settle
    await this.page.waitForTimeout(300)
  }

  /**
   * Get the current header title text
   */
  async getHeaderTitle(): Promise<string | null> {
    return await this.headerTitle.textContent()
  }

  /**
   * Get the count of articles displayed
   */
  async getArticleCount(): Promise<number> {
    return await this.articleItems.count()
  }

  /**
   * Click an article by index
   */
  async clickArticle(index: number) {
    await this.articleItems.nth(index).click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Get the title of an article at the given index
   */
  async getArticleTitle(index: number): Promise<string | null> {
    const article = this.articleItems.nth(index)
    const title = article.locator('h3').first()
    return await title.textContent()
  }

  /**
   * Check if an article at the given index is selected (highlighted)
   */
  async isArticleSelected(index: number): Promise<boolean> {
    const article = this.articleItems.nth(index)
    const cls = await article.getAttribute('class')
    // Selected articles have bg-accent and border-l-primary
    return (cls?.includes('bg-accent') && cls?.includes('border-l-primary')) ?? false
  }

  /**
   * Check if the empty state is shown
   */
  async isEmpty(): Promise<boolean> {
    const generalEmpty = await this.emptyState.isVisible().catch(() => false)
    const favoritesEmpty = await this.favoritesEmptyState.isVisible().catch(() => false)
    return generalEmpty || favoritesEmpty
  }

  /**
   * Take a screenshot of the article list panel
   */
  async screenshot(path: string) {
    await this.panelContent.screenshot({ path })
  }
}
