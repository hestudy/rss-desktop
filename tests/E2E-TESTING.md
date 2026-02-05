# E2E Testing Guide for RSS Desktop

## Overview

This project uses Playwright for end-to-end testing. The tests verify critical user flows in the RSS Desktop Tauri application.

## Prerequisites

### Required Software

1. **Rust** - Required to run Tauri desktop app
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js & pnpm** - For frontend dependencies
   ```bash
   npm install -g pnpm
   ```

3. **Playwright Browsers**
   ```bash
   npx playwright install
   ```

## Test Structure

```
tests/
├── e2e/                      # E2E test specs
│   ├── feeds/                # Feed management tests
│   │   ├── add-feed.spec.ts      # Adding new subscriptions
│   │   ├── delete-feed.spec.ts   # Deleting subscriptions
│   │   └── refresh-feed.spec.ts  # Refreshing feeds
│   └── articles/              # Article viewing tests
│       ├── view-articles.spec.ts # Viewing articles
│       └── mark-read.spec.ts     # Marking as read
├── pages/                    # Page Object Models
│   ├── FeedListPage.ts           # Feed list component
│   ├── ArticleListPage.ts        # Article list component
│   └── AddFeedDialogPage.ts      # Add feed dialog
└── fixtures/                 # Test utilities
    └── test-helpers.ts           # Constants and helpers
```

## Running Tests

### Run all E2E tests
```bash
pnpm test
```

### Run specific test file
```bash
npx playwright test tests/e2e/feeds/add-feed.spec.ts
```

### Run tests in headed mode (see browser)
```bash
pnpm test:headed
```

### Debug tests with inspector
```bash
pnpm test:debug
```

### Run tests with UI mode
```bash
pnpm test:ui
```

### View HTML report
```bash
pnpm test:report
```

## Test Coverage

### Feed Management (add-feed.spec.ts)
- Open add feed dialog
- Validate empty URL
- Validate invalid URL format
- Add valid RSS feed successfully
- Add multiple RSS feeds
- Show loading state while adding
- Close dialog with cancel
- Clear form after successful add

### View Articles (view-articles.spec.ts)
- Show empty state when no feeds exist
- Display articles when feed is selected
- Display article title and description
- Show loading state while fetching
- Update article list when switching feeds
- Show "All Articles" view
- Display unread count badges
- Display global unread count

### Mark as Read (mark-read.spec.ts)
- Mark article as read when clicked
- Show visual difference between read/unread
- Show "Mark All Read" button
- Mark all articles as read
- Update global unread count
- Persist read status when switching feeds

### Delete Feed (delete-feed.spec.ts)
- Show confirmation dialog
- Delete feed when confirmed
- Clear articles when current feed deleted
- Cancel deletion properly
- Close dialog when clicking backdrop

### Refresh Feed (refresh-feed.spec.ts)
- Refresh individual feed
- Show loading animation
- Refresh all feeds
- Update articles after refresh

## Test Data

The tests use reliable public RSS feeds:

- **Reddit RSS**: `https://www.reddit.com/.rss`
- **O'Reilly Radar**: `https://feeds.feedburner.com/oreilly/radar`
- **CSS-Tricks**: `https://css-tricks.com/feed/`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: npx playwright install

      - name: Run E2E tests
        run: pnpm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Known Limitations

1. **Selector Stability**: Tests use text-based selectors since components don't have `data-testid` attributes. Adding `data-testid` to components would improve test reliability.

2. **Network Dependency**: Tests depend on external RSS feeds being accessible. Network failures can cause flaky tests.

3. **Tauri IPC Timing**: Tauri's inter-process communication can be slower than web APIs, requiring generous timeouts.

## Improving Test Reliability

### Add data-testid attributes

Example:
```tsx
// Before
<Button onClick={handleAdd}>Add</Button>

// After
<Button data-testid="add-feed-button" onClick={handleAdd}>Add</Button>
```

### Use Page Object Model

The tests already use POM pattern. Continue to:
- Keep selectors in Page Objects
- Reuse Page Objects across tests
- Update POM when UI changes

## Debugging Failed Tests

1. **View Screenshots**: Check `test-results/` for screenshots
2. **View Traces**: Use `npx playwright show-trace trace.zip`
3. **Run in Headed Mode**: See what's happening
4. **Use Inspector**: `pnpm test:debug`

## Writing New Tests

1. Create test file in `tests/e2e/`
2. Import Page Objects
3. Use `test.describe()` for grouping
4. Use `test.beforeEach()` for setup
5. Write clear test descriptions
6. Add assertions for key behaviors

Example:
```typescript
import { test, expect } from '@playwright/test'
import { FeedListPage } from '../../pages/FeedListPage'

test.describe('New Feature', () => {
  test('should do something', async ({ page }) => {
    const feedList = new FeedListPage(page)
    await page.goto('/')
    await feedList.waitForLoaded()

    // Test logic here
    expect(true).toBe(true)
  })
})
```
