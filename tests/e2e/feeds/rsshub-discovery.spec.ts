import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { AddFeedDialogPage } from '../../pages/AddFeedDialogPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for RSSHub Discovery
 *
 * Tests the RSSHub integration for discovering and adding RSS feeds.
 */
test.describe('RSSHub Discovery', () => {
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

  test.afterEach(async () => {
    await feedListPage.closeAnyDialog()
  })

  test('should open RSSHub discovery dialog from add feed dialog', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()

    // 查找 RSSHub 按钮
    const rsshubButton = page.getByRole('button', { name: /RSSHub/i })
    await expect(rsshubButton).toBeVisible()

    await rsshubButton.click()

    // 验证 RSSHub 发现对话框打开
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('RSSHub 发现')).toBeVisible()
  })

  test('should show URL detection tab by default', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 验证 URL 检测 Tab 是默认选中的
    const detectTab = page.getByRole('tab', { name: /URL 检测/ })
    await expect(detectTab).toHaveAttribute('aria-selected', 'true')

    // 验证 URL 输入框存在
    const urlInput = page.getByPlaceholder(/输入网站 URL/)
    await expect(urlInput).toBeVisible()
  })

  test('should switch to platform search tab', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 切换到平台搜索 Tab
    const searchTab = page.getByRole('tab', { name: /平台搜索/ })
    await searchTab.click()

    await expect(searchTab).toHaveAttribute('aria-selected', 'true')

    // 验证搜索输入框存在
    const searchInput = page.getByPlaceholder(/搜索平台/)
    await expect(searchInput).toBeVisible()
  })

  test('should detect feeds from Bilibili URL', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 输入 Bilibili URL
    const urlInput = page.getByPlaceholder(/输入网站 URL/)
    await urlInput.fill('https://space.bilibili.com/123456')

    // 点击检测按钮
    const detectButton = page.getByRole('button', { name: '检测' })
    await detectButton.click()

    // 等待检测结果
    await expect(page.getByText('UP 主视频')).toBeVisible({ timeout: 5000 })

    // 验证检测到的订阅数量显示
    await expect(page.getByText(/检测到.*个订阅/)).toBeVisible()
  })

  test('should show no results message for unknown URL', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 输入未知 URL
    const urlInput = page.getByPlaceholder(/输入网站 URL/)
    await urlInput.fill('https://example.com/unknown')

    // 点击检测按钮
    const detectButton = page.getByRole('button', { name: '检测' })
    await detectButton.click()

    // 等待无结果提示
    await expect(page.getByText(/未检测到/)).toBeVisible({ timeout: 5000 })
  })

  test('should search for routes', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 切换到平台搜索 Tab
    await page.getByRole('tab', { name: /平台搜索/ }).click()

    // 输入搜索关键词
    const searchInput = page.getByPlaceholder(/搜索平台/)
    await searchInput.fill('bilibili')

    // 等待搜索结果（有防抖）
    await page.waitForTimeout(500)

    // 验证搜索结果显示
    await expect(page.getByText('UP 主视频')).toBeVisible({ timeout: 5000 })
  })

  test('should show parameter input badge for routes with params', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 切换到平台搜索 Tab
    await page.getByRole('tab', { name: /平台搜索/ }).click()

    // 搜索需要参数的路由
    const searchInput = page.getByPlaceholder(/搜索平台/)
    await searchInput.fill('github')
    await page.waitForTimeout(500)

    // 验证参数提示显示
    await expect(page.getByText(/需填写参数/)).toBeVisible({ timeout: 5000 })
  })

  test('should show parameter input dialog when adding route with params', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 切换到平台搜索 Tab 并搜索
    await page.getByRole('tab', { name: /平台搜索/ }).click()
    const searchInput = page.getByPlaceholder(/搜索平台/)
    await searchInput.fill('bilibili')
    await page.waitForTimeout(500)

    // 等待搜索结果
    await expect(page.getByText('UP 主视频')).toBeVisible({ timeout: 5000 })

    // 点击添加按钮
    const addButton = page.getByRole('button', { name: /添加/ }).first()
    await addButton.click()

    // 验证参数输入对话框出现
    await expect(page.getByText('填写路由参数')).toBeVisible({ timeout: 5000 })
  })

  test('should close dialog when clicking close button', async ({ page }) => {
    await feedListPage.clickAddFeed()
    await addFeedDialogPage.waitForOpen()
    await page.getByRole('button', { name: /RSSHub/i }).click()

    // 验证对话框打开
    await expect(page.getByText('RSSHub 发现')).toBeVisible()

    // 点击关闭按钮
    const closeButton = page.getByRole('button', { name: '关闭' })
    await closeButton.click()

    // 验证对话框关闭
    await expect(page.getByText('RSSHub 发现')).not.toBeVisible()
  })
})
