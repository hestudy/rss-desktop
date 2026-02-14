import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Resizable Layout (3-panel)
 * Handles interactions with the resizable panels and drag handles
 *
 * Updated for the new 3-panel layout:
 * [Sidebar] | [Article List] | [Reader]
 */
export class ResizableLayoutPage {
  readonly page: Page
  readonly layout: Locator
  readonly feedPanel: Locator
  readonly articlePanel: Locator
  readonly readerPanel: Locator
  readonly resizeHandleWrapper: Locator
  readonly resizeHandles: Locator
  readonly rssHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.layout = page.locator('[data-testid="resizable-layout"]')
    // Sidebar (feed) panel
    this.feedPanel = page.locator('[data-testid="feed-panel-content"]')
    // Article list panel (middle)
    this.articlePanel = page.locator('[data-testid="article-list-panel-content"]')
    // Reader panel (right)
    this.readerPanel = page.locator('[data-testid="reader-panel-content"]')
    // Resize handles - there are now 2 separators
    this.resizeHandleWrapper = page.locator('[data-testid="resize-handle"]').first()
    this.resizeHandles = page.locator('[role="separator"]')
    // RSS heading
    this.rssHeading = page.getByRole('heading', { name: 'RSS Reader' })
  }

  /**
   * Navigate to the app and wait for layout to be ready
   */
  async goto() {
    await this.page.goto('/')
    await this.waitForLayout()
  }

  /**
   * Wait for the resizable layout to be visible
   */
  async waitForLayout() {
    await expect(this.rssHeading).toBeVisible()
    await expect(this.feedPanel).toBeVisible()
    await expect(this.articlePanel).toBeVisible()
  }

  /**
   * Get the feed panel (sidebar) width percentage
   */
  async getFeedPanelWidth(): Promise<number> {
    const width = await this.page.evaluate(() => {
      const feedPanel = document.querySelector('[data-testid="feed-panel-content"]')
      if (!feedPanel) return null

      const rect = feedPanel.getBoundingClientRect()
      return (rect.width / window.innerWidth) * 100
    })

    if (width !== null && width > 0) {
      return width
    }

    throw new Error('Could not determine feed panel width')
  }

  /**
   * Get the article list panel width percentage
   */
  async getArticlePanelWidth(): Promise<number> {
    const width = await this.page.evaluate(() => {
      const panel = document.querySelector('[data-testid="article-list-panel-content"]')
      if (!panel) return null

      const rect = panel.getBoundingClientRect()
      return (rect.width / window.innerWidth) * 100
    })

    if (width !== null && width > 0) {
      return width
    }

    throw new Error('Could not determine article panel width')
  }

  /**
   * Get the reader panel width percentage
   */
  async getReaderPanelWidth(): Promise<number> {
    const width = await this.page.evaluate(() => {
      const panel = document.querySelector('[data-testid="reader-panel-content"]')
      if (!panel) return null

      const rect = panel.getBoundingClientRect()
      return (rect.width / window.innerWidth) * 100
    })

    if (width !== null && width > 0) {
      return width
    }

    throw new Error('Could not determine reader panel width')
  }

  /**
   * Get the layout bounding rect using JS
   */
  async getLayoutBoundingClientRect() {
    return await this.page.evaluate(() => {
      const body = document.body
      return {
        x: 0,
        y: 0,
        width: body.clientWidth,
        height: body.clientHeight,
      }
    })
  }

  /**
   * Get the bounding box of the first resize handle
   */
  async getResizeHandlePosition() {
    const handleBox = await this.page.evaluate(() => {
      const separator = document.querySelector('[role="separator"]')
      if (!separator) return null
      return separator.getBoundingClientRect()
    })

    return handleBox
  }

  /**
   * Drag a resize handle to resize panels
   *
   * @param deltaX - Horizontal delta in pixels
   * @param handleIndex - Which handle to drag (0 = first, 1 = second)
   */
  async dragResizeHandle(deltaX: number, handleIndex: number = 0) {
    const handleInfo = await this.page.evaluate((idx: number) => {
      const handles = document.querySelectorAll('[role="separator"]')
      const handle = handles[idx]
      if (!handle) return null

      const rect = handle.getBoundingClientRect()
      return {
        x: rect.x + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width
      }
    }, handleIndex)

    if (!handleInfo) {
      throw new Error('Could not find drag handle position')
    }

    const startX = handleInfo.x
    const startY = handleInfo.y

    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()

    const steps = 10
    const stepX = deltaX / steps

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.move(
        startX + stepX * (i + 1),
        startY
      )
      await this.page.waitForTimeout(10)
    }

    await this.page.mouse.up()
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if the resize handle is in hovered state
   */
  async isHandleHovered(): Promise<boolean> {
    const hoveredAttr = await this.resizeHandleWrapper.getAttribute('data-hovered')
    return hoveredAttr === 'true'
  }

  /**
   * Get the computed width of the first resize handle
   */
  async getHandleWidth(): Promise<number> {
    const width = await this.page.evaluate(() => {
      const handle = document.querySelector('[role="separator"]')
      if (!handle) return 0
      const rect = handle.getBoundingClientRect()
      return rect.width
    })
    return width
  }

  /**
   * Get the computed style width of the resize handle
   */
  async getHandleComputedStyleWidth(): Promise<number> {
    return await this.getHandleWidth()
  }

  /**
   * Check if the layout is in horizontal orientation
   */
  async isHorizontalLayout(): Promise<boolean> {
    const info = await this.page.evaluate(() => {
      const feedPanel = document.querySelector('[data-testid="feed-panel-content"]')
      const articlePanel = document.querySelector('[data-testid="article-list-panel-content"]')
      if (!feedPanel || !articlePanel) return { isHorizontal: false }

      const feedRect = feedPanel.getBoundingClientRect()
      const articleRect = articlePanel.getBoundingClientRect()

      return {
        isHorizontal: articleRect.left > feedRect.right - 10,
      }
    })
    return info.isHorizontal
  }

  /**
   * Take a screenshot of the current layout state
   */
  async screenshot(path: string) {
    await this.page.screenshot({
      path,
      fullPage: true,
    })
  }

  /**
   * Get the computed CSS variable value for the current theme
   */
  async getThemeColor(variableName: string): Promise<string> {
    return await this.page.evaluate((name) => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim()
    }, variableName)
  }
}
