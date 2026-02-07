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
 * - Bottom area: Settings button + Theme switcher
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
  readonly themeSwitcherButton: Locator

  constructor(page: Page) {
    this.page = page

    // Use the data-testid for the feed panel content
    this.panelContent = page.locator('[data-testid="feed-panel-content"]')

    // Header elements
    this.heading = this.panelContent.getByRole('heading', { name: 'RSS Reader' })
    this.refreshAllButton = this.panelContent.getByTitle('刷新全部')
    this.addFeedButton = this.panelContent.getByTitle('添加订阅')

    // Navigation buttons in the sidebar
    this.allArticlesButton = this.panelContent.locator('button').filter({ hasText: '全部文章' })
    this.favoritesButton = this.panelContent.locator('button').filter({ hasText: '收藏文章' })

    // Feed items - each feed is wrapped in a div with group class
    this.feedItems = this.panelContent.locator('div.group.relative.rounded-md')

    // Empty state text
    this.emptyState = this.panelContent.locator('text=还没有订阅')

    // Bottom area with settings and theme switcher
    this.bottomArea = this.panelContent.locator('div.border-t').last()
    // Use exact title matching to avoid "设置" matching "主题设置"
    this.settingsButton = this.panelContent.getByTitle('设置', { exact: true })
    this.themeSwitcherButton = this.panelContent.getByTitle('主题设置')
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
    await this.page.waitForTimeout(300)
  }

  /**
   * Click "收藏文章" to show favorites
   */
  async clickFavorites() {
    await this.favoritesButton.click()
    await this.page.waitForTimeout(300)
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
    await this.page.waitForTimeout(300)
  }

  /**
   * Open the theme switcher popup
   */
  async openThemeSwitcher() {
    await this.themeSwitcherButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Open settings dialog
   */
  async openSettings() {
    await this.settingsButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Take a screenshot of the sidebar
   */
  async screenshot(path: string) {
    await this.panelContent.screenshot({ path })
  }
}
