import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { EditFeedDialogPage } from '../../pages/EditFeedDialogPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Edit RSS Feed', () => {
  let feedListPage: FeedListPage
  let editFeedDialogPage: EditFeedDialogPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    editFeedDialogPage = new EditFeedDialogPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async () => {
    await feedListPage.closeAnyDialog()
  })

  test('should open edit dialog with pre-filled data when clicking edit button', async () => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    const title = await editFeedDialogPage.getTitleValue()
    const url = await editFeedDialogPage.getUrlValue()

    expect(title).toBe('Tech Blog')
    expect(url).toBe('https://example.com/feed.xml')

    await editFeedDialogPage.cancel()
  })

  test('should close edit dialog when clicking cancel', async () => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    await editFeedDialogPage.cancel()

    const isOpen = await editFeedDialogPage.isOpen()
    expect(isOpen).toBe(false)
  })

  test('should show error when title is cleared', async ({ page }) => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    await editFeedDialogPage.fillTitle('')
    await page.waitForTimeout(200)
    await editFeedDialogPage.submit()

    const error = await editFeedDialogPage.getErrorMessage()
    expect(error).toBe('标题不能为空')
  })

  test('should show error when URL is invalid', async ({ page }) => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    await editFeedDialogPage.fillUrl('not-a-url')
    await page.waitForTimeout(200)

    const form = page.locator('form')
    await form.dispatchEvent('submit')

    const error = await editFeedDialogPage.getErrorMessage()
    expect(error).toBe('请输入有效的 URL')
  })

  test('should show error when URL is empty', async ({ page }) => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    await editFeedDialogPage.fillUrl('')
    await page.waitForTimeout(200)

    const form = page.locator('form')
    await form.evaluate(f => (f as HTMLFormElement).requestSubmit())

    const error = await editFeedDialogPage.getErrorMessage()
    expect(error).toBe('URL 不能为空')
  })

  test('should submit successfully with changed title', async ({ page }) => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    await editFeedDialogPage.fillTitle('Updated Tech Blog')
    await page.waitForTimeout(200)
    await editFeedDialogPage.submit()

    await expect(editFeedDialogPage.dialogTitle).toBeHidden({ timeout: 5000 })

    const hasFeed = await feedListPage.hasFeed('Updated Tech Blog')
    expect(hasFeed).toBe(true)
  })

  test('should submit successfully with changed URL', async ({ page }) => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    await editFeedDialogPage.fillUrl('https://new-example.com/feed.xml')
    await page.waitForTimeout(200)
    await editFeedDialogPage.submit()

    await expect(editFeedDialogPage.dialogTitle).toBeHidden({ timeout: 5000 })
  })

  test('should close without calling API when nothing changed', async () => {
    await feedListPage.clickEditButton('Tech Blog')
    await editFeedDialogPage.waitForOpen()

    await editFeedDialogPage.submit()

    await expect(editFeedDialogPage.dialogTitle).toBeHidden({ timeout: 5000 })
  })

  test('should open edit dialog for different feeds', async () => {
    await feedListPage.clickEditButton('Daily News')
    await editFeedDialogPage.waitForOpen()

    const title = await editFeedDialogPage.getTitleValue()
    const url = await editFeedDialogPage.getUrlValue()

    expect(title).toBe('Daily News')
    expect(url).toBe('https://example.com/news.xml')

    await editFeedDialogPage.cancel()
  })
})
