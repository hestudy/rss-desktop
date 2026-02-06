import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration for RSS Desktop Tauri App
 *
 * This config is optimized for testing a Tauri desktop application.
 * The app runs on http://localhost:1420 during development.
 *
 * Note: Full E2E tests require Rust/Tauri to be installed.
 * For testing without Tauri, use TEST_MODE=mock environment variable.
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit workers to avoid overwhelming the server
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:1420',

    // Collect trace when retrying the test for debugging
    trace: 'on-first-retry',

    // Take screenshot only on failure (but manual screenshots in tests go to artifacts dir)
    screenshot: 'only-on-failure',

    // Record video only on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Directory for test artifacts (screenshots, videos, traces)
  outputDir: 'test-results',

  // Test projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration
  // Use Vite dev server for testing (Tauri requires Rust)
  webServer: process.env.CI
    ? undefined // In CI, expect server to be already running
    : {
        command: 'pnpm dev',
        url: 'http://localhost:1420',
        reuseExistingServer: true,
        timeout: 60000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
})
