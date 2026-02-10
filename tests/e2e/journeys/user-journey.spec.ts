import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { SidebarPage } from '../../pages/SidebarPage'
import { ArticleListPanelPage } from '../../pages/ArticleListPanelPage'
import { ReaderPanelPage } from '../../pages/ReaderPanelPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('User Journey: Browse, Read, and Manage Articles', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage
  let sidebar: SidebarPage
  let articleListPanel: ArticleListPanelPage
  let readerPanel: ReaderPanelPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)
    sidebar = new SidebarPage(page)
    articleListPanel = new ArticleListPanelPage(page)
    readerPanel = new ReaderPanelPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async () => {
    await feedListPage.closeAnyDialog()
  })

  test('Journey: App startup shows three-panel layout with feeds and articles', async () => {
    await expect(sidebar.panelContent).toBeVisible()
    await expect(articleListPanel.panelContent).toBeVisible()
    await expect(readerPanel.panelContent).toBeVisible()

    const feedCount = await sidebar.getFeedCount()
    expect(feedCount).toBe(2)

    await articleListPanel.waitForLoaded()
    const articleCount = await articleListPanel.getArticleCount()
    expect(articleCount).toBeGreaterThan(0)

    expect(await readerPanel.isEmptyPlaceholderVisible()).toBe(true)
  })

  test('Journey: Select feed → browse articles → read article → navigate', async ({ page }) => {
    // 1. Select a specific feed via dispatchEvent to bypass hover overlay
    const techBlogBtn = sidebar.panelContent.locator('button').filter({ hasText: 'Tech Blog' }).first()
    await techBlogBtn.dispatchEvent('click')
    await page.waitForTimeout(500)
    await articleListPanel.waitForLoaded()

    const headerTitle = await articleListPanel.getHeaderTitle()
    expect(headerTitle).toContain('Tech Blog')

    const articleCount = await articleListPanel.getArticleCount()
    expect(articleCount).toBeGreaterThan(0)

    // 2. Click first article to read it
    await articleListPanel.clickArticle(0)
    await readerPanel.waitForArticle()

    const articleTitle = await readerPanel.getArticleTitle()
    expect(articleTitle).toBeTruthy()

    expect(await readerPanel.isEmptyPlaceholderVisible()).toBe(false)

    // 3. Navigate to next article
    if (await readerPanel.nextButton.isVisible().catch(() => false)) {
      const firstTitle = articleTitle
      await readerPanel.clickNext()
      const secondTitle = await readerPanel.getArticleTitle()
      expect(secondTitle).not.toBe(firstTitle)

      // 4. Navigate back
      await readerPanel.clickPrevious()
      const backTitle = await readerPanel.getArticleTitle()
      expect(backTitle).toBe(firstTitle)
    }

    // 5. Deselect with Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    expect(await readerPanel.isEmptyPlaceholderVisible()).toBe(true)
  })

  test('Journey: Read article → favorite → view in favorites → unfavorite', async ({ page }) => {
    // 1. Load all articles and select an unfavorited one
    await sidebar.clickAllArticles()
    await articleListPanel.waitForLoaded()
    await articleListPanel.clickArticle(0)
    await articleViewerPage.waitForVisible()

    const articleTitle = await articleViewerPage.getArticleTitle()

    // 2. Favorite the article
    const wasFavorited = await articleViewerPage.isFavorited()
    if (!wasFavorited) {
      await articleViewerPage.toggleFavorite()
      expect(await articleViewerPage.isFavorited()).toBe(true)
    }

    // 3. Switch to favorites view
    await sidebar.clickFavorites()
    await articleListPanel.waitForLoaded()

    const favHeaderTitle = await articleListPanel.getHeaderTitle()
    expect(favHeaderTitle).toContain('收藏文章')

    const favCount = await articleListPanel.getArticleCount()
    expect(favCount).toBeGreaterThanOrEqual(1)

    // 4. Click the favorited article in favorites view
    await articleListPanel.clickArticle(0)
    await articleViewerPage.waitForVisible()

    // 5. Unfavorite it
    await articleViewerPage.toggleFavorite()
    expect(await articleViewerPage.isFavorited()).toBe(false)

    // 6. Switch back to all articles
    await sidebar.clickAllArticles()
    await articleListPanel.waitForLoaded()
    const allCount = await articleListPanel.getArticleCount()
    expect(allCount).toBeGreaterThan(0)
  })

  test('Journey: Browse feeds → mark articles read → verify counts', async ({ page }) => {
    // 1. Check initial unread count
    const initialGlobalUnread = await feedListPage.getGlobalUnreadCount()
    expect(initialGlobalUnread).toBeGreaterThan(0)

    // 2. Select a feed with unread articles
    const feedBtn = sidebar.panelContent.locator('button').filter({ hasText: 'Tech Blog' }).first()
    await feedBtn.dispatchEvent('click')
    await page.waitForTimeout(500)
    await articleListPage.waitForLoaded()

    // 3. Click an unread article (auto-marks as read)
    const firstArticle = articleListPage.articleItems.first()
    const unreadIndicator = firstArticle.locator('[data-testid="unread-indicator"]')
    const hasUnread = await unreadIndicator.isVisible().catch(() => false)

    if (hasUnread) {
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()
      await page.waitForTimeout(500)

      await expect(unreadIndicator).not.toBeVisible()
    }

    // 4. Mark all read
    const markAllReadBtn = page.locator('button[aria-label="Mark all as read"]')
    if (await markAllReadBtn.isVisible().catch(() => false)) {
      await markAllReadBtn.click()
      await page.waitForTimeout(1000)

      const remainingUnread = articleListPage.container.locator('[data-testid="unread-indicator"]')
      expect(await remainingUnread.count()).toBe(0)
    }
  })

  test('Journey: Keyboard-only navigation flow', async ({ page }) => {
    await sidebar.clickAllArticles()
    await articleListPanel.waitForLoaded()

    // 1. Click first article to enter reader
    await articleListPanel.clickArticle(0)
    await articleViewerPage.waitForVisible()

    const firstTitle = await articleViewerPage.getArticleTitle()

    // 2. Navigate with arrow keys
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)
    const secondTitle = await articleViewerPage.getArticleTitle()
    expect(secondTitle).not.toBe(firstTitle)

    // 3. Go back with ArrowLeft
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(500)
    expect(await articleViewerPage.getArticleTitle()).toBe(firstTitle)

    // 4. Toggle favorite with F
    const wasFav = await articleViewerPage.isFavorited()
    await page.keyboard.press('f')
    await page.waitForTimeout(500)
    expect(await articleViewerPage.isFavorited()).not.toBe(wasFav)

    // 5. Undo favorite
    await page.keyboard.press('f')
    await page.waitForTimeout(500)
    expect(await articleViewerPage.isFavorited()).toBe(wasFav)

    // 6. Escape to deselect
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    expect(await readerPanel.isEmptyPlaceholderVisible()).toBe(true)
  })

  test('Journey: Switch between feeds and verify article isolation', async ({ page }) => {
    // 1. Select Tech Blog
    await sidebar.panelContent.locator('button').filter({ hasText: 'Tech Blog' }).first().dispatchEvent('click')
    await page.waitForTimeout(500)
    await articleListPanel.waitForLoaded()
    const techBlogCount = await articleListPanel.getArticleCount()
    const techBlogHeader = await articleListPanel.getHeaderTitle()
    expect(techBlogHeader).toContain('Tech Blog')

    // 2. Switch to Daily News
    await sidebar.panelContent.locator('button').filter({ hasText: 'Daily News' }).first().dispatchEvent('click')
    await page.waitForTimeout(500)
    await articleListPanel.waitForLoaded()
    const dailyNewsCount = await articleListPanel.getArticleCount()
    const dailyNewsHeader = await articleListPanel.getHeaderTitle()
    expect(dailyNewsHeader).toContain('Daily News')

    // 3. Articles should be different sets
    expect(techBlogCount).not.toBe(dailyNewsCount)

    // 4. Switch to all articles
    await sidebar.clickAllArticles()
    await articleListPanel.waitForLoaded()
    const allCount = await articleListPanel.getArticleCount()
    expect(allCount).toBe(techBlogCount + dailyNewsCount)
  })

  test('Journey: Settings round-trip - change reader settings and verify', async ({ page }) => {
    // 1. Open an article
    await sidebar.clickAllArticles()
    await articleListPanel.waitForLoaded()
    await articleListPanel.clickArticle(0)
    await articleViewerPage.waitForVisible()
    await articleViewerPage.waitForContent()

    // 2. Open settings from reader toolbar
    await articleViewerPage.openSettings()
    expect(await articleViewerPage.isSettingsPanelVisible()).toBe(true)

    // 3. Change font size
    await articleViewerPage.setFontSize(20)
    expect(await articleViewerPage.getFontSize()).toBe(20)

    // 4. Change text alignment
    await articleViewerPage.setTextAlign('justify')

    // 5. Reset settings and verify
    await articleViewerPage.resetSettings()
    expect(await articleViewerPage.getFontSize()).toBe(16)

    // 6. Close settings by clicking the X button
    const closeBtn = articleViewerPage.settingsDialog.locator('button').filter({ has: page.locator('svg.w-5.h-5') }).last()
    await closeBtn.click()
    await page.waitForTimeout(300)
  })

  test('Journey: Add feed dialog validation flow', async () => {
    // 1. Open add feed dialog
    await feedListPage.clickAddFeed()

    const dialogTitle = feedListPage.page.locator('h2', { hasText: '添加 RSS 订阅' })
    await expect(dialogTitle).toBeVisible()

    // 2. Submit button should be disabled with empty input
    const submitButton = feedListPage.page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()
    expect(isDisabled).toBe(true)

    // 3. Enter valid URL
    const urlInput = feedListPage.page.locator('#feed-url')
    await urlInput.fill('https://example.com/new-feed.xml')

    // 4. Submit button should be enabled
    expect(await submitButton.isDisabled()).toBe(false)

    // 5. Cancel and verify dialog closes
    const cancelButton = feedListPage.page.locator('button', { hasText: '取消' })
    await cancelButton.click()
    await expect(dialogTitle).not.toBeVisible()
  })
})
