import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for the Sidebar panel (left panel)
 *
 * The sidebar contains:
 * - RSS Reader logo/heading
 * - Refresh all / Add feed buttons
 * - "全部文章" (All Articles) navigation button
 * - "收藏文章" (Favorites) navigation button
 * - Feed subscription list
 * - Bottom area: Settings button (theme settings now in unified settings dialog)
 */
export class SidebarPage {
  readonly page: Page

  // Panel wrapper
  readonly panelContent: Locator

  // Header
  readonly heading: Locator
  readonly refreshAllButton: Locator
  readonly addFeedButton: Locator

  // Navigation
  readonly allArticlesButton: Locator
  readonly favoritesButton: Locator

  // Feed list
  readonly feedItems: Locator
  readonly emptyState: Locator

  // Bottom area
  readonly bottomArea: Locator
  readonly settingsButton: Locator

  // Unified Settings Dialog
  readonly settingsDialog: Locator
  readonly settingsNavAppearance: Locator

  constructor(page: Page) {
    this.page = page

    // Use the data-testid for the feed panel content
    this.panelContent = page.locator('[data-testid="feed-panel-content"]')

    // Header elements
    this.heading = this.panelContent.getByRole('heading', { name: 'RSS Reader' })
    this.refreshAllButton = this.panelContent.getByTitle('刷新全部')
    this.addFeedButton = this.panelContent.getByTitle('添加订阅')

    // Navigation buttons in the sidebar
    this.allArticlesButton = this.panelContent.locator('[data-testid="all-articles-button"]')
    this.favoritesButton = this.panelContent.locator('[data-testid="favorites-button"]')

    // Feed items
    this.feedItems = this.panelContent.locator('[data-testid="feed-item"]')

    // Empty state
    this.emptyState = this.panelContent.locator('[data-testid="feed-empty-state"]')

    // Bottom area with settings button
    this.bottomArea = this.panelContent.locator('[data-testid="sidebar-bottom"]')
    // Use exact title matching
    this.settingsButton = this.panelContent.getByTitle('设置', { exact: true })

    // Unified Settings Dialog
    this.settingsDialog = page.locator('[data-testid="settings-dialog"]')
    this.settingsNavAppearance = this.settingsDialog.locator('button', { hasText: '外观' })
  }

  /**
   * Wait for the sidebar to be fully loaded
   */
  async waitForLoaded() {
    await expect(this.panelContent).toBeVisible()
    await expect(this.heading).toBeVisible()
  }

  /**
   * Click "全部文章" to show all articles
   */
  async clickAllArticles() {
    await this.allArticlesButton.click()
  }

  /**
   * Click "收藏文章" to show favorites
   */
  async clickFavorites() {
    await this.favoritesButton.click()
  }

  /**
   * Check if "全部文章" is currently selected (active style)
   */
  async isAllArticlesSelected(): Promise<boolean> {
    const cls = await this.allArticlesButton.getAttribute('class')
    return cls?.includes('bg-sidebar-hover') ?? false
  }

  /**
   * Check if "收藏文章" is currently selected (active style)
   */
  async isFavoritesSelected(): Promise<boolean> {
    const cls = await this.favoritesButton.getAttribute('class')
    return cls?.includes('bg-sidebar-hover') ?? false
  }

  /**
   * Get the count of feed subscriptions listed
   */
  async getFeedCount(): Promise<number> {
    return await this.feedItems.count()
  }

  /**
   * Select a feed by its displayed title
   */
  async selectFeed(title: string) {
    const feedButton = this.panelContent.locator('button').filter({ hasText: title }).first()
    await feedButton.click()
  }

  /**
   * Open settings dialog
   */
  async openSettings() {
    await this.settingsButton.click()
    await expect(this.settingsDialog).toBeVisible({ timeout: 3000 })
  }

  /**
   * Open settings dialog and navigate to appearance tab
   */
  async openAppearanceSettings() {
    await this.openSettings()
    await this.settingsNavAppearance.click()
  }

  /**
   * Check if settings dialog is visible
   */
  async isSettingsDialogVisible(): Promise<boolean> {
    return await this.settingsDialog.isVisible().catch(() => false)
  }

  /**
   * Close settings dialog
   */
  async closeSettings() {
    await this.page.keyboard.press('Escape')
    await expect(this.settingsDialog).not.toBeVisible({ timeout: 3000 })
  }

  /**
   * Take a screenshot of the sidebar
   */
  async screenshot(path: string) {
    await this.panelContent.screenshot({ path })
  }
}
