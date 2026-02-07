import { test, expect } from '@playwright/test'
import { ResizableLayoutPage } from '../../pages/ResizableLayoutPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Resizable Layout (三栏布局拖拽调整宽度)
 *
 * Updated for the new 3-panel layout:
 * [Sidebar] | [Article List] | [Reader]
 */
test.describe('Resizable Layout - 基础布局', () => {
  let layoutPage: ResizableLayoutPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    layoutPage = new ResizableLayoutPage(page)
    await layoutPage.goto()
  })

  test('should render all layout components', async ({ page }) => {
    await expect(layoutPage.rssHeading).toBeVisible()
    await expect(layoutPage.feedPanel).toBeVisible()
    await expect(layoutPage.articlePanel).toBeVisible()
    await expect(layoutPage.readerPanel).toBeVisible()
  })

  test('should have feed panel width within valid range', async () => {
    const feedPanelWidth = await layoutPage.getFeedPanelWidth()
    expect(feedPanelWidth).toBeGreaterThan(0)
  })

  test('should have correct panel positions (sidebar left, article middle, reader right)', async () => {
    const feedBox = await layoutPage.feedPanel.boundingBox()
    const articleBox = await layoutPage.articlePanel.boundingBox()
    const readerBox = await layoutPage.readerPanel.boundingBox()

    expect(feedBox).toBeTruthy()
    expect(articleBox).toBeTruthy()
    expect(readerBox).toBeTruthy()

    // Sidebar should be on the left
    expect(feedBox!.x).toBeLessThan(articleBox!.x)

    // Article list should be in the middle
    expect(articleBox!.x).toBeLessThan(readerBox!.x)
  })

  test('should have three panels with positive widths', async () => {
    const feedBox = await layoutPage.feedPanel.boundingBox()
    const articleBox = await layoutPage.articlePanel.boundingBox()
    const readerBox = await layoutPage.readerPanel.boundingBox()

    expect(feedBox!.width).toBeGreaterThan(0)
    expect(articleBox!.width).toBeGreaterThan(0)
    expect(readerBox!.width).toBeGreaterThan(0)
  })
})

test.describe('Resizable Layout - 拖拽功能', () => {
  let layoutPage: ResizableLayoutPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    layoutPage = new ResizableLayoutPage(page)
    await layoutPage.goto()
  })

  test('should have two resize handles between three panels', async ({ page }) => {
    const handleCount = await layoutPage.resizeHandles.count()
    expect(handleCount).toBe(2)
  })

  test('drag handles should exist and be positioned between panels', async () => {
    const feedBox = await layoutPage.feedPanel.boundingBox()
    const articleBox = await layoutPage.articlePanel.boundingBox()
    const readerBox = await layoutPage.readerPanel.boundingBox()

    const handle1Box = await layoutPage.resizeHandles.nth(0).boundingBox()
    const handle2Box = await layoutPage.resizeHandles.nth(1).boundingBox()

    expect(handle1Box).toBeTruthy()
    expect(handle2Box).toBeTruthy()

    // First handle between sidebar and article list
    expect(handle1Box!.x).toBeGreaterThanOrEqual(feedBox!.x + feedBox!.width - 2)
    expect(handle1Box!.x).toBeLessThanOrEqual(articleBox!.x + 2)

    // Second handle between article list and reader
    expect(handle2Box!.x).toBeGreaterThanOrEqual(articleBox!.x + articleBox!.width - 2)
    expect(handle2Box!.x).toBeLessThanOrEqual(readerBox!.x + 2)
  })

  test('should be able to interact with drag handle', async ({ page }) => {
    const handleInfo = await page.evaluate(() => {
      const handle = document.querySelector('[role="separator"]')
      if (!handle) return null

      const rect = handle.getBoundingClientRect()
      return {
        exists: true,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        pointerEvents: getComputedStyle(handle).pointerEvents
      }
    })

    expect(handleInfo).toBeTruthy()
    expect(handleInfo!.exists).toBe(true)
    expect(handleInfo!.width).toBeGreaterThan(0)
    expect(handleInfo!.height).toBeGreaterThan(0)
    expect(handleInfo!.pointerEvents).not.toBe('none')
  })
})

test.describe('Resizable Layout - 视觉反馈', () => {
  let layoutPage: ResizableLayoutPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    layoutPage = new ResizableLayoutPage(page)
    await layoutPage.goto()
  })

  test('drag handle should have default width of 4px', async () => {
    const handleWidth = await layoutPage.getHandleComputedStyleWidth()
    // Default width should be 4px (allow small margin)
    expect(handleWidth).toBeGreaterThan(3)
    expect(handleWidth).toBeLessThan(5)
  })

  test('drag handle should be visible in light theme', async ({ page }) => {
    const handleInfo = await page.evaluate(() => {
      const handle = document.querySelector('[role="separator"]')
      if (!handle) return null

      const rect = handle.getBoundingClientRect()
      return {
        width: rect.width,
        height: rect.height
      }
    })

    expect(handleInfo).toBeTruthy()
    expect(handleInfo!.width).toBeGreaterThan(0)
    expect(handleInfo!.height).toBeGreaterThan(0)
  })
})

test.describe('Resizable Layout - 截图测试', () => {
  let layoutPage: ResizableLayoutPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())
    layoutPage = new ResizableLayoutPage(page)
    await layoutPage.goto()
  })

  test('should capture default layout screenshot', async () => {
    await layoutPage.screenshot('test-results/default-layout.png')
  })

  test('should capture layout screenshot after drag attempt', async () => {
    await layoutPage.dragResizeHandle(100, 0)
    await layoutPage.screenshot('test-results/after-drag-attempt.png')
  })
})
