import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Fetch Full Content', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()

    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()
  })

  test('should show fetch full content button in toolbar', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    expect(await articleViewerPage.isFetchFullContentButtonVisible()).toBe(true)
  })

  test('should fetch and display full content when button is clicked', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    const originalContent = await articleViewerPage.getArticleContent()

    await articleViewerPage.clickFetchFullContent()
    await articleViewerPage.page.waitForTimeout(1000)

    const updatedContent = await articleViewerPage.getArticleContent()
    expect(updatedContent).toContain('Full Article Content')
    expect(updatedContent).not.toBe(originalContent)
  })

  test('should persist full content when switching articles and coming back', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    await articleViewerPage.clickFetchFullContent()
    await articleViewerPage.page.waitForTimeout(1000)

    const fetchedContent = await articleViewerPage.getArticleContent()
    expect(fetchedContent).toContain('Full Article Content')

    await articleViewerPage.clickNext()
    await articleViewerPage.page.waitForTimeout(500)

    const nextContent = await articleViewerPage.getArticleContent()
    expect(nextContent).not.toContain('Full Article Content')

    await articleViewerPage.clickPrevious()
    await articleViewerPage.page.waitForTimeout(500)

    const restoredContent = await articleViewerPage.getArticleContent()
    expect(restoredContent).toContain('Full Article Content')
  })

  test('should show loading spinner while fetching', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      const internals = w.__TAURI_INTERNALS__ as { invoke: (cmd: string, args: unknown) => Promise<unknown> }
      if (internals) {
        const origInvoke = internals.invoke
        internals.invoke = function (cmd: string, args: unknown) {
          if (cmd === 'fetch_full_content') {
            return new Promise((resolve) => setTimeout(() => resolve(origInvoke(cmd, args)), 2000))
          }
          return origInvoke(cmd, args)
        }
      }
    })

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.clickAllArticles()
    await articleListPage.waitForLoaded()

    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    await articleViewerPage.clickFetchFullContent()

    expect(await articleViewerPage.isFetchingContent()).toBe(true)
  })

  test('should show toggle button after fetching full content', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    expect(await articleViewerPage.isToggleContentButtonVisible()).toBe(false)

    await articleViewerPage.clickFetchFullContent()
    await articleViewerPage.page.waitForTimeout(1000)

    expect(await articleViewerPage.isToggleContentButtonVisible()).toBe(true)
    expect(await articleViewerPage.getToggleContentButtonTitle()).toBe('切换为原始内容')
  })

  test('should toggle between original and full content', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    const originalContent = await articleViewerPage.getArticleContent()

    await articleViewerPage.clickFetchFullContent()
    await articleViewerPage.page.waitForTimeout(1000)

    const fullContent = await articleViewerPage.getArticleContent()
    expect(fullContent).toContain('Full Article Content')
    expect(fullContent).not.toBe(originalContent)

    await articleViewerPage.clickToggleContent()

    const toggledContent = await articleViewerPage.getArticleContent()
    expect(toggledContent).not.toContain('Full Article Content')

    expect(await articleViewerPage.getToggleContentButtonTitle()).toBe('切换为全文内容')

    await articleViewerPage.clickToggleContent()

    const toggledBack = await articleViewerPage.getArticleContent()
    expect(toggledBack).toContain('Full Article Content')
  })
})
