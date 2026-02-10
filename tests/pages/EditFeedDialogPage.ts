import { type Page, type Locator, expect } from '@playwright/test'

export class EditFeedDialogPage {
  readonly page: Page
  readonly dialogTitle: Locator
  readonly titleInput: Locator
  readonly urlInput: Locator
  readonly submitButton: Locator
  readonly cancelButton: Locator
  readonly errorText: Locator

  constructor(page: Page) {
    this.page = page
    this.dialogTitle = page.locator('h2', { hasText: '编辑订阅' })
    this.titleInput = page.locator('#edit-feed-title')
    this.urlInput = page.locator('#edit-feed-url')
    this.submitButton = page.locator('button[type="submit"]')
    this.cancelButton = page.locator('button', { hasText: '取消' })
    this.errorText = page.locator('p[class*="text-destructive"]')
  }

  async waitForOpen() {
    await expect(this.dialogTitle).toBeVisible({ timeout: 5000 })
    await expect(this.titleInput).toBeVisible()
    await expect(this.urlInput).toBeVisible()
  }

  async isOpen(): Promise<boolean> {
    return await this.dialogTitle.isVisible().catch(() => false)
  }

  async fillTitle(title: string) {
    await this.titleInput.clear()
    await this.titleInput.fill(title)
  }

  async fillUrl(url: string) {
    await this.urlInput.clear()
    await this.urlInput.fill(url)
  }

  async getTitleValue(): Promise<string> {
    return await this.titleInput.inputValue()
  }

  async getUrlValue(): Promise<string> {
    return await this.urlInput.inputValue()
  }

  async submit() {
    await this.submitButton.click()
  }

  async cancel() {
    await this.cancelButton.click()
    await expect(this.dialogTitle).toBeHidden({ timeout: 5000 })
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorText.isVisible().catch(() => false)) {
      return await this.errorText.textContent()
    }
    return null
  }

  async editAndSubmit(title?: string, url?: string) {
    await this.waitForOpen()
    if (title !== undefined) {
      await this.fillTitle(title)
    }
    if (url !== undefined) {
      await this.fillUrl(url)
    }
    await this.page.waitForTimeout(300)
    await this.submit()
  }
}
