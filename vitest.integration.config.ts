import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Vitest configuration for Tauri integration tests
 *
 * This config is specifically for integration tests that use Tauri's
 * mock runtime to test IPC communication without running the full app.
 *
 * Run with: npx vitest --config vitest.integration.config.ts
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/',
      'src-tauri/',
      '**/*.config.{ts,js}',
    ],
    // Don't use the regular setup file that mocks @tauri-apps/api/core
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src-tauri/'],
    },
  },
})
