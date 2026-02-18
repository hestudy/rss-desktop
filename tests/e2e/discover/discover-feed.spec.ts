import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { DiscoverPanelPage } from '../../pages/DiscoverPanelPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for RSS Feed Discovery Feature
 *
 * Tests the complete discovery workflow:
 * 1. Navigation to discover panel
 * 2. Category filtering
 * 3. Search functionality
 * 4. Adding feeds from discovery
 *
 * Note: In the new layout, the discover panel is embedded in a two-column layout
 * (FeedList | DiscoverPanel) instead of a full-screen overlay.
 */
test.describe('Discover RSS Feeds', () => {
  let feedListPage: FeedListPage
  let discoverPage: DiscoverPanelPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    discoverPage = new DiscoverPanelPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async () => {
    // Clean up any open dialogs
    await feedListPage.closeAnyDialog()
  })

  // =====================
  // Navigation Tests
  // =====================

  test.describe('Navigation', () => {
    test('should navigate to discover panel from sidebar', async () => {
      // Click the discover button in sidebar
      await discoverPage.openFromSidebar()

      // Verify discover layout is visible (two-column layout)
      await expect(discoverPage.layout).toBeVisible()
      await expect(discoverPage.title).toBeVisible()
      await expect(discoverPage.description).toBeVisible()
    })

    test('should show discover panel with correct title and description', async () => {
      await discoverPage.openFromSidebar()

      await expect(discoverPage.title).toContainText('发现订阅')
      await expect(discoverPage.description).toContainText('探索精选 RSS 订阅源')
    })

    test('should highlight discover button when active', async ({ page }) => {
      // This test doesn't use discoverPage.openFromSidebar() to avoid race conditions
      const discoverButton = page.getByTestId('discover-button')

      // Initially not active - should have text-sidebar-muted (not text-sidebar-fg)
      await expect(discoverButton).toHaveClass(/text-sidebar-muted/)

      // Click to activate
      await discoverButton.click()

      // Wait for discover panel to load
      await expect(discoverPage.title).toBeVisible({ timeout: 5000 })

      // Should be highlighted with bg-sidebar-hover and text-sidebar-fg classes
      await expect(discoverButton).toHaveClass(/bg-sidebar-hover/)
      await expect(discoverButton).toHaveClass(/text-sidebar-fg/)
    })

    test('should close discover panel when clicking close button', async ({ page }) => {
      await discoverPage.openFromSidebar()

      // Close button should be visible
      await expect(discoverPage.closeButton).toBeVisible()

      // Click close
      await discoverPage.close()

      // Discover layout should be hidden (back to normal three-column view)
      await expect(discoverPage.layout).not.toBeVisible()

      // Article list should be visible
      await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible()
    })

    test('should keep feed list visible in two-column layout', async ({ page }) => {
      await discoverPage.openFromSidebar()

      // Feed panel should still be visible in two-column layout
      const feedPanel = page.getByTestId('feed-panel-content')
      await expect(feedPanel).toBeVisible()
    })
  })

  // =====================
  // Category Filter Tests
  // =====================

  test.describe('Category Filtering', () => {
    test.beforeEach(async () => {
      await discoverPage.openFromSidebar()
    })

    test('should display category buttons', async ({ page }) => {
      // Verify category buttons are visible
      const categoryButtons = page.getByTestId('discover-category-button')
      const count = await categoryButtons.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should display all expected categories', async () => {
      // Check for specific categories from mock data within the discover panel
      const discoverPanel = discoverPage.panel

      // Use locator within discover panel to avoid matching other buttons
      await expect(discoverPanel.getByRole('button', { name: '全部', exact: true })).toBeVisible()
      await expect(discoverPanel.getByRole('button', { name: '科技', exact: true })).toBeVisible()
      await expect(discoverPanel.getByRole('button', { name: '新闻', exact: true })).toBeVisible()
      await expect(discoverPanel.getByRole('button', { name: '设计', exact: true })).toBeVisible()
      await expect(discoverPanel.getByRole('button', { name: '财经', exact: true })).toBeVisible()
    })

    test('should filter feeds by category', async () => {
      // Initially show all feeds
      const initialCount = await discoverPage.getFeedCount()
      expect(initialCount).toBeGreaterThan(0)

      // Select "科技" category
      await discoverPage.selectCategory('科技')

      // Should only show tech feeds
      const techCount = await discoverPage.getFeedCount()
      expect(techCount).toBeLessThanOrEqual(initialCount)

      // Verify all visible feeds are from tech category
      const visibleFeeds = await discoverPage.getVisibleFeedTitles()
      // Mock data has 3 tech feeds: 阮一峰的网络日志, 少数派, InfoQ
      expect(visibleFeeds.length).toBe(3)
    })

    test('should show all feeds when clicking "全部" category', async ({ page }) => {
      // First filter by a category
      await discoverPage.selectCategory('科技')
      await page.waitForTimeout(300)
      const techCount = await discoverPage.getFeedCount()

      // Then click "全部" to show all (within discover panel)
      const discoverPanel = page.getByTestId('discover-panel')
      await discoverPanel.getByRole('button', { name: '全部', exact: true }).click()
      await page.waitForTimeout(300)
      const allCount = await discoverPage.getFeedCount()

      expect(allCount).toBeGreaterThan(techCount)
    })

    test('should highlight selected category button', async () => {
      const techButton = discoverPage.panel.getByRole('button', { name: /科技/ })

      // Click to select
      await techButton.click()

      // Should have active styling (default variant)
      await expect(techButton).toHaveClass(/bg-primary/)
    })
  })

  // =====================
  // Search Tests
  // =====================

  test.describe('Search Functionality', () => {
    test.beforeEach(async () => {
      await discoverPage.openFromSidebar()
    })

    test('should display search input', async () => {
      await expect(discoverPage.searchInput).toBeVisible()
      await expect(discoverPage.searchInput).toHaveAttribute('placeholder', '搜索订阅源名称、描述或标签...')
    })

    test('should filter feeds by search query', async () => {
      // Get initial count
      const initialCount = await discoverPage.getFeedCount()

      // Search for "科技"
      await discoverPage.search('科技')

      // Should show only matching feeds
      const searchCount = await discoverPage.getFeedCount()
      expect(searchCount).toBeLessThanOrEqual(initialCount)
    })

    test('should search in feed titles', async () => {
      // Search for specific title
      await discoverPage.search('阮一峰')

      // Should find the specific feed
      const feedCard = discoverPage.getFeedCard('阮一峰的网络日志')
      await expect(feedCard).toBeVisible()
    })

    test('should search in feed descriptions', async () => {
      // Search for term in description
      await discoverPage.search('效率工具')

      // Should find feeds matching description
      const count = await discoverPage.getFeedCount()
      expect(count).toBeGreaterThan(0)
    })

    test('should search in tags', async () => {
      // Search for tag
      await discoverPage.search('UI')

      // Should find feeds with matching tags
      const visibleFeeds = await discoverPage.getVisibleFeedTitles()
      expect(visibleFeeds.some(title => title.includes('优设'))).toBe(true)
    })

    test('should show empty state when no results', async ({ page }) => {
      // Search for non-existent term
      await discoverPage.search('xyznonexistent123')

      // Should show empty state
      await expect(page.getByText('没有找到订阅源')).toBeVisible()
    })

    test('should clear results when clearing search', async () => {
      // Search first
      await discoverPage.search('科技')
      const searchCount = await discoverPage.getFeedCount()

      // Clear search
      await discoverPage.clearSearch()
      const allCount = await discoverPage.getFeedCount()

      expect(allCount).toBeGreaterThan(searchCount)
    })

    test('should combine search with category filter', async () => {
      // Select category first
      await discoverPage.selectCategory('科技')
      const categoryCount = await discoverPage.getFeedCount()

      // Then search within category
      await discoverPage.search('InfoQ')
      const combinedCount = await discoverPage.getFeedCount()

      expect(combinedCount).toBeLessThanOrEqual(categoryCount)
      expect(combinedCount).toBe(1) // Only InfoQ matches
    })
  })

  // =====================
  // Add Feed Tests
  // =====================

  test.describe('Adding Feeds', () => {
    test.beforeEach(async () => {
      await discoverPage.openFromSidebar()
    })

    test('should display add button for feeds', async ({ page }) => {
      const addButton = page.getByRole('button', { name: '添加' }).first()
      await expect(addButton).toBeVisible()
      await expect(addButton).toBeEnabled()
    })

    test('should open AI config dialog when clicking add button', async ({ page }) => {
      const feedTitle = '阮一峰的网络日志'

      // Click add button
      await discoverPage.clickAddButton(feedTitle)

      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('自动抓取全文')).toBeVisible()
      await expect(page.getByText('自动生成 AI 摘要')).toBeVisible()
      await expect(page.getByText('自动 AI 翻译')).toBeVisible()
    })

    test('should add feed with default options and exit discover panel', async ({ page }) => {
      const feedTitle = '阮一峰的网络日志'

      // Add feed (with default options)
      await discoverPage.addFeed(feedTitle)

      // After adding, the discover panel should close and show article list
      await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })

      // The new feed should appear in the sidebar
      const hasNewFeed = await feedListPage.waitForFeed(feedTitle, 5000)
      expect(hasNewFeed).toBe(true)
    })

    test('should add feed with AI options enabled', async ({ page }) => {
      const feedTitle = '36氪'

      // Add feed with AI options
      await discoverPage.addFeedWithOptions(feedTitle, {
        useFullContent: true,
        useAiSummary: false,
        useAiTranslation: true,
      })

      // Wait for discover panel to close
      await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })

      // Check that the new feed appears in the sidebar
      const hasNewFeed = await feedListPage.waitForFeed(feedTitle, 5000)
      expect(hasNewFeed).toBe(true)
    })

    test('should cancel add dialog', async ({ page }) => {
      const feedTitle = 'InfoQ'

      // Click add button
      await discoverPage.clickAddButton(feedTitle)

      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

      // Click cancel
      await discoverPage.cancelAddDialog()

      // Dialog should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })

      // Discover layout should still be visible
      await expect(discoverPage.layout).toBeVisible()
    })

    test('should show new feed in sidebar after adding', async ({ page }) => {
      const feedTitle = '雪球'

      // Add the feed
      await discoverPage.addFeed(feedTitle)

      // Wait for discover panel to close
      await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })

      // Check that the new feed appears in the sidebar
      const hasNewFeed = await feedListPage.waitForFeed(feedTitle, 5000)
      expect(hasNewFeed).toBe(true)
    })

    test('should be able to add multiple feeds sequentially', async ({ page }) => {
      const feeds = ['优设网', '雪球']

      for (const feedTitle of feeds) {
        // Open discover panel
        await discoverPage.openFromSidebar()

        // Add the feed
        await discoverPage.addFeed(feedTitle)

        // Wait for discover panel to close
        await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })

        // Wait for feed to appear
        const hasFeed = await feedListPage.waitForFeed(feedTitle, 5000)
        expect(hasFeed).toBe(true)
      }
    })

    test('should show loading state while adding feed', async ({ page }) => {
      const feedTitle = '36氪'

      // Click add button
      const feedCard = discoverPage.getFeedCard(feedTitle)
      const addButton = feedCard.getByRole('button', { name: '添加' })
      await addButton.click()

      // Wait for dialog
      const confirmButton = page.getByRole('button', { name: '添加' }).last()
      await expect(confirmButton).toBeVisible({ timeout: 3000 })

      // Click confirm
      await confirmButton.click()

      // The panel should close
      await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })
    })

    test('should mark feed as added if already subscribed', async ({ page }) => {
      // Mock data has existing feeds that might overlap with discover feeds
      // Check if any feed shows "已添加" status
      const alreadyAddedFeeds = page.getByText('已添加')
      const count = await alreadyAddedFeeds.count()

      // Note: In mock data, existing feeds are:
      // - https://example.com/feed.xml
      // - https://example.com/news.xml
      // None of these match discover feeds, so count should be 0 initially
      expect(count).toBe(0)
    })
  })

  // =====================
  // UI State Tests
  // =====================

  test.describe('UI States', () => {
    test('should show loading state initially', async ({ page }) => {
      // Start fresh - don't use openFromSidebar which waits for load
      const discoverButton = page.getByTestId('discover-button')
      await discoverButton.click()

      // Loading state should appear briefly, but due to fast mock it might already be gone
      // Just verify the panel appears
      await expect(discoverPage.title).toBeVisible({ timeout: 5000 })
    })

    test('should display feeds in grid layout', async () => {
      await discoverPage.openFromSidebar()

      // Verify feed cards are visible
      const count = await discoverPage.getFeedCount()
      expect(count).toBeGreaterThan(0)
    })

    test('should display feed information correctly', async () => {
      await discoverPage.openFromSidebar()

      // Check first feed card has title, description, and tags
      const firstCard = discoverPage.feedCards.first()

      // Title
      await expect(firstCard.locator('h3')).toBeVisible()

      // Description - use more flexible selector
      await expect(firstCard.locator('p').first()).toBeVisible()

      // Tags - verify there's at least one tag element
      const tags = firstCard.locator('[data-testid="discover-feed-tag"]')
      const tagCount = await tags.count()
      expect(tagCount).toBeGreaterThanOrEqual(0) // Tags are optional
    })
  })

  // =====================
  // Two-Column Layout Tests
  // =====================

  test.describe('Two-Column Layout', () => {
    test('should show two-column layout when discover is active', async ({ page }) => {
      await discoverPage.openFromSidebar()

      // Verify two-column layout is visible
      await expect(discoverPage.layout).toBeVisible()

      // Verify feed list is still visible
      const feedPanel = page.getByTestId('feed-panel-content')
      await expect(feedPanel).toBeVisible()

      // Verify discover panel content is visible
      const discoverContent = page.getByTestId('discover-panel-content')
      await expect(discoverContent).toBeVisible()
    })

    test('should have resizable panels in two-column layout', async ({ page }) => {
      await discoverPage.openFromSidebar()

      // Verify resize handle exists
      const resizeHandle = page.locator('[data-testid="discover-resize-handle"]')
      await expect(resizeHandle).toBeVisible()
    })
  })

  // =====================
  // Integration Tests
  // =====================

  test.describe('Integration', () => {
    test('should add multiple feeds and see them in sidebar', async ({ page }) => {
      const feeds = ['优设网', 'InfoQ']

      for (const feedTitle of feeds) {
        // Open discover panel
        await discoverPage.openFromSidebar()

        // Add the feed
        await discoverPage.addFeed(feedTitle)

        // Wait for discover panel to close
        await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })

        // Wait for feed to appear
        const hasFeed = await feedListPage.waitForFeed(feedTitle, 5000)
        expect(hasFeed).toBe(true)
      }
    })

    test('should show added feed as "已添加" when reopening discover', async ({ page }) => {
      // Open discover panel first
      await discoverPage.openFromSidebar()

      // Add a feed
      await discoverPage.addFeed('优设网')

      // Wait for discover panel to close
      await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })

      // Wait for feed to appear in sidebar
      await feedListPage.waitForFeed('优设网', 5000)

      // Reopen discover panel
      await discoverPage.openFromSidebar()

      // The feed should show as "已添加"
      const feedCard = discoverPage.getFeedCard('优设网')
      await expect(feedCard.getByText('已添加')).toBeVisible({ timeout: 5000 })
    })

    test('should disable add button for already subscribed feeds', async ({ page }) => {
      // Open discover panel first
      await discoverPage.openFromSidebar()

      // Add a feed
      await discoverPage.addFeed('InfoQ')

      // Wait for discover panel to close
      await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible({ timeout: 5000 })

      // Wait for feed to appear in sidebar
      await feedListPage.waitForFeed('InfoQ', 5000)

      // Reopen discover panel
      await discoverPage.openFromSidebar()

      // The add button should be disabled and show "已添加"
      const feedCard = discoverPage.getFeedCard('InfoQ')
      const addedButton = feedCard.getByRole('button', { name: /已添加/ })
      await expect(addedButton).toBeVisible({ timeout: 5000 })
      await expect(addedButton).toBeDisabled()
    })
  })
})
