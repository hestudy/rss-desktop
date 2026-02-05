import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Add Feed Dialog
 * Handles adding new RSS subscriptions
 */
export class AddFeedDialogPage {
  readonly page: Page
  readonly dialog: Locator
  readonly urlInput: Locator
  readonly submitButton: Locator
  readonly cancelButton: Locator
  readonly errorText: Locator
  readonly dialogTitle: Locator

  constructor(page: Page) {
    this.page = page
    this.dialog = page.locator('div').filter({ hasText: '添加 RSS 订阅' }).first()
    this.urlInput = page.locator('#feed-url')
    this.submitButton = page.locator('button[type="submit"]')
    this.cancelButton = page.locator('button', { hasText: '取消' })
    this.errorText = page.locator('p[class*="text-destructive"]')
    this.dialogTitle = page.locator('h2', { hasText: '添加 RSS 订阅' })
  }

  /**
   * Wait for the dialog to be visible
   */
  async waitForOpen() {
    await expect(this.dialogTitle).toBeVisible({ timeout: 5000 })
    await expect(this.urlInput).toBeVisible()
  }

  /**
   * Check if the dialog is open
   */
  async isOpen(): Promise<boolean> {
    return await this.dialogTitle.isVisible().catch(() => false)
  }

  /**
   * Fill in the feed URL
   */
  async fillUrl(url: string) {
    await this.urlInput.fill(url)
  }

  /**
   * Clear the URL input
   */
  async clearUrl() {
    await this.urlInput.clear()
  }

  /**
   * Submit the form
   */
  async submit() {
    await this.submitButton.click()
  }

  /**
   * Cancel the dialog
   */
  async cancel() {
    await this.cancelButton.click()
    // Wait for dialog to close
    await expect(this.dialogTitle).toBeHidden({ timeout: 5000 })
  }

  /**
   * Add a feed with the given URL
   */
  async addFeed(url: string) {
    await this.waitForOpen()
    await this.fillUrl(url)

    // Wait for input to be processed and button to be enabled
    await this.page.waitForTimeout(300)

    // Check if button is enabled before clicking
    const isEnabled = await this.isSubmitEnabled()
    if (!isEnabled) {
      throw new Error('Submit button is not enabled')
    }

    await this.submit()

    // Wait for dialog to close (successful add) or error to appear
    await Promise.race([
      this.dialogTitle.waitFor({ state: 'hidden', timeout: 30000 }),
      this.errorText.waitFor({ state: 'visible', timeout: 5000 }),
    ])
  }

  /**
   * Add a feed and wait for confirmation
   */
  async addFeedAndWait(url: string, timeout = 30000) {
    await this.waitForOpen()
    await this.fillUrl(url)
    await this.submit()

    // Wait for dialog to close
    await expect(this.dialogTitle).toBeHidden({ timeout })
  }

  /**
   * Get the error message if any
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorText.isVisible().catch(() => false)) {
      return await this.errorText.textContent()
    }
    return null
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    const disabled = await this.submitButton.getAttribute('disabled')
    return disabled !== null
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitEnabled(): Promise<boolean> {
    return !(await this.isSubmitDisabled())
  }

  /**
   * Get the submit button text
   */
  async getSubmitButtonText(): Promise<string> {
    return await this.submitButton.textContent() || ''
  }
}
