import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('AI Summary', () => {
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

  test('should show AI summary button in toolbar', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    expect(await articleViewerPage.isAiSummaryButtonVisible()).toBe(true)
  })

  test('should generate and display AI summary when button is clicked', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    expect(await articleViewerPage.isAiSummaryCardVisible()).toBe(false)

    await articleViewerPage.clickAiSummary()
    await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

    expect(await articleViewerPage.isAiSummaryCardVisible()).toBe(true)

    const summaryText = await articleViewerPage.getAiSummaryText()
    expect(summaryText).toContain('技术主题')
  })

  test('should highlight AI summary button after summary is generated', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    expect(await articleViewerPage.isAiSummaryButtonHighlighted()).toBe(false)

    await articleViewerPage.clickAiSummary()
    await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

    expect(await articleViewerPage.isAiSummaryButtonHighlighted()).toBe(true)
  })

  test('should collapse and expand AI summary card', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    await articleViewerPage.clickAiSummary()
    await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

    expect(await articleViewerPage.isAiSummaryContentVisible()).toBe(true)

    await articleViewerPage.toggleAiSummaryCollapse()
    expect(await articleViewerPage.isAiSummaryContentVisible()).toBe(false)

    await articleViewerPage.toggleAiSummaryCollapse()
    expect(await articleViewerPage.isAiSummaryContentVisible()).toBe(true)
  })

  test('should persist summary when switching articles and coming back', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    await articleViewerPage.clickAiSummary()
    await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

    expect(await articleViewerPage.isAiSummaryCardVisible()).toBe(true)

    await articleViewerPage.clickNext()
    await expect(articleViewerPage.aiSummaryCard).not.toBeVisible()

    expect(await articleViewerPage.isAiSummaryCardVisible()).toBe(false)

    await articleViewerPage.clickPrevious()
    await expect(articleViewerPage.aiSummaryCard).toBeVisible()

    expect(await articleViewerPage.isAiSummaryCardVisible()).toBe(true)
    const summaryText = await articleViewerPage.getAiSummaryText()
    expect(summaryText).toContain('技术主题')
  })

  test('should show loading spinner while generating summary', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      const internals = w.__TAURI_INTERNALS__ as { invoke: (cmd: string, args: unknown) => Promise<unknown> }
      if (internals) {
        const origInvoke = internals.invoke
        internals.invoke = function (cmd: string, args: unknown) {
          if (cmd === 'generate_article_summary') {
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

    await articleViewerPage.clickAiSummary()

    expect(await articleViewerPage.isGeneratingAiSummary()).toBe(true)
  })

  test('should show AI tab in settings panel', async () => {
    await articleListPage.clickArticle(0)
    await articleViewerPage.waitForVisible()

    await articleViewerPage.openSettings()

    const aiTab = articleViewerPage.page.getByRole('button', { name: 'AI', exact: true })
    await expect(aiTab).toBeVisible()

    await aiTab.click()
    await expect(articleViewerPage.page.locator('input[placeholder="https://api.openai.com/v1"]')).toBeVisible()

    await expect(articleViewerPage.page.locator('input[placeholder="sk-..."]')).toBeVisible()
    await expect(articleViewerPage.page.locator('input[placeholder="gpt-4o-mini"]')).toBeVisible()
  })
})
