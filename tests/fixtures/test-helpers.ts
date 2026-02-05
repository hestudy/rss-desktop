/**
 * Test helpers and utilities for RSS Desktop E2E tests
 */

// Reliable public RSS feeds for testing
export const TEST_FEEDS = {
  // Reddit RSS - very reliable, updates frequently
  reddit: 'https://www.reddit.com/.rss',

  // O'Reilly Radar - tech blog
  oreilly: 'https://feeds.feedburner.com/oreilly/radar',

  // CSS-Tricks - web development blog
  cssTricks: 'https://css-tricks.com/feed/',

  // Simple RSS feed for testing (Atom format)
  atom: 'https://localhost:1420/feed.xml', // This will fail, used for error testing

  // BBC News - very reliable
  bbc: 'http://feeds.bbci.co.uk/news/rss.xml',

  // The Verge - tech news
  theVerge: 'https://www.theverge.com/rss/index.xml',
}

// Wait utilities
export const WAIT_TIMES = {
  short: 1000,
  medium: 3000,
  long: 10000,
  rssFetch: 15000, // RSS feeds can take time to fetch
}

/**
 * Wait for a specific text to appear in the page
 */
export async function waitForText(
  page: any,
  text: string,
  timeout = WAIT_TIMES.medium
): Promise<boolean> {
  try {
    await page.waitForFunction(
      (t: string) => document.body.textContent?.includes(t),
      text,
      { timeout }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Generate unique feed title for testing
 */
export function generateUniqueFeedTitle(): string {
  return `Test Feed ${Date.now()}`
}

/**
 * Clean up test feeds by title pattern
 */
export function isTestFeed(title: string): boolean {
  return title.includes('Test Feed') || title.includes('E2E Test')
}
