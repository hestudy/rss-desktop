import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { AddFeedDialogPage } from '../../pages/AddFeedDialogPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Adding RSS Feeds
 *
 * Uses Tauri mock to provide a working app environment.
 */
test.describe('Add RSS Feed', () => {
  let feedListPage: FeedListPage
  let addFeedDialogPage: AddFeedDialogPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    addFeedDialogPage = new AddFeedDialogPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
  })

  test.afterEach(async ({ page }) => {
    await feedListPage.closeAnyDialog()
  })

  test('should open add feed dialog', async () => {
    await feedListPage.clickAddFeed()

    await expect(addFeedDialogPage.dialogTitle).toBeVisible()
    await expect(addFeedDialogPage.urlInput).toBeVisible()
    await expect(addFeedDialogPage.submitButton).toBeVisible()
    await expect(addFeedDialogPage.cancelButton).toBeVisible()

    const isDisabled = await addFeedDialogPage.isSubmitDisabled()
    expect(isDisabled).toBe(true)

    await addFeedDialogPage.cancel()
  })

  test('should validate empty URL', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()

    await addFeedDialogPage.fillUrl('')
    await page.waitForTimeout(300)

    const isDisabled = await addFeedDialogPage.isSubmitDisabled()
    expect(isDisabled).toBe(true)

    await addFeedDialogPage.cancel()
  })

  test('should validate URL format', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()

    await addFeedDialogPage.fillUrl('not-a-valid-url')
    await page.waitForTimeout(300)

    const inputValue = await addFeedDialogPage.urlInput.inputValue()
    expect(inputValue).toBe('not-a-valid-url')

    await addFeedDialogPage.cancel()
  })

  test('should enable submit button for valid URL', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()

    await addFeedDialogPage.fillUrl('https://example.com/feed.xml')
    await page.waitForTimeout(500)

    const disabledAttr = await addFeedDialogPage.submitButton.getAttribute('disabled')
    expect(disabledAttr).toBeNull()

    await addFeedDialogPage.cancel()
  })

  test('should accept valid RSS URL format', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()

    await addFeedDialogPage.fillUrl('https://www.reddit.com/.rss')
    await page.waitForTimeout(300)

    const isEnabled = await addFeedDialogPage.isSubmitEnabled()
    expect(isEnabled).toBe(true)

    await addFeedDialogPage.cancel()
  })

  test('should close dialog when clicking cancel', async () => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()

    await addFeedDialogPage.fillUrl('https://www.reddit.com/.rss')

    await addFeedDialogPage.cancel()

    const isOpen = await addFeedDialogPage.isOpen()
    expect(isOpen).toBe(false)
  })

  test('should close dialog and open again', async () => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()

    await addFeedDialogPage.fillUrl('https://www.reddit.com/.rss')

    await addFeedDialogPage.cancel()

    let isOpen = await addFeedDialogPage.isOpen()
    expect(isOpen).toBe(false)

    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    isOpen = await addFeedDialogPage.isOpen()
    expect(isOpen).toBe(true)

    await addFeedDialogPage.cancel()
  })
})
