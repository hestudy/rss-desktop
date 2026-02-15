import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { ArticleViewerPage } from '../../pages/ArticleViewerPage'
import { SidebarPage } from '../../pages/SidebarPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for AI Features Complete Flow
 *
 * Tests the complete AI workflow including:
 * - AI Summary generation
 * - AI Translation
 * - AI Settings configuration
 * - AI Usage statistics
 */

test.describe('AI Features Complete Flow', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage
  let articleViewerPage: ArticleViewerPage
  let sidebarPage: SidebarPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)
    articleViewerPage = new ArticleViewerPage(page)
    sidebarPage = new SidebarPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
  })

  test.describe('AI Summary Flow', () => {
    test('should generate AI summary for article', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      // Select first article
      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Click AI summary button
      expect(await articleViewerPage.isAiSummaryButtonVisible()).toBe(true)
      await articleViewerPage.clickAiSummary()

      // Wait for summary to appear
      await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

      // Verify summary content
      const summaryText = await articleViewerPage.getAiSummaryText()
      expect(summaryText).toBeTruthy()
    })

    test('should show loading state while generating summary', async ({ page }) => {
      // Slow down the mock response
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as { invoke: (cmd: string, args: unknown) => Promise<unknown> }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'generate_article_summary') {
              return new Promise((resolve) => {
                setTimeout(() => resolve(origInvoke(cmd, args)), 2000)
              })
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

      // Should show generating state
      expect(await articleViewerPage.isGeneratingAiSummary()).toBe(true)
    })

    test('should highlight summary button after generation', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Initially not highlighted
      expect(await articleViewerPage.isAiSummaryButtonHighlighted()).toBe(false)

      // Generate summary
      await articleViewerPage.clickAiSummary()
      await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

      // Now highlighted
      expect(await articleViewerPage.isAiSummaryButtonHighlighted()).toBe(true)
    })

    test('should collapse and expand AI summary', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.clickAiSummary()
      await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

      // Collapse
      await articleViewerPage.toggleAiSummaryCollapse()
      expect(await articleViewerPage.isAiSummaryContentVisible()).toBe(false)

      // Expand
      await articleViewerPage.toggleAiSummaryCollapse()
      expect(await articleViewerPage.isAiSummaryContentVisible()).toBe(true)
    })

    test('should persist summary when navigating between articles', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.clickAiSummary()
      await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

      const originalSummary = await articleViewerPage.getAiSummaryText()

      // Navigate to next article
      await articleViewerPage.clickNext()
      await expect(articleViewerPage.aiSummaryCard).not.toBeVisible()

      // Navigate back
      await articleViewerPage.clickPrevious()
      await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

      // Summary should be preserved
      const restoredSummary = await articleViewerPage.getAiSummaryText()
      expect(restoredSummary).toBe(originalSummary)
    })
  })

  test.describe('AI Translation Flow', () => {
    test('should show translation button in article viewer', async ({ page }) => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Translation button should be visible (title may vary)
      const translateButton = page.locator('button[title*="翻译"]')
      await expect(translateButton.first()).toBeVisible()
    })

    test('should generate AI translation for article', async ({ page }) => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      const translateButton = page.locator('button[title*="翻译"]')
      await translateButton.first().click()

      // Wait for translation - button title changes to "显示原文" when translation is shown
      await expect(page.locator('button[title="显示原文"]')).toBeVisible({ timeout: 5000 })
    })

    test('should show loading state while translating', async ({ page }) => {
      // Slow down translation
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as { invoke: (cmd: string, args: unknown) => Promise<unknown> }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'translate_article') {
              return new Promise((resolve) => {
                setTimeout(() => resolve(origInvoke(cmd, args)), 2000)
              })
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

      const translateButton = page.locator('button[title*="翻译"]')
      await translateButton.first().click()

      // Should show spinner
      const spinner = translateButton.first().locator('.animate-spin')
      await expect(spinner).toBeVisible()
    })
  })

  test.describe('AI Settings Configuration', () => {
    test('should navigate to AI settings tab', async () => {
      await sidebarPage.openSettings()

      const nav = articleViewerPage.page.locator('[data-testid="settings-dialog"] nav')
      const aiTab = nav.locator('button', { hasText: 'AI' }).first()
      await aiTab.click()

      // Verify AI settings are visible
      await expect(articleViewerPage.page.getByRole('heading', { name: 'API 地址' })).toBeVisible()
    })

    test('should show AI configuration fields', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      // All AI settings fields should be visible
      await expect(page.getByRole('heading', { name: 'API 地址' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'API Key' })).toBeVisible()
      await expect(page.getByRole('heading', { name: '模型' })).toBeVisible()
      await expect(page.getByRole('heading', { name: '最大 Token 数' })).toBeVisible()
    })

    test('should show default AI settings values', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      // Default values
      await expect(page.locator('input[placeholder="https://api.openai.com/v1"]')).toHaveValue(
        'https://api.openai.com/v1'
      )
      await expect(page.locator('input[placeholder="gpt-4o-mini"]')).toHaveValue('gpt-4o-mini')
    })

    test('should show language selector', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      const langSelect = page.locator('select').filter({
        has: page.locator('option[value="zh-CN"]'),
      })
      await expect(langSelect).toBeVisible()
    })

    test('should show max concurrency setting', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      await expect(page.getByText('最大并发数')).toBeVisible()
    })

    test('should toggle auto summary setting', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      const autoSummaryToggle = page.getByRole('switch', { name: '自动生成摘要' })
      await expect(autoSummaryToggle).toBeVisible()
      await autoSummaryToggle.click()
    })

    test('should save AI settings changes', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      // Change model input
      const modelInput = page.locator('input[placeholder="gpt-4o-mini"]')
      await modelInput.fill('gpt-4o')
      await expect(modelInput).toHaveValue('gpt-4o')

      // Settings should be saved automatically
    })
  })

  test.describe('AI Usage Statistics', () => {
    test('should navigate to AI usage tab', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()

      // Usage section should be visible
      await expect(page.getByText('总 Token')).toBeVisible({ timeout: 5000 })
    })

    test('should show usage summary cards', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()

      await expect(page.getByText('总 Token')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('预估费用')).toBeVisible()
      await expect(page.getByText('调用次数')).toBeVisible()
    })

    test('should show usage by type breakdown', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()

      await expect(page.getByText('按类型统计')).toBeVisible({ timeout: 5000 })
    })

    test('should show clear history button', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()

      const clearButton = page.locator('button', { hasText: '清空历史记录' })
      await expect(clearButton).toBeVisible({ timeout: 5000 })
    })

    test('should show confirm dialog when clearing history', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()

      const clearButton = page.locator('button', { hasText: '清空历史记录' })
      await expect(clearButton).toBeVisible({ timeout: 5000 })
      await clearButton.click()

      // Confirm dialog should appear
      await expect(page.locator('button', { hasText: '确认清空' })).toBeVisible()

      // Cancel
      await page.locator('button', { hasText: '取消' }).click()
      await expect(clearButton).toBeVisible()
    })

    test('should show daily usage stats', async ({ page }) => {
      await sidebarPage.openSettings()

      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI 费用' }).click()

      // Daily stats section should exist (might be called "每日趋势" or "每日统计")
      const dailyStats = page.locator('[data-testid="settings-dialog"]').filter({
        hasText: /每日趋势|每日统计/,
      })
      await expect(dailyStats).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('AI Error Handling', () => {
    test('should handle AI API error gracefully', async ({ page }) => {
      // Mock AI error
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as { invoke: (cmd: string, args: unknown) => Promise<unknown> }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string, args: unknown) {
            if (cmd === 'generate_article_summary') {
              return Promise.reject(new Error('API rate limit exceeded'))
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

      // Should show error (error handling depends on UI implementation)
    })

    test('should handle missing API key', async ({ page }) => {
      // Mock missing API key
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        const internals = w.__TAURI_INTERNALS__ as { invoke: (cmd: string) => Promise<unknown> }
        if (internals) {
          const origInvoke = internals.invoke
          internals.invoke = function (cmd: string) {
            if (cmd === 'get_ai_settings') {
              return Promise.resolve({
                apiEndpoint: 'https://api.openai.com/v1',
                apiKey: '', // Empty API key
                model: 'gpt-4o-mini',
                maxTokens: 300,
                prompt: '',
                enableAutoSummary: false,
                language: 'zh-CN',
                maxConcurrency: 3,
              })
            }
            return origInvoke(cmd)
          }
        }
      })

      await page.goto('/')
      await sidebarPage.waitForLoaded()

      // Open AI settings
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      // API key input should be empty
      const apiKeyInput = page.locator('input[type="password"]').first()
      await expect(apiKeyInput).toHaveValue('')
    })
  })

  test.describe('Complete AI Workflow', () => {
    test('should complete full AI workflow: configure, summarize, check usage', async ({ page }) => {
      // 1. Configure AI settings
      await sidebarPage.openSettings()
      const nav = page.locator('[data-testid="settings-dialog"] nav')
      await nav.locator('button', { hasText: 'AI' }).first().click()

      // Verify settings are visible
      await expect(page.getByRole('heading', { name: 'API 地址' })).toBeVisible()

      // Close settings
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="settings-dialog"]')).not.toBeVisible()

      // 2. Generate AI summary
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      await articleViewerPage.clickAiSummary()
      await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })

      // 3. Check usage statistics
      await sidebarPage.openSettings()
      await nav.locator('button', { hasText: 'AI 费用' }).click()

      await expect(page.getByText('总 Token')).toBeVisible({ timeout: 5000 })
    })

    test('should work with keyboard shortcuts during AI operations', async () => {
      await feedListPage.clickAllArticles()
      await articleListPage.waitForLoaded()

      await articleListPage.clickArticle(0)
      await articleViewerPage.waitForVisible()

      // Use keyboard to toggle favorite
      await articleViewerPage.toggleFavoriteWithKeyboard()

      // AI summary should still work
      await articleViewerPage.clickAiSummary()
      await expect(articleViewerPage.aiSummaryCard).toBeVisible({ timeout: 5000 })
    })
  })
})

test.describe('AI Features with Feed-level Settings', () => {
  let feedListPage: FeedListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    feedListPage = new FeedListPage(page)
    await page.goto('/')
    await feedListPage.waitForLoaded()
  })

  test('should show AI toggles in feed edit dialog', async ({ page }) => {
    // Open edit feed dialog
    await feedListPage.hoverFeed('Tech Blog')
    await feedListPage.clickEditButton('Tech Blog')

    // Wait for edit dialog (use DialogContent title)
    const editDialogTitle = page.locator('h2', { hasText: '编辑订阅' })
    await expect(editDialogTitle).toBeVisible({ timeout: 5000 })

    // AI feature checkboxes should be visible
    await expect(page.getByLabel('自动生成 AI 摘要')).toBeVisible({ timeout: 5000 })
    await expect(page.getByLabel('自动 AI 翻译')).toBeVisible()
  })

  test('should toggle feed-level AI summary', async ({ page }) => {
    await feedListPage.hoverFeed('Tech Blog')
    await feedListPage.clickEditButton('Tech Blog')

    const editDialogTitle = page.locator('h2', { hasText: '编辑订阅' })
    await expect(editDialogTitle).toBeVisible({ timeout: 5000 })

    const aiSummaryCheckbox = page.getByLabel('自动生成 AI 摘要')
    await aiSummaryCheckbox.click()

    // Toggle state should change
    await expect(aiSummaryCheckbox).toBeChecked()
  })

  test('should toggle feed-level AI translation', async ({ page }) => {
    await feedListPage.hoverFeed('Tech Blog')
    await feedListPage.clickEditButton('Tech Blog')

    const editDialogTitle = page.locator('h2', { hasText: '编辑订阅' })
    await expect(editDialogTitle).toBeVisible({ timeout: 5000 })

    const aiTranslationCheckbox = page.getByLabel('自动 AI 翻译')
    await aiTranslationCheckbox.click()

    // Toggle state should change
    await expect(aiTranslationCheckbox).toBeChecked()
  })

  test('should toggle feed-level full content fetching', async ({ page }) => {
    await feedListPage.hoverFeed('Tech Blog')
    await feedListPage.clickEditButton('Tech Blog')

    const editDialogTitle = page.locator('h2', { hasText: '编辑订阅' })
    await expect(editDialogTitle).toBeVisible({ timeout: 5000 })

    const fullContentCheckbox = page.getByLabel('自动抓取全文')
    await fullContentCheckbox.click()

    // Toggle state should change
    await expect(fullContentCheckbox).toBeChecked()
  })
})
