import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  Platform,
  getPlatform,
  isMobile,
  isDesktop,
  isIOS,
  isAndroid,
  resetPlatformCache,
} from './platform'

/**
 * Helper function to set mock window with Tauri internals
 */
function setMockWindow(internals?: Record<string, unknown>): void {
  ;(globalThis as any).window = {
    __TAURI_INTERNALS__: internals,
  }
}

/**
 * Helper function to set empty window object
 */
function setEmptyWindow(): void {
  ;(globalThis as any).window = {}
}

describe('Platform Detection', () => {
  const originalWindow = globalThis.window

  beforeEach(() => {
    // Reset cache before each test
    resetPlatformCache()
    // Clear any mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore window after each test
    if (originalWindow) {
      globalThis.window = originalWindow
    } else {
      // @ts-expect-error - intentionally deleting window for testing
      delete globalThis.window
    }
  })

  describe('getPlatform', () => {
    it('should return "desktop" when running on Tauri desktop (macos)', () => {
      setMockWindow({
        metadata: { platform: 'macos' },
      })

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should return "desktop" when running on Tauri desktop (windows)', () => {
      setMockWindow({
        metadata: { platform: 'windows' },
      })

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should return "desktop" when running on Tauri desktop (linux)', () => {
      setMockWindow({
        metadata: { platform: 'linux' },
      })

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should return "ios" when running on Tauri iOS', () => {
      setMockWindow({
        metadata: { platform: 'ios' },
      })

      expect(getPlatform()).toBe(Platform.IOS)
    })

    it('should return "android" when running on Tauri Android', () => {
      setMockWindow({
        metadata: { platform: 'android' },
      })

      expect(getPlatform()).toBe(Platform.Android)
    })

    it('should return "desktop" for fallback when window exists but no Tauri internals', () => {
      setEmptyWindow()

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should return "unknown" when window is undefined (SSR/Node.js)', () => {
      // @ts-expect-error - intentionally deleting window for testing
      delete globalThis.window

      expect(getPlatform()).toBe(Platform.Unknown)
    })

    it('should cache the platform result', () => {
      setMockWindow({
        metadata: { platform: 'ios' },
      })

      // First call
      expect(getPlatform()).toBe(Platform.IOS)

      // Change the platform (this shouldn't affect cached result)
      ;(globalThis.window as any).__TAURI_INTERNALS__!.metadata!.platform = 'android'

      // Second call should return cached value
      expect(getPlatform()).toBe(Platform.IOS)
    })
  })

  describe('isMobile', () => {
    it('should return true for iOS', () => {
      setMockWindow({
        metadata: { platform: 'ios' },
      })

      expect(isMobile()).toBe(true)
    })

    it('should return true for Android', () => {
      setMockWindow({
        metadata: { platform: 'android' },
      })

      expect(isMobile()).toBe(true)
    })

    it('should return false for desktop platforms', () => {
      setMockWindow({
        metadata: { platform: 'macos' },
      })

      expect(isMobile()).toBe(false)
    })

    it('should return false for unknown platform', () => {
      // @ts-expect-error - intentionally deleting window for testing
      delete globalThis.window

      expect(isMobile()).toBe(false)
    })
  })

  describe('isDesktop', () => {
    it('should return true for macOS', () => {
      setMockWindow({
        metadata: { platform: 'macos' },
      })

      expect(isDesktop()).toBe(true)
    })

    it('should return true for Windows', () => {
      setMockWindow({
        metadata: { platform: 'windows' },
      })

      expect(isDesktop()).toBe(true)
    })

    it('should return true for Linux', () => {
      setMockWindow({
        metadata: { platform: 'linux' },
      })

      expect(isDesktop()).toBe(true)
    })

    it('should return false for iOS', () => {
      setMockWindow({
        metadata: { platform: 'ios' },
      })

      expect(isDesktop()).toBe(false)
    })

    it('should return false for Android', () => {
      setMockWindow({
        metadata: { platform: 'android' },
      })

      expect(isDesktop()).toBe(false)
    })

    it('should return false for unknown platform', () => {
      // @ts-expect-error - intentionally deleting window for testing
      delete globalThis.window

      expect(isDesktop()).toBe(false)
    })
  })

  describe('isIOS', () => {
    it('should return true for iOS platform', () => {
      setMockWindow({
        metadata: { platform: 'ios' },
      })

      expect(isIOS()).toBe(true)
    })

    it('should return false for Android', () => {
      setMockWindow({
        metadata: { platform: 'android' },
      })

      expect(isIOS()).toBe(false)
    })

    it('should return false for desktop', () => {
      setMockWindow({
        metadata: { platform: 'macos' },
      })

      expect(isIOS()).toBe(false)
    })
  })

  describe('isAndroid', () => {
    it('should return true for Android platform', () => {
      setMockWindow({
        metadata: { platform: 'android' },
      })

      expect(isAndroid()).toBe(true)
    })

    it('should return false for iOS', () => {
      setMockWindow({
        metadata: { platform: 'ios' },
      })

      expect(isAndroid()).toBe(false)
    })

    it('should return false for desktop', () => {
      setMockWindow({
        metadata: { platform: 'linux' },
      })

      expect(isAndroid()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing metadata object gracefully', () => {
      setMockWindow({})

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should handle missing __TAURI_INTERNALS__ gracefully', () => {
      setEmptyWindow()

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should handle null __TAURI_INTERNALS__ gracefully', () => {
      ;(globalThis as any).window = {
        __TAURI_INTERNALS__: null,
      }

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should handle undefined metadata gracefully', () => {
      setMockWindow({
        metadata: undefined,
      })

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should handle null metadata gracefully', () => {
      ;(globalThis as any).window = {
        __TAURI_INTERNALS__: {
          metadata: null,
        },
      }

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should handle empty platform string', () => {
      setMockWindow({
        metadata: { platform: '' },
      })

      expect(getPlatform()).toBe(Platform.Desktop)
    })

    it('should handle unknown platform string', () => {
      setMockWindow({
        metadata: { platform: 'unknown-platform' },
      })

      expect(getPlatform()).toBe(Platform.Desktop)
    })
  })

  describe('Platform enum', () => {
    it('should have correct enum values', () => {
      expect(Platform.Desktop).toBe('desktop')
      expect(Platform.IOS).toBe('ios')
      expect(Platform.Android).toBe('android')
      expect(Platform.Unknown).toBe('unknown')
    })
  })
})
