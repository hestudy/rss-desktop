import { test, expect } from '@playwright/test'
import { ArticleListPanelPage } from '../../pages/ArticleListPanelPage'
import { SidebarPage } from '../../pages/SidebarPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Article Sort Order - Unread First', () => {
  let sidebar: SidebarPage
  let articleList: ArticleListPanelPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    sidebar = new SidebarPage(page)
    articleList = new ArticleListPanelPage(page)

    await page.goto('/')
    await sidebar.waitForLoaded()
    await articleList.waitForLoaded()
  })

  test('all articles view shows unread articles before read articles', async () => {
    await sidebar.clickAllArticles()
    await articleList.waitForLoaded()

    const count = await articleList.getArticleCount()
    expect(count).toBe(3)

    const articles = articleList.articleItems

    const firstHasUnread = await articles.nth(0).locator('[data-testid="unread-indicator"]').isVisible()
    const secondHasUnread = await articles.nth(1).locator('[data-testid="unread-indicator"]').isVisible()
    const thirdHasUnread = await articles.nth(2).locator('[data-testid="unread-indicator"]').isVisible()

    expect(firstHasUnread).toBe(true)
    expect(secondHasUnread).toBe(true)
    expect(thirdHasUnread).toBe(false)
  })

  test('unread articles are sorted by time descending within their group', async () => {
    await sidebar.clickAllArticles()
    await articleList.waitForLoaded()

    const firstTitle = await articleList.getArticleTitle(0)
    const secondTitle = await articleList.getArticleTitle(1)

    expect(firstTitle).toContain('Understanding TypeScript Generics')
    expect(secondTitle).toContain('React 19 Released')
  })

  test('read articles appear after all unread articles', async () => {
    await sidebar.clickAllArticles()
    await articleList.waitForLoaded()

    const thirdTitle = await articleList.getArticleTitle(2)
    expect(thirdTitle).toContain('Building Desktop Apps with Tauri')

    const thirdClass = await articleList.articleItems.nth(2).getAttribute('class')
    expect(thirdClass).toContain('opacity-80')
  })

  test('single feed view keeps pure time order regardless of read status', async () => {
    await sidebar.selectFeed('Tech Blog')
    await articleList.waitForLoaded()

    const count = await articleList.getArticleCount()
    expect(count).toBe(2)

    const firstTitle = await articleList.getArticleTitle(0)
    const secondTitle = await articleList.getArticleTitle(1)

    expect(firstTitle).toContain('Understanding TypeScript Generics')
    expect(secondTitle).toContain('Building Desktop Apps with Tauri')
  })
})
