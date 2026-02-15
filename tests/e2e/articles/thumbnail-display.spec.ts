import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'
import { ArticleListPage } from '../../pages/ArticleListPage'
import { buildTauriMockScript, getMockArticles } from '../../fixtures/tauri-mock'

/**
 * E2E Tests for Article Thumbnail Display
 *
 * Tests the thumbnail_url feature that displays images in article cards.
 * Articles can have optional thumbnails extracted from RSS feeds.
 */
test.describe('Article Thumbnail Display', () => {
  let feedListPage: FeedListPage
  let articleListPage: ArticleListPage

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildTauriMockScript())

    feedListPage = new FeedListPage(page)
    articleListPage = new ArticleListPage(page)

    await page.goto('/')
    await feedListPage.waitForLoaded()
    await feedListPage.ensureReady()
    await articleListPage.waitForLoaded()
  })

  test('should display thumbnail for article with thumbnail_url', async () => {
    // Find article by title (more reliable than index due to sorting)
    const article = await articleListPage.findArticleByTitle('TypeScript Generics')
    expect(article).not.toBeNull()

    const thumbnail = article!.locator('[data-testid="article-thumbnail"]')
    await expect(thumbnail).toBeVisible()

    const src = await thumbnail.getAttribute('src')
    expect(src).toContain('typescript-generics.jpg')
  })

  test('should not display thumbnail for article without thumbnail_url', async () => {
    // Find "Tauri v2" article which has no thumbnail in mock data
    const article = await articleListPage.findArticleByTitle('Tauri v2')
    expect(article).not.toBeNull()

    const thumbnail = article!.locator('[data-testid="article-thumbnail"]')
    await expect(thumbnail).not.toBeVisible()
  })

  test('should display correct thumbnail URL from mock data', async () => {
    // Find React article which has thumbnail
    const article = await articleListPage.findArticleByTitle('React 19')
    expect(article).not.toBeNull()

    const thumbnail = article!.locator('[data-testid="article-thumbnail"]')
    await expect(thumbnail).toBeVisible()

    const src = await thumbnail.getAttribute('src')
    expect(src).toBe('https://example.com/react19.png')
  })

  test('should render thumbnail image with correct attributes', async ({
    page,
  }) => {
    // Get the thumbnail element
    const thumbnail = page.locator('[data-testid="article-thumbnail"]').first()
    await expect(thumbnail).toBeVisible()

    // Verify it has proper src attribute
    const src = await thumbnail.getAttribute('src')
    expect(src).toBeTruthy()
    expect(src).toMatch(/^https?:\/\//)

    // Verify alt attribute exists (accessibility)
    const alt = await thumbnail.getAttribute('alt')
    // Alt can be empty for decorative images
    expect(alt).not.toBeNull()
  })

  test('should show thumbnail only for articles that have one', async () => {
    const mockArticles = getMockArticles()

    // Count thumbnails displayed
    const thumbnailCount = await articleListPage.page
      .locator('[data-testid="article-thumbnail"]')
      .count()

    // Should match count of articles with thumbnail_url in mock data
    const expectedThumbnailCount = mockArticles.filter(
      (a) => a.thumbnail_url
    ).length
    expect(thumbnailCount).toBe(expectedThumbnailCount)
  })

  test('should display thumbnail alongside article content', async ({
    page,
  }) => {
    // Select an article with thumbnail
    const article = page.locator('[data-testid="article-card"]').first()
    await expect(article).toBeVisible()

    // Verify both title and thumbnail are present
    const title = article.locator('h3')
    await expect(title).toBeVisible()

    const thumbnail = article.locator('[data-testid="article-thumbnail"]')
    await expect(thumbnail).toBeVisible()

    // Verify thumbnail is positioned within the article card
    const articleBox = await article.boundingBox()
    const thumbnailBox = await thumbnail.boundingBox()

    expect(articleBox).toBeTruthy()
    expect(thumbnailBox).toBeTruthy()
    expect(thumbnailBox!.x).toBeGreaterThanOrEqual(articleBox!.x)
    expect(thumbnailBox!.y).toBeGreaterThanOrEqual(articleBox!.y)
  })

  test('thumbnail should have proper styling for 16x16 grid', async () => {
    const thumbnail = articleListPage.page
      .locator('[data-testid="article-thumbnail"]')
      .first()

    // Verify thumbnail container has proper dimensions
    const container = thumbnail.locator('..')
    const containerBox = await container.boundingBox()

    // Thumbnail container should be approximately 64x64 (w-16 h-16 in Tailwind)
    expect(containerBox).toBeTruthy()
    expect(Math.abs(containerBox!.width - 64)).toBeLessThan(5)
    expect(Math.abs(containerBox!.height - 64)).toBeLessThan(5)
  })
})
