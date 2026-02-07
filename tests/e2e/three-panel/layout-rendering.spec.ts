import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/SidebarPage'
import { ArticleListPanelPage } from '../../pages/ArticleListPanelPage'
import { ReaderPanelPage } from '../../pages/ReaderPanelPage'
import { buildTauriMockScript } from '../../fixtures/tauri-mock'

/**
 * Journey 1: Three-Panel Layout Rendering
 *
 * Verifies the new 3-panel layout renders correctly:
 * - Sidebar (left) | Article List (middle) | Reader (right)
 * - Empty reader placeholder when no article selected
 * - Resize handles between panels
 * - Panels have proper dimensions and positions
 */
test.describe('Journey 1: Three-Panel Layout Rendering', () => {
  let sidebar: SidebarPage
  let articleList: ArticleListPanelPage
  let reader: ReaderPanelPage

  test.beforeEach(async ({ page }) => {
    // Inject Tauri mock before navigating
    await page.addInitScript(buildTauriMockScript())

    sidebar = new SidebarPage(page)
    articleList = new ArticleListPanelPage(page)
    reader = new ReaderPanelPage(page)

    await page.goto('/')
    await sidebar.waitForLoaded()
  })

  test('all three panels should be visible', async ({ page }) => {
    // Sidebar panel
    await expect(sidebar.panelContent).toBeVisible()

    // Article list panel
    await expect(articleList.panelContent).toBeVisible()

    // Reader panel
    await expect(reader.panelContent).toBeVisible()
  })

  test('panels should be arranged left-to-right in correct order', async ({ page }) => {
    const sidebarBox = await sidebar.panelContent.boundingBox()
    const articleListBox = await articleList.panelContent.boundingBox()
    const readerBox = await reader.panelContent.boundingBox()

    expect(sidebarBox).toBeTruthy()
    expect(articleListBox).toBeTruthy()
    expect(readerBox).toBeTruthy()

    // Sidebar should be leftmost
    expect(sidebarBox!.x).toBeLessThan(articleListBox!.x)

    // Article list should be in the middle
    expect(articleListBox!.x).toBeLessThan(readerBox!.x)

    // All panels should have positive width
    expect(sidebarBox!.width).toBeGreaterThan(0)
    expect(articleListBox!.width).toBeGreaterThan(0)
    expect(readerBox!.width).toBeGreaterThan(0)
  })

  test('empty reader placeholder should show when no article selected', async ({ page }) => {
    // No article is selected by default, so placeholder should be visible
    const isPlaceholderVisible = await reader.isEmptyPlaceholderVisible()
    expect(isPlaceholderVisible).toBe(true)

    // Placeholder should contain the expected text
    await expect(reader.emptyPlaceholderTitle).toBeVisible()
    await expect(reader.emptyPlaceholderSubtitle).toBeVisible()

    // Article viewer should NOT be showing
    const isArticleVisible = await reader.isArticleVisible()
    expect(isArticleVisible).toBe(false)
  })

  test('resize handles should be present between panels', async ({ page }) => {
    // react-resizable-panels Separator renders as role="separator"
    // The data-testid is set to the id prop value by the library internals,
    // so "resize-handle-1" and "resize-handle-2" instead of "resize-handle"
    const resizeHandles = page.locator('[role="separator"]')
    const handleCount = await resizeHandles.count()
    expect(handleCount).toBe(2)

    // Each handle should be visible and positioned between panels
    for (let i = 0; i < handleCount; i++) {
      const handle = resizeHandles.nth(i)
      await expect(handle).toBeVisible()

      const box = await handle.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(0)
      expect(box!.height).toBeGreaterThan(0)
    }
  })

  test('resize handles should be positioned between the correct panels', async ({ page }) => {
    const sidebarBox = await sidebar.panelContent.boundingBox()
    const articleListBox = await articleList.panelContent.boundingBox()
    const readerBox = await reader.panelContent.boundingBox()

    const resizeHandles = page.locator('[role="separator"]')

    // First handle: between sidebar and article list
    const handle1Box = await resizeHandles.nth(0).boundingBox()
    expect(handle1Box).toBeTruthy()
    // Handle should be at or near the right edge of sidebar
    expect(handle1Box!.x).toBeGreaterThanOrEqual(sidebarBox!.x + sidebarBox!.width - 2)
    expect(handle1Box!.x).toBeLessThanOrEqual(articleListBox!.x + 2)

    // Second handle: between article list and reader
    const handle2Box = await resizeHandles.nth(1).boundingBox()
    expect(handle2Box).toBeTruthy()
    expect(handle2Box!.x).toBeGreaterThanOrEqual(articleListBox!.x + articleListBox!.width - 2)
    expect(handle2Box!.x).toBeLessThanOrEqual(readerBox!.x + 2)
  })

  test('layout should fill the entire viewport height', async ({ page }) => {
    const viewportSize = page.viewportSize()
    expect(viewportSize).toBeTruthy()

    // The resizable layout Group renders with h-screen class
    // Use data-testid which is on the Group component
    const layoutHeight = await page.evaluate(() => {
      // Find the h-screen container (Group renders its own div)
      const el = document.querySelector('.h-screen')
      if (!el) return 0
      return el.getBoundingClientRect().height
    })

    // Layout height should match viewport height
    expect(layoutHeight).toBeCloseTo(viewportSize!.height, -1)
  })

  test('sidebar should display with dark background (sidebar-bg class)', async ({ page }) => {
    // The sidebar container has bg-sidebar-bg class
    const sidebarBg = sidebar.panelContent.locator('div.bg-sidebar-bg').first()
    await expect(sidebarBg).toBeVisible()
  })

  test('article list should have a right border separating it from reader', async ({ page }) => {
    // Article list container has border-r class
    const articleListContainer = articleList.panelContent.locator('div.border-r').first()
    await expect(articleListContainer).toBeVisible()
  })

  test('should capture screenshot of default three-panel layout', async ({ page }) => {
    await page.screenshot({
      path: 'test-results/three-panel-default.png',
      fullPage: true,
    })
  })
})
