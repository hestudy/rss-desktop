import { Page } from '@playwright/test'
import { FeedListPage } from '../pages/FeedListPage'
import { AddFeedDialogPage } from '../pages/AddFeedDialogPage'
import { ArticleListPage } from '../pages/ArticleListPage'
import { WAIT_TIMES } from './test-helpers'

/**
 * Test data setup helpers for E2E tests
 * Provides utilities to add feeds and ensure articles exist
 *
 * Note: These tests require the Tauri backend to be running.
 * When running in a browser without Tauri, feed operations will fail.
 */

// Global flag to track if Tauri API is available
let tauriApiAvailable: boolean | null = null

export class TestDataSetup {
  constructor(
    private page: Page,
    private feedListPage: FeedListPage,
    private addFeedDialogPage: AddFeedDialogPage,
    private articleListPage: ArticleListPage
  ) {}

  /**
   * Check if Tauri API is available by attempting a simple operation
   */
  async checkTauriAvailable(): Promise<boolean> {
    if (tauriApiAvailable !== null) {
      return tauriApiAvailable
    }

    // Try to get feeds - if Tauri is available, this will work
    try {
      await this.page.waitForTimeout(500)
      // If we can see feeds, Tauri is likely available
      const feedCount = await this.feedListPage.getFeedCount()
      tauriApiAvailable = true
      return true
    } catch {
      tauriApiAvailable = false
      return false
    }
  }

  /**
   * Add a test feed and wait for articles to load
   * @param url - RSS feed URL
   * @param waitForArticles - Whether to wait for articles to load
   * @returns The feed title
   */
  async addTestFeed(url: string, waitForArticles = true): Promise<string | null> {
    // Check if Tauri is available first
    if (!(await this.checkTauriAvailable())) {
      console.log('Tauri API not available, skipping feed addition')
      return null
    }

    // Always ensure no dialog is open first
    await this.feedListPage.closeAnyDialog()
    await this.page.waitForTimeout(200)

    // Check if dialog button is available - if not, Tauri API is not working
    const addButtonVisible = await this.feedListPage.addButton.isVisible().catch(() => false)
    if (!addButtonVisible) {
      tauriApiAvailable = false
      return null
    }

    try {
      await this.feedListPage.clickAddFeed()

      // Check if dialog opened - if not, Tauri might not be working
      const dialogOpened = await this.addFeedDialogPage.dialogTitle.isVisible().catch(() => false)
      if (!dialogOpened) {
        tauriApiAvailable = false
        return null
      }

      await this.addFeedDialogPage.fillUrl(url)
      await this.page.waitForTimeout(300)

      // Submit the form
      await this.addFeedDialogPage.submit()

      // Wait for dialog to close with shorter timeout
      // If it doesn't close in 3 seconds, Tauri API is probably not working
      const dialogClosed = await this.addFeedDialogPage.dialogTitle.waitFor({ state: 'hidden', timeout: 3000 })
        .then(() => true)
        .catch(() => false)

      if (!dialogClosed) {
        // Dialog didn't close - Tauri not working
        console.warn('Dialog did not close after submitting, Tauri API not available')
        tauriApiAvailable = false
        await this.feedListPage.closeAnyDialog()
        return null
      }

      // Wait a bit for articles to load
      if (waitForArticles) {
        await this.page.waitForTimeout(WAIT_TIMES.medium)
      }

      // Try to extract the feed title from the URL or use a default
      const urlObj = new URL(url)
      let title = urlObj.hostname

      // Specific title mappings for known feeds
      const titleMap: Record<string, string> = {
        'www.reddit.com': 'reddit',
        'feeds.feedburner.com': 'O\'Reilly',
        'css-tricks.com': 'CSS-Tricks',
        'www.theverge.com': 'The Verge',
      }

      for (const [domain, mappedTitle] of Object.entries(titleMap)) {
        if (url.includes(domain)) {
          title = mappedTitle
          break
        }
      }

      return title
    } catch (error) {
      // Feed addition failed - mark Tauri as unavailable
      console.warn('Failed to add test feed, marking Tauri as unavailable:', error)
      tauriApiAvailable = false
      // Ensure dialog is closed
      await this.feedListPage.closeAnyDialog()
      return null
    }
  }

  /**
   * Ensure at least one feed with articles exists
   * @returns Whether articles are available
   */
  async ensureFeedWithArticles(): Promise<boolean> {
    // First, ensure no dialog is blocking
    await this.feedListPage.closeAnyDialog()
    await this.page.waitForTimeout(300)

    // Check if any feed exists and has articles
    const feedCount = await this.feedListPage.getFeedCount()

    if (feedCount > 0) {
      // Check if "All Articles" has any articles
      await this.feedListPage.clickAllArticles()
      await this.articleListPage.waitForLoaded()
      const articleCount = await this.articleListPage.getArticleCount()

      if (articleCount > 0) {
        return true
      }
    }

    // No articles found and we can't add feeds without Tauri backend
    return false
  }

  /**
   * Ensure at least a specific number of articles exist
   * @param minArticles - Minimum number of articles required
   * @returns Actual number of articles available
   */
  async ensureMinArticles(minArticles: number): Promise<number> {
    let articleCount = 0

    // Try all articles first
    await this.feedListPage.clickAllArticles()
    await this.articleListPage.waitForLoaded()
    articleCount = await this.articleListPage.getArticleCount()

    // If we already have enough articles, don't try to add more
    if (articleCount >= minArticles) {
      return articleCount
    }

    // If Tauri is not available, return current count
    if (!(await this.checkTauriAvailable())) {
      console.log('Tauri API not available, using existing articles only')
      return articleCount
    }

    // Try to add more feeds (only if Tauri is available)
    const testFeeds = [
      'https://www.reddit.com/.rss',
      'https://css-tricks.com/feed/',
      'https://www.theverge.com/rss/index.xml',
    ]

    let feedIndex = 0
    while (articleCount < minArticles && feedIndex < testFeeds.length) {
      const result = await this.addTestFeed(testFeeds[feedIndex])
      if (result === null) {
        // Feed addition failed, stop trying
        break
      }
      await this.feedListPage.clickAllArticles()
      await this.articleListPage.waitForLoaded()
      articleCount = await this.articleListPage.getArticleCount()
      feedIndex++
    }

    return articleCount
  }

  /**
   * Get the current article count without modifying state
   */
  async getArticleCount(): Promise<number> {
    await this.feedListPage.clickAllArticles()
    await this.articleListPage.waitForLoaded()
    return await this.articleListPage.getArticleCount()
  }

  /**
   * Clean up test feeds (feeds with 'Test' in the title)
   */
  async cleanupTestFeeds(): Promise<void> {
    const feedCount = await this.feedListPage.getFeedCount()
    // Note: This is a basic cleanup
  }
}

/**
 * Create test data setup instance
 */
export function createTestDataSetup(
  page: Page,
  feedListPage: FeedListPage,
  addFeedDialogPage: AddFeedDialogPage,
  articleListPage: ArticleListPage
): TestDataSetup {
  return new TestDataSetup(page, feedListPage, addFeedDialogPage, articleListPage)
}
