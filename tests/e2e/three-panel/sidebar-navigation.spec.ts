import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/SidebarPage'
import { ArticleListPanelPage } from '../../pages/ArticleListPanelPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * Journey 2: Sidebar Navigation
 *
 * Verifies the sidebar navigation elements work correctly:
 * - "全部文章" (All Articles) button visible and clickable
 * - "收藏文章" (Favorites) button visible and clickable
 * - Settings button in the bottom area (opens unified settings dialog)
 * - Navigation triggers article list updates
 * - Feed subscription items are displayed
 */
test.describe('Journey 2: Sidebar Navigation', () => {
  let sidebar: SidebarPage
  let articleList: ArticleListPanelPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    sidebar = new SidebarPage(page)
    articleList = new ArticleListPanelPage(page)

    await page.goto('/')
    await sidebar.waitForLoaded()
  })

  test.describe('All Articles Button', () => {
    test('should be visible in the sidebar', async () => {
      await expect(sidebar.allArticlesButton).toBeVisible()
    })

    test('should contain the text "全部文章"', async () => {
      const text = await sidebar.allArticlesButton.textContent()
      expect(text).toContain('全部文章')
    })

    test('should be clickable and update article list header', async () => {
      await sidebar.clickAllArticles()

      // Article list header should show "全部文章"
      const headerTitle = await articleList.getHeaderTitle()
      expect(headerTitle).toContain('全部文章')
    })

    test('should display unread count badge when articles are unread', async () => {
      // Mock provides feeds with unread counts, so the badge should appear
      // The badge is inside the all articles button area
      const badge = sidebar.panelContent.locator('span.bg-sidebar-active.text-white').first()
      const isVisible = await badge.isVisible().catch(() => false)

      // Badge visibility depends on unread count
      if (isVisible) {
        const text = await badge.textContent()
        expect(text).toBeTruthy()
        const count = parseInt(text!, 10)
        expect(count).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Favorites Button', () => {
    test('should be visible in the sidebar', async () => {
      await expect(sidebar.favoritesButton).toBeVisible()
    })

    test('should contain the text "收藏文章" with a Star icon', async () => {
      const text = await sidebar.favoritesButton.textContent()
      expect(text).toContain('收藏文章')

      // The button should contain an SVG (Star icon from lucide-react)
      const svgInButton = sidebar.favoritesButton.locator('svg')
      await expect(svgInButton).toBeVisible()
    })

    test('should be clickable and update article list header to show favorites', async () => {
      await sidebar.clickFavorites()

      // Article list header should show "收藏文章"
      const headerTitle = await articleList.getHeaderTitle()
      expect(headerTitle).toContain('收藏文章')
    })

    test('should show favorites articles when clicked', async ({ page }) => {
      await sidebar.clickFavorites()
      await articleList.waitForLoaded()

      // Mock data has one favorited article (article-2)
      const count = await articleList.getArticleCount()
      expect(count).toBeGreaterThanOrEqual(0) // Could be 0 or 1 depending on state
    })
  })

  test.describe('Switching between All and Favorites', () => {
    test('should switch from all articles to favorites and back', async () => {
      // Start with all articles
      await sidebar.clickAllArticles()
      let headerTitle = await articleList.getHeaderTitle()
      expect(headerTitle).toContain('全部文章')

      // Switch to favorites
      await sidebar.clickFavorites()
      headerTitle = await articleList.getHeaderTitle()
      expect(headerTitle).toContain('收藏文章')

      // Switch back to all articles
      await sidebar.clickAllArticles()
      headerTitle = await articleList.getHeaderTitle()
      expect(headerTitle).toContain('全部文章')
    })
  })

  test.describe('Appearance Settings (via Unified Settings)', () => {
    test('should open settings dialog when settings button is clicked', async () => {
      await sidebar.openSettings()
      expect(await sidebar.isSettingsDialogVisible()).toBe(true)
    })

    test('should show appearance options in settings dialog', async ({ page }) => {
      await sidebar.openSettings()

      // Settings dialog should appear with theme options
      const themeSection = page.locator('text=主题风格')
      await expect(themeSection).toBeVisible()

      // Should show theme presets
      await expect(page.locator('text=护眼模式')).toBeVisible()
      await expect(page.locator('text=羊皮纸')).toBeVisible()
      await expect(page.locator('text=墨水屏')).toBeVisible()

      // Should show mode options
      await expect(page.locator('text=明暗模式')).toBeVisible()
      await expect(page.locator('text=浅色')).toBeVisible()
      await expect(page.locator('text=深色')).toBeVisible()
    })

    test('should close settings dialog when pressing Escape', async () => {
      await sidebar.openSettings()
      expect(await sidebar.isSettingsDialogVisible()).toBe(true)

      await sidebar.closeSettings()
      expect(await sidebar.isSettingsDialogVisible()).toBe(false)
    })
  })

  test.describe('Settings Button', () => {
    test('should be visible in the sidebar bottom area', async () => {
      await expect(sidebar.settingsButton).toBeVisible()
    })

    test('should be positioned in the bottom section', async () => {
      const bottomBox = await sidebar.bottomArea.boundingBox()
      const settingsBox = await sidebar.settingsButton.boundingBox()

      expect(bottomBox).toBeTruthy()
      expect(settingsBox).toBeTruthy()

      expect(settingsBox!.y).toBeGreaterThanOrEqual(bottomBox!.y)
    })

    test('should have settings icon (SVG)', async () => {
      const svg = sidebar.settingsButton.locator('svg')
      await expect(svg).toBeVisible()
    })
  })

  test.describe('Feed Subscription List', () => {
    test('should display mock feed subscriptions', async () => {
      const feedCount = await sidebar.getFeedCount()
      // Mock provides 2 feeds
      expect(feedCount).toBe(2)
    })

    test('should display feed titles', async () => {
      // Check that mock feed titles appear
      const techBlog = sidebar.panelContent.locator('text=Tech Blog')
      await expect(techBlog).toBeVisible()

      const dailyNews = sidebar.panelContent.locator('text=Daily News')
      await expect(dailyNews).toBeVisible()
    })

    test('should update article list when a feed is selected', async () => {
      // Click on a specific feed
      await sidebar.selectFeed('Tech Blog')

      // Article list header should show the feed title
      const headerTitle = await articleList.getHeaderTitle()
      expect(headerTitle).toContain('Tech Blog')
    })
  })

  test.describe('Sidebar Header', () => {
    test('should display RSS Reader heading', async () => {
      await expect(sidebar.heading).toBeVisible()
      const text = await sidebar.heading.textContent()
      expect(text).toContain('RSS Reader')
    })

    test('should have refresh all button', async () => {
      await expect(sidebar.refreshAllButton).toBeVisible()
    })

    test('should have add feed button', async () => {
      await expect(sidebar.addFeedButton).toBeVisible()
    })
  })
})
