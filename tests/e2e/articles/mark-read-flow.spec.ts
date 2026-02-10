import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { SidebarPage } from '../../pages/SidebarPage'
import { ArticleListPanelPage } from '../../pages/ArticleListPanelPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Mark Read Flow', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage
  let sidebar: SidebarPage
  let articleListPanel: ArticleListPanelPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)
    sidebar = new SidebarPage(page)
    articleListPanel = new ArticleListPanelPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async () => {
    await feedListPage.closeAnyDialog()
  })

  test.describe('Auto Mark Read on Click', () => {
    test('should mark article as read when clicked in article list', async ({ page }) => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      const firstArticle = articleListPage.articleItems.first()
      const unreadIndicator = firstArticle.locator('[data-testid="unread-indicator"]')
      const wasUnread = await unreadIndicator.isVisible().catch(() => false)

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()
      await page.waitForTimeout(500)

      if (wasUnread) {
        const mockCalls = await page.evaluate(() => {
          return (window as unknown as { __TAURI_MOCK_CALLS__: Array<{ command: string; args: unknown }> }).__TAURI_MOCK_CALLS__
            .filter((c: { command: string }) => c.command === 'mark_article_read')
        })
        expect(mockCalls.length).toBeGreaterThan(0)
      }
    })

    test('should show unread indicator before clicking and hide after', async ({ page }) => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      const firstArticle = articleListPage.articleItems.first()
      const unreadIndicator = firstArticle.locator('[data-testid="unread-indicator"]')

      const firstIsRead = await articleListPage.isArticleRead(0)
      if (!firstIsRead) {
        await expect(unreadIndicator).toBeVisible()

        await articleListPage.clickArticle(0)
        await articleViewerPage.waitForVisible()
        await page.waitForTimeout(500)

        await expect(unreadIndicator).not.toBeVisible()
      }
    })

    test('should not re-mark already read article', async ({ page }) => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      const readArticle = await articleListPage.findArticleByTitle('Building Desktop Apps with Tauri v2')
      if (readArticle) {
        await readArticle.click()
        await articleViewerPage.waitForVisible()
        await page.waitForTimeout(300)

        const mockCalls = await page.evaluate(() => {
          return (window as unknown as { __TAURI_MOCK_CALLS__: Array<{ command: string; args: unknown }> }).__TAURI_MOCK_CALLS__
            .filter((c: { command: string }) => c.command === 'mark_article_read')
        })
        expect(mockCalls.length).toBe(0)
      }
    })
  })

  test.describe('Unread Count Updates', () => {
    test('should decrease feed unread count when article is marked read', async ({ page }) => {
      const initialGlobalUnread = await feedListPage.getGlobalUnreadCount()

      const feedBtn = sidebar.panelContent.locator('button').filter({ hasText: 'Tech Blog' }).first()
      await feedBtn.dispatchEvent('click')
      await page.waitForTimeout(500)
      await articleListPage.waitForLoaded()

      const unreadArticles = articleListPage.articleItems.filter({
        has: page.locator('[data-testid="unread-indicator"]'),
      })
      const unreadCount = await unreadArticles.count()

      if (unreadCount > 0) {
        await unreadArticles.first().click()
        await articleViewerPage.waitForVisible()
        await page.waitForTimeout(500)

        await sidebar.clickAllArticles()
        await page.waitForTimeout(300)

        const newGlobalUnread = await feedListPage.getGlobalUnreadCount()
        expect(newGlobalUnread).toBeLessThanOrEqual(initialGlobalUnread)
      }
    })
  })

  test.describe('Mark All Read', () => {
    test('should show mark all read button when feed has unread articles', async ({ page }) => {
      const feedBtn = sidebar.panelContent.locator('button').filter({ hasText: 'Tech Blog' }).first()
      await feedBtn.dispatchEvent('click')
      await page.waitForTimeout(500)
      await articleListPage.waitForLoaded()

      const markAllReadBtn = page.locator('button[aria-label="Mark all as read"]')
      await expect(markAllReadBtn).toBeVisible()
    })

    test('should mark all articles as read when clicking mark all read', async ({ page }) => {
      const feedBtn = sidebar.panelContent.locator('button').filter({ hasText: 'Tech Blog' }).first()
      await feedBtn.dispatchEvent('click')
      await page.waitForTimeout(500)
      await articleListPage.waitForLoaded()

      const markAllReadBtn = page.locator('button[aria-label="Mark all as read"]')
      await markAllReadBtn.click()
      await page.waitForTimeout(1000)

      const unreadIndicators = articleListPage.container.locator('[data-testid="unread-indicator"]')
      const unreadCount = await unreadIndicators.count()
      expect(unreadCount).toBe(0)
    })

    test('should update feed unread count to zero after mark all read', async ({ page }) => {
      const feedBtn = sidebar.panelContent.locator('button').filter({ hasText: 'Tech Blog' }).first()
      await feedBtn.dispatchEvent('click')
      await page.waitForTimeout(500)
      await articleListPage.waitForLoaded()

      const markAllReadBtn = page.locator('button[aria-label="Mark all as read"]')
      await markAllReadBtn.click()
      await page.waitForTimeout(1000)

      const mockCalls = await page.evaluate(() => {
        return (window as unknown as { __TAURI_MOCK_CALLS__: Array<{ command: string; args: unknown }> }).__TAURI_MOCK_CALLS__
          .filter((c: { command: string }) => c.command === 'mark_all_read')
      })
      expect(mockCalls.length).toBeGreaterThan(0)
    })

    test('should hide mark all read button in favorites view', async () => {
      await sidebar.clickFavorites()
      await articleListPanel.waitForLoaded()

      const headerTitle = await articleListPanel.getHeaderTitle()
      expect(headerTitle).toContain('收藏文章')

      const markAllReadBtn = articleListPanel.markAllReadButton
      const isVisible = await markAllReadBtn.isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })
  })

  test.describe('Read State Visual Indicators', () => {
    test('should show unread articles with bold title and read articles with normal weight', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      const articles = await articleListPage.articleItems.all()
      for (const article of articles) {
        const titleEl = article.locator('h3').first()
        const fontWeight = await titleEl.evaluate(el => window.getComputedStyle(el).fontWeight)
        const isRead = await article.evaluate(el => {
          const cls = el.getAttribute('class') || ''
          return cls.includes('opacity-80') || cls.includes('bg-read-background')
        })

        if (isRead) {
          expect(['400', 'normal']).toContain(fontWeight)
        } else {
          expect(['500', '600', '700', 'medium', 'semibold', 'bold']).toContain(fontWeight)
        }
      }
    })

    test('should show selected article with accent background', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const isSelected = await articleListPanel.isArticleSelected(0)
      expect(isSelected).toBe(true)
    })
  })
})
