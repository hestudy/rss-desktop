import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Article List component
 * Handles interactions with the article list view
 */
export class ArticleListPage {
  readonly page: Page
  readonly container: Locator
  readonly header: Locator
  readonly articleItems: Locator
  readonly markAllReadButton: Locator
  readonly emptyState: Locator
  readonly loadingState: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('div').nth(1) // Right panel
    this.articleItems = page.locator('[class*="p-4 rounded-lg border"]')
    this.markAllReadButton = page.locator('button', { hasText: '全部已读' })
    this.emptyState = page.locator('text=暂无文章')
    this.loadingState = page.locator('text=加载中')
  }

  /**
   * Wait for articles to load
   */
  async waitForLoaded() {
    // Wait for either articles or empty state
    await Promise.race([
      this.articleItems.first().waitFor({ state: 'visible' }).catch(() => {}),
      this.emptyState.waitFor({ state: 'visible' }).catch(() => {}),
    ])
    await this.page.waitForTimeout(500)
  }

  /**
   * Get the count of articles displayed
   */
  async getArticleCount(): Promise<number> {
    return await this.articleItems.count()
  }

  /**
   * Get the title of the article at the given index
   */
  async getArticleTitle(index: number): Promise<string | null> {
    const article = this.articleItems.nth(index)
    const title = article.locator('h3')
    return await title.textContent()
  }

  /**
   * Click on an article
   */
  async clickArticle(index: number) {
    const article = this.articleItems.nth(index)
    await article.click()
    // Wait for state update
    await this.page.waitForTimeout(500)
  }

  /**
   * Check if an article is marked as read
   */
  async isArticleRead(index: number): Promise<boolean> {
    const article = this.articleItems.nth(index)
    const classList = await article.getAttribute('class')
    return classList?.includes('opacity-70') || classList?.includes('bg-muted/50') || false
  }

  /**
   * Get the article title by searching for it
   */
  async findArticleByTitle(title: string): Promise<Locator | null> {
    const articles = await this.articleItems.all()
    for (const article of articles) {
      const titleElement = article.locator('h3')
      const text = await titleElement.textContent()
      if (text?.includes(title)) {
        return article
      }
    }
    return null
  }

  /**
   * Click the "Mark All Read" button
   */
  async markAllAsRead() {
    await this.markAllReadButton.click()
    await this.page.waitForTimeout(1000)
  }

  /**
   * Check if the mark all read button is visible
   */
  async hasMarkAllReadButton(): Promise<boolean> {
    return await this.markAllReadButton.isVisible().catch(() => false)
  }

  /**
   * Get the current feed title from the header
   */
  async getCurrentFeedTitle(): Promise<string | null> {
    const header = this.page.locator('h2').first()
    return await header.textContent()
  }

  /**
   * Check if empty state is shown
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false)
  }

  /**
   * Check if loading state is shown
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingState.isVisible().catch(() => false)
  }

  /**
   * Get article description
   */
  async getArticleDescription(index: number): Promise<string | null> {
    const article = this.articleItems.nth(index)
    const desc = article.locator('p[class*="text-muted-foreground"]')
    return await desc.textContent()
  }

  /**
   * Click the external link button on an article
   */
  async clickExternalLink(index: number) {
    const article = this.articleItems.nth(index)
    const linkButton = article.locator('button').last() // ExternalLink button
    await linkButton.click()
  }
}
