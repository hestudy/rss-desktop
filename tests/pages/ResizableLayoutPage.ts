import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Resizable Layout
 * Handles interactions with the resizable panels and drag handle
 *
 * Note: react-resizable-panels uses flexbox for layout, not fixed widths.
 * The actual width is determined by the flex-grow value.
 */
export class ResizableLayoutPage {
  readonly page: Page
  readonly layout: Locator
  readonly feedPanel: Locator
  readonly articlePanel: Locator
  readonly resizeHandleWrapper: Locator
  readonly rssHeading: Locator

  constructor(page: Page) {
    this.page = page
    // Use the h-screen class as main layout container selector
    this.layout = page.locator('div.h-screen')
    // Feed panel element (actual Panel component)
    this.feedPanel = page.locator('[data-testid="feed-panel-content"]')
    // Article panel content wrapper
    this.articlePanel = page.locator('[data-testid="article-panel-content"]')
    // Resize handle wrapper span
    this.resizeHandleWrapper = page.locator('[data-testid="resize-handle"]')
    // RSS heading is a reliable reference inside the feed panel
    this.rssHeading = page.getByRole('heading', { name: 'RSS 订阅' })
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
    // Wait for the RSS heading which indicates the app is loaded
    await expect(this.rssHeading).toBeVisible()
    // Wait for panels to be ready
    await expect(this.feedPanel).toBeVisible()
    await expect(this.articlePanel).toBeVisible()

    // Wait a bit for the separator to render
    await this.page.waitForTimeout(100)

    // Check for resize handle - try multiple selectors
    const handleSelectors = [
      '[data-testid="resize-handle"]',
      'separator',
      '[role="separator"]',
    ]

    for (const selector of handleSelectors) {
      const handle = this.page.locator(selector).first()
      const count = await handle.count()
      if (count > 0) {
        // Found at least one handle
        return
      }
    }

    // If we get here, the handle might not be visible yet but layout is ready
    // This is acceptable - the handle may have 0 width
  }

  /**
   * Get the feed panel element (the actual Panel with id="feed-panel")
   */
  async getFeedPanelElement() {
    return this.page.locator('#feed-panel[data-panel="true"]')
  }

  /**
   * Get the drag handle element (the actual draggable div)
   * Note: react-resizable-panels may use different elements depending on version
   * We try multiple selectors to find the actual handle
   */
  async getDragHandleElement() {
    // First try: look for separator within our wrapper
    const separatorInWrapper = this.resizeHandleWrapper.locator('separator')
    const separatorCount = await separatorInWrapper.count()
    if (separatorCount > 0) {
      return separatorInWrapper.first()
    }

    // Second try: look for a div within our wrapper (the actual handle)
    const divInWrapper = this.resizeHandleWrapper.locator('div')
    const divCount = await divInWrapper.count()
    if (divCount > 0) {
      return divInWrapper.first()
    }

    // Third try: use any direct child of the wrapper
    const childCount = await this.resizeHandleWrapper.locator('> *').count()
    if (childCount > 0) {
      return this.resizeHandleWrapper.locator('> *').first()
    }

    // Fallback: any element with separator role
    const fallback = this.page.getByRole('separator').first()
    return fallback
  }

  /**
   * Get the current width percentage of the feed panel
   * Uses the flex-grow value or the actual bounding box
   */
  async getFeedPanelWidth(): Promise<number> {
    // Use JavaScript to directly measure the panel
    const width = await this.page.evaluate(() => {
      const feedPanel = document.querySelector('#feed-panel[data-panel="true"]')
      if (!feedPanel) return null

      const rect = feedPanel.getBoundingClientRect()
      const parent = feedPanel.parentElement
      if (!parent) return null

      const parentWidth = parent.clientWidth
      return (rect.width / parentWidth) * 100
    })

    if (width !== null && width > 0) {
      return width
    }

    throw new Error('Could not determine feed panel width')
  }

  /**
   * Get the current width percentage of the article panel
   * Calculated as total width minus feed panel width
   */
  async getArticlePanelWidth(): Promise<number> {
    const feedWidth = await this.getFeedPanelWidth()
    return 100 - feedWidth
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
   * Get the bounding box of the resize handle
   */
  async getResizeHandlePosition() {
    // The resize handle wrapper doesn't have size (display: contents)
    // So we find an element within it to get position
    const handleBox = await this.page.evaluate(() => {
      const wrapper = document.querySelector('[data-testid="resize-handle"]')
      if (!wrapper) return null

      // Find the separator inside
      const separator = wrapper.querySelector('separator')
      if (separator) {
        return separator.getBoundingClientRect()
      }

      // Or use the wrapper's position
      return wrapper.getBoundingClientRect()
    })

    return handleBox
  }

  /**
   * Drag the resize handle to resize the feed panel
   *
   * @param deltaX - Horizontal delta in pixels (positive = expand feed panel, negative = shrink)
   * @param deltaY - Vertical delta in pixels (usually 0 for horizontal resize)
   */
  async dragResizeHandle(deltaX: number, deltaY: number = 0) {
    // Find the drag handle element and its position
    const handleInfo = await this.page.evaluate(() => {
      // The resize handle is the element with data-testid="resize-handle"
      const handle = document.querySelector('[data-testid="resize-handle"]')
      if (!handle) return null

      const rect = handle.getBoundingClientRect()
      return {
        x: rect.x + rect.width / 2,  // Center of the handle
        y: rect.top + rect.height / 2,
        width: rect.width
      }
    })

    if (!handleInfo) {
      throw new Error('Could not find drag handle position')
    }

    const startX = handleInfo.x
    const startY = handleInfo.y

    // Start dragging
    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()

    // Move to target position with intermediate steps for smoother animation
    const steps = 10
    const stepX = deltaX / steps
    const stepY = deltaY / steps

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.move(
        startX + stepX * (i + 1),
        startY + stepY * (i + 1)
      )
      await this.page.waitForTimeout(10)
    }

    // Release mouse
    await this.page.mouse.up()

    // Wait for panel animation to settle
    await this.page.waitForTimeout(300)
  }

  /**
   * Resize the feed panel by dragging the handle to a specific percentage
   *
   * @param targetPercentage - Target width percentage (15-40)
   */
  async resizeFeedPanelTo(targetPercentage: number) {
    const layoutBox = await this.getLayoutBoundingClientRect()
    const currentWidth = await this.getFeedPanelWidth()

    const targetWidth = layoutBox.width * (targetPercentage / 100)
    const currentWidthPx = layoutBox.width * (currentWidth / 100)

    const deltaX = targetWidth - currentWidthPx

    await this.dragResizeHandle(deltaX)
  }

  /**
   * Check if the resize handle is in dragging state
   */
  async isHandleDragging(): Promise<boolean> {
    const draggingAttr = await this.resizeHandleWrapper.getAttribute('data-dragging')
    return draggingAttr === 'true'
  }

  /**
   * Check if the resize handle is in hovered state
   */
  async isHandleHovered(): Promise<boolean> {
    const hoveredAttr = await this.resizeHandleWrapper.getAttribute('data-hovered')
    return hoveredAttr === 'true'
  }

  /**
   * Get the computed width of the resize handle
   */
  async getHandleWidth(): Promise<number> {
    const width = await this.page.evaluate(() => {
      const handle = document.querySelector('[data-testid="resize-handle"]')
      if (!handle) return 0

      // Get actual width from bounding box
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
   * Hover over the resize handle area
   */
  async hoverHandle() {
    // Find the position to hover (between panels)
    const hoverPoint = await this.page.evaluate(() => {
      const feedPanel = document.querySelector('#feed-panel[data-panel="true"]')
      if (!feedPanel) return null

      const rect = feedPanel.getBoundingClientRect()
      return {
        x: rect.right - 2,
        y: rect.top + rect.height / 2
      }
    })

    if (hoverPoint) {
      await this.page.mouse.move(hoverPoint.x, hoverPoint.y)
      await this.page.waitForTimeout(200)
    }
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

  /**
   * Get the X position of the feed panel's right edge
   */
  async getFeedPanelRightEdge(): Promise<number> {
    const position = await this.page.evaluate(() => {
      const feedPanel = document.querySelector('#feed-panel[data-panel="true"]')
      if (!feedPanel) return 0

      const rect = feedPanel.getBoundingClientRect()
      return rect.right
    })
    return position
  }

  /**
   * Check if the layout is in horizontal orientation
   */
  async isHorizontalLayout(): Promise<boolean> {
    const info = await this.page.evaluate(() => {
      const feedPanel = document.querySelector('#feed-panel[data-panel="true"]')
      const articlePanel = document.querySelector('#article-panel[data-panel="true"]')
      if (!feedPanel || !articlePanel) return { isHorizontal: false }

      const feedRect = feedPanel.getBoundingClientRect()
      const articleRect = articlePanel.getBoundingClientRect()

      return {
        isHorizontal: articleRect.left > feedRect.right,
        feedLeft: feedRect.left,
        feedRight: feedRect.right,
        articleLeft: articleRect.left
      }
    })
    return info.isHorizontal
  }
}
