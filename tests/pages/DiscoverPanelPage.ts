import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Discover Panel component
 * Handles interactions with the RSS feed discovery feature
 *
 * Note: In the new layout, the discover panel is embedded in a two-column layout
 * (FeedList | DiscoverPanel) instead of a full-screen overlay.
 */
export class DiscoverPanelPage {
  readonly page: Page
  readonly layout: Locator
  readonly panel: Locator
  readonly title: Locator
  readonly description: Locator
  readonly searchInput: Locator
  readonly categoryButtons: Locator
  readonly allCategoryButton: Locator
  readonly feedCards: Locator
  readonly loadingState: Locator
  readonly emptyState: Locator
  readonly errorState: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    this.page = page
    // 新布局使用 discover-layout 而不是 discover-overlay
    this.layout = page.locator('[data-testid="discover-layout"]')
    this.panel = page.locator('[data-testid="discover-panel"]')
    this.title = page.getByRole('heading', { name: '发现订阅' })
    this.description = page.getByText('探索精选 RSS 订阅源')
    this.searchInput = page.locator('[data-testid="discover-search-input"]')
    this.categoryButtons = page.locator('[data-testid="discover-category-button"]')
    this.allCategoryButton = page.getByRole('button', { name: /全部/ })
    this.feedCards = page.locator('[data-testid="discover-feed-card"]')
    this.loadingState = page.locator('[data-testid="discover-loading"]')
    this.emptyState = page.locator('[data-testid="discover-empty"]')
    this.errorState = page.locator('[data-testid="discover-error"]')
    this.closeButton = page.locator('[data-testid="discover-close-button"]')
  }

  /**
   * Wait for the discover panel to be visible and loaded
   */
  async waitForLoaded() {
    await expect(this.title).toBeVisible({ timeout: 10000 })
    // Wait for loading state to complete
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
  }

  /**
   * Click the discover button in the sidebar
   */
  async openFromSidebar() {
    const discoverButton = this.page.getByTestId('discover-button')
    await discoverButton.click()
    await this.waitForLoaded()
  }

  /**
   * Close the discover panel using the close button
   * In the new layout, this returns to the normal three-column view
   */
  async close() {
    await this.closeButton.click()
    // 等待发现布局消失（返回正常三栏视图）
    await expect(this.layout).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * Search for feeds by query
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    // Wait for filtering to complete
    await this.page.waitForTimeout(300)
  }

  /**
   * Clear the search input
   */
  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(300)
  }

  /**
   * Select a category by name
   */
  async selectCategory(name: string) {
    const categoryButton = this.page.getByRole('button', { name: new RegExp(name) })
    await categoryButton.click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Select "All" category to show all feeds
   */
  async selectAllCategory() {
    await this.allCategoryButton.click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Get count of visible feed cards
   */
  async getFeedCount(): Promise<number> {
    return await this.feedCards.count()
  }

  /**
   * Get a specific feed card by title
   */
  getFeedCard(title: string): Locator {
    return this.feedCards.filter({ hasText: title })
  }

  /**
   * Check if a feed is already added
   */
  async isFeedAdded(title: string): Promise<boolean> {
    const card = this.getFeedCard(title)
    const addedBadge = card.getByText('已添加')
    return await addedBadge.isVisible().catch(() => false)
  }

  /**
   * Add a feed by clicking its add button (opens the AI config dialog)
   */
  async clickAddButton(title: string) {
    const card = this.getFeedCard(title)
    const addButton = card.getByRole('button', { name: '添加' })
    await addButton.click()
  }

  /**
   * Add a feed with default options (no AI features)
   */
  async addFeed(title: string) {
    await this.clickAddButton(title)

    // Wait for the dialog to appear and click confirm
    const confirmButton = this.page.getByRole('button', { name: '添加' }).last()
    await expect(confirmButton).toBeVisible({ timeout: 3000 })
    await confirmButton.click()
  }

  /**
   * Add a feed with specific AI options
   */
  async addFeedWithOptions(
    title: string,
    options: {
      useFullContent?: boolean
      useAiSummary?: boolean
      useAiTranslation?: boolean
    }
  ) {
    await this.clickAddButton(title)

    // Wait for dialog to appear
    const dialog = this.page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Set options
    if (options.useFullContent) {
      await dialog.getByText('自动抓取全文').click()
    }
    if (options.useAiSummary) {
      await dialog.getByText('自动生成 AI 摘要').click()
    }
    if (options.useAiTranslation) {
      await dialog.getByText('自动 AI 翻译').click()
    }

    // Click confirm
    const confirmButton = dialog.getByRole('button', { name: '添加' })
    await confirmButton.click()
  }

  /**
   * Cancel the add feed dialog
   */
  async cancelAddDialog() {
    const cancelButton = this.page.getByRole('button', { name: '取消' })
    await cancelButton.click()
  }

  /**
   * Wait for feed to be added (shows "已添加" status)
   */
  async waitForFeedAdded(title: string) {
    const card = this.getFeedCard(title)
    const addedBadge = card.getByText('已添加')
    await expect(addedBadge).toBeVisible({ timeout: 5000 })
  }

  /**
   * Get category button count
   */
  async getCategoryCount(): Promise<number> {
    return await this.categoryButtons.count()
  }

  /**
   * Check if loading state is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingState.isVisible().catch(() => false)
  }

  /**
   * Check if empty state is visible
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false)
  }

  /**
   * Check if error state is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorState.isVisible().catch(() => false)
  }

  /**
   * Get all visible feed titles
   */
  async getVisibleFeedTitles(): Promise<string[]> {
    const cards = await this.feedCards.all()
    const titles: string[] = []
    for (const card of cards) {
      const title = await card.locator('h3').textContent()
      if (title) {
        titles.push(title)
      }
    }
    return titles
  }

  /**
   * Check if discover panel is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.title.isVisible().catch(() => false)
  }

  /**
   * Check if add dialog is open
   */
  async isAddDialogOpen(): Promise<boolean> {
    const dialog = this.page.getByRole('dialog')
    return await dialog.isVisible().catch(() => false)
  }

  /**
   * Check if discover layout is visible (two-column layout)
   */
  async isLayoutVisible(): Promise<boolean> {
    return await this.layout.isVisible().catch(() => false)
  }
}
