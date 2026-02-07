import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Feed List component (sidebar)
 * Handles interactions with the RSS subscription list
 *
 * Updated for the new Folo-style sidebar with dark background.
 */
export class FeedListPage {
  readonly page: Page
  readonly container: Locator
  readonly header: Locator
  readonly feedItems: Locator
  readonly addButton: Locator
  readonly refreshAllButton: Locator
  readonly allArticlesButton: Locator
  readonly emptyState: Locator
  readonly globalUnreadBadge: Locator

  constructor(page: Page) {
    this.page = page
    // Feed list is in the sidebar panel
    this.container = page.locator('[data-testid="feed-panel-content"]')
    this.header = page.getByRole('heading', { name: 'RSS Reader' })
    this.feedItems = page.locator('div.group.relative.rounded-md')
    this.addButton = page.getByTitle('添加订阅')
    this.refreshAllButton = page.getByTitle('刷新全部')
    this.allArticlesButton = page.locator('button').filter({ hasText: '全部文章' })
    this.emptyState = page.locator('text=还没有订阅')
    this.globalUnreadBadge = page.locator('span.bg-sidebar-active.text-white').first()
  }

  /**
   * Wait for the feed list to be visible and loaded
   */
  async waitForLoaded() {
    await expect(this.header).toBeVisible()
    await expect(this.addButton).toBeVisible()
  }

  /**
   * Click the add feed button to open the dialog
   */
  async clickAddFeed() {
    // Ensure any existing dialog is closed first
    await this.closeAnyDialog()
    await this.addButton.click()
  }

  /**
   * Close any open dialog by clicking backdrop or pressing Escape
   */
  async closeAnyDialog() {
    for (let i = 0; i < 3; i++) {
      const dialogTitle = this.page.locator('h2', { hasText: '添加 RSS 订阅' })
      const isDialogOpen = await dialogTitle.isVisible().catch(() => false)

      if (isDialogOpen) {
        await this.page.keyboard.press('Escape')
        await this.page.waitForTimeout(500)

        const stillOpen = await dialogTitle.isVisible().catch(() => false)
        if (!stillOpen) {
          break
        }
      } else {
        break
      }
    }

    const backdrop = this.page.locator('div[class*="bg-black/50"]')
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click({ force: true })
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Ensure no dialog is blocking interactions
   */
  async ensureReady() {
    await this.closeAnyDialog()
    await this.waitForLoaded()
  }

  /**
   * Click the refresh all button
   */
  async clickRefreshAll() {
    await this.ensureReady()
    await this.refreshAllButton.click()
    await this.page.waitForTimeout(2000)
  }

  /**
   * Click on "All Articles" button
   */
  async clickAllArticles() {
    await this.ensureReady()

    for (let i = 0; i < 3; i++) {
      try {
        await this.allArticlesButton.click({ timeout: 5000 })
        await this.page.waitForTimeout(300)
        break
      } catch (error) {
        await this.closeAnyDialog()
        if (i === 2) {
          throw error
        }
      }
    }
  }

  /**
   * Get the count of feeds in the list
   */
  async getFeedCount(): Promise<number> {
    return await this.feedItems.count()
  }

  /**
   * Select a feed by its title
   */
  async selectFeed(title: string) {
    await this.ensureReady()
    const feedButton = this.page.locator('button').filter({ hasText: title }).first()
    await feedButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Get the unread count for a specific feed
   */
  async getFeedUnreadCount(title: string): Promise<number> {
    const feedElement = this.page.locator('div').filter({ hasText: title }).first()
    const badge = feedElement.locator('span.bg-sidebar-active.text-white')
    const text = await badge.textContent()
    return text ? parseInt(text, 10) : 0
  }

  /**
   * Check if a feed with the given title exists
   */
  async hasFeed(title: string): Promise<boolean> {
    const count = await this.page.locator('button').filter({ hasText: title }).count()
    return count > 0
  }

  /**
   * Get the global unread count from the header
   */
  async getGlobalUnreadCount(): Promise<number> {
    const badge = this.container.locator('span.bg-sidebar-active.text-white').first()
    const text = await badge.textContent()
    return text ? parseInt(text, 10) : 0
  }

  /**
   * Hover over a feed to reveal action buttons
   */
  async hoverFeed(title: string) {
    const feedElement = this.page.locator('div').filter({ hasText: title }).first()
    await feedElement.hover()
  }

  /**
   * Delete a feed by title
   */
  async deleteFeed(title: string) {
    await this.hoverFeed(title)

    const deleteButton = this.page.locator('button').filter({ hasText: '' }).nth(-1)
    await deleteButton.click()

    await this.confirmDelete()
  }

  /**
   * Refresh a specific feed
   */
  async refreshFeed(title: string) {
    await this.hoverFeed(title)

    const feedElement = this.page.locator('div').filter({ hasText: title }).first()
    const refreshButton = feedElement.locator('button').nth(-2)
    await refreshButton.click()

    await this.page.waitForTimeout(2000)
  }

  /**
   * Confirm delete operation in the confirmation dialog
   */
  private async confirmDelete() {
    await this.page.waitForSelector('text=确定要删除这个订阅吗？', { timeout: 5000 })

    const confirmButton = this.page.locator('button').filter({ hasText: '确定' })
    await confirmButton.click()

    await this.page.waitForSelector('text=确定要删除这个订阅吗？', { state: 'hidden', timeout: 5000 })
  }

  /**
   * Check if empty state is shown
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false)
  }
}
