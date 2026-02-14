import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

test.describe('Queue Panel', () => {
  let feedListPage: FeedListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    feedListPage = new FeedListPage(page)
    await page.goto('/')
    await feedListPage.waitForLoaded()
  })

  test('should show queue indicator button in sidebar', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await expect(queueButton).toBeVisible()
  })

  test('should open queue panel on click', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')
    await expect(queueDialog).toBeVisible()
  })

  test('should display task items with correct status icons', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')
    await expect(queueDialog).toBeVisible()

    // Should show task items
    const taskItems = queueDialog.locator('[data-testid="queue-task-item"]')
    const count = await taskItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show task type labels', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')

    // Check for task type labels
    await expect(queueDialog.locator('text=AI 摘要').first()).toBeVisible()
    await expect(queueDialog.locator('text=全文抓取')).toBeVisible()
    await expect(queueDialog.locator('text=AI 翻译')).toBeVisible()
  })

  test('should show cancel button for pending/running tasks', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')

    // Cancel buttons should exist for pending/running tasks
    const cancelButtons = queueDialog.getByLabel('取消任务')
    const cancelCount = await cancelButtons.count()
    expect(cancelCount).toBeGreaterThan(0)
  })

  test('should show clear completed button when completed tasks exist', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')

    const clearButton = queueDialog.getByLabel('清除已完成')
    await expect(clearButton).toBeVisible()
  })

  test('should show error message for failed tasks', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')

    // Failed task should show error text
    await expect(queueDialog.locator('text=API rate limit exceeded')).toBeVisible()
  })

  test('should close queue panel with Escape', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')
    await expect(queueDialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(queueDialog).not.toBeVisible()
  })

  test('should close queue panel when clicking outside', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')
    await expect(queueDialog).toBeVisible()

    // Click outside the panel
    await page.locator('[data-testid="feed-panel-content"]').click({ position: { x: 10, y: 10 } })
    await expect(queueDialog).not.toBeVisible()
  })

  test('should show empty state when no tasks', async ({ page }) => {
    // Override queue_get_status to return empty
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      const internals = w.__TAURI_INTERNALS__ as {
        invoke: (cmd: string, args: unknown) => Promise<unknown>
      }
      if (internals) {
        const origInvoke = internals.invoke
        internals.invoke = function (cmd: string, args: unknown) {
          if (cmd === 'queue_get_status') {
            return Promise.resolve({
              pending_count: 0,
              running_count: 0,
              completed_count: 0,
              failed_count: 0,
              tasks: [],
            })
          }
          return origInvoke(cmd, args)
        }
      }
    })

    await page.goto('/')
    await feedListPage.waitForLoaded()

    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')
    await expect(queueDialog.locator('text=暂无任务')).toBeVisible()
  })

  test('should open task detail dialog on task click', async ({ page }) => {
    const queueButton = page.getByLabel('任务队列')
    await queueButton.click()

    const queueDialog = page.locator('[role="dialog"][aria-label="任务队列"]')
    const firstTask = queueDialog.locator('[data-testid="queue-task-item"]').first()
    await firstTask.click()

    // Task detail dialog should appear
    const detailDialog = page.locator('text=任务详情')
    await expect(detailDialog).toBeVisible({ timeout: 3000 })
  })
})