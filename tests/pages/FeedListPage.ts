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
  readonly feedActionButtons: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('[data-testid="feed-panel-content"]')
    this.header = page.getByRole('heading', { name: 'RSS Reader' })
    this.feedItems = page.locator('[data-testid="feed-item"]')
    this.addButton = page.getByTitle('添加订阅')
    this.refreshAllButton = page.getByTitle('刷新全部')
    this.allArticlesButton = page.locator('[data-testid="all-articles-button"]')
    this.emptyState = page.locator('[data-testid="feed-empty-state"]')
    this.globalUnreadBadge = page.locator('[data-testid="global-unread-badge"]')
    this.feedActionButtons = page.locator('[data-testid="feed-actions"]')
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
      const addDialogTitle = this.page.locator('h2', { hasText: '添加 RSS 订阅' })
      const editDialogTitle = this.page.locator('h2', { hasText: '编辑订阅' })
      const isAddOpen = await addDialogTitle.isVisible().catch(() => false)
      const isEditOpen = await editDialogTitle.isVisible().catch(() => false)

      if (isAddOpen || isEditOpen) {
        await this.page.keyboard.press('Escape')
        // Wait for dialog to close
        await Promise.race([
          addDialogTitle.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {}),
          editDialogTitle.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {}),
        ])

        const stillOpen = (await addDialogTitle.isVisible().catch(() => false))
          || (await editDialogTitle.isVisible().catch(() => false))
        if (!stillOpen) {
          break
        }
      } else {
        break
      }
    }

    const backdrop = this.page.locator('[data-testid="dialog-backdrop"]')
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click({ force: true })
      await backdrop.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {})
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
    // Wait for refresh to start (spinner appears) then complete
    await this.page.waitForFunction(
      () => !document.querySelector('button[title="刷新全部"] .animate-spin'),
      { timeout: 10000 }
    ).catch(() => {})
  }

  /**
   * Click on "All Articles" button
   */
  async clickAllArticles() {
    await this.ensureReady()

    for (let i = 0; i < 3; i++) {
      try {
        await this.allArticlesButton.click({ timeout: 5000 })
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
    // Wait for article list to respond to feed selection
    await this.page.locator('[data-testid="article-list-panel-content"]').waitFor({ state: 'visible' })
  }

  /**
   * Get the unread count for a specific feed
   */
  async getFeedUnreadCount(title: string): Promise<number> {
    const feedElement = this.page.locator('[data-testid="feed-item"]').filter({ hasText: title }).first()
    const badge = feedElement.locator('[data-testid="feed-unread-count"]')
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
    const badge = this.container.locator('[data-testid="global-unread-badge"]')
    const text = await badge.textContent()
    return text ? parseInt(text, 10) : 0
  }

  /**
   * Hover over a feed to reveal action buttons
   */
  async hoverFeed(title: string) {
    const feedElement = this.page.locator('[data-testid="feed-item"]').filter({ hasText: title }).first()
    await feedElement.hover()
  }

  async clickEditButton(title: string) {
    await this.hoverFeed(title)
    const actions = this.getFeedActions(title)
    // Click the dropdown trigger (MoreHorizontal button)
    const dropdownTrigger = actions.locator('button').first()
    await dropdownTrigger.click()
    // Click the "编辑" menu item from the dropdown (rendered in portal)
    const editMenuItem = this.page.locator('[data-testid="feed-menu-edit"]')
    await editMenuItem.click()
  }

  getFeedActions(title: string): Locator {
    return this.page
      .locator('[data-testid="feed-item"]')
      .filter({ hasText: title })
      .locator('[data-testid="feed-actions"]')
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

    // Wait for refresh to complete (spinner disappears)
    await this.page.waitForFunction(
      () => !document.querySelector('.animate-spin'),
      { timeout: 10000 }
    ).catch(() => {})
  }

  /**
   * Confirm delete operation in the confirmation dialog
   */
  private async confirmDelete() {
    await this.page.locator('[data-testid="confirm-dialog"]').waitFor({ state: 'visible', timeout: 5000 })

    const confirmButton = this.page.locator('[data-testid="confirm-ok-button"]')
    await confirmButton.click()

    await this.page.locator('[data-testid="confirm-dialog"]').waitFor({ state: 'hidden', timeout: 5000 })
  }

  /**
   * Check if empty state is shown
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false)
  }
}
