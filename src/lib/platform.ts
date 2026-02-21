/**
 * Platform Detection Utility
 *
 * Detects the current platform (desktop/iOS/Android) for Tauri v2 applications.
 * Tauri v2 exposes platform information via window.__TAURI_INTERNALS__.metadata.platform
 */

/**
 * Supported platform types
 */
export enum Platform {
  Desktop = 'desktop',
  IOS = 'ios',
  Android = 'android',
  Unknown = 'unknown',
}

/** Cached platform value for performance */
let cachedPlatform: Platform | null = null;

/**
 * Resets the platform cache.
 * Useful for testing purposes.
 */
export function resetPlatformCache(): void {
  cachedPlatform = null
}

/**
 * Detects the Tauri platform from window.__TAURI_INTERNALS__
 *
 * @returns The detected platform string or undefined if not available
 */
function detectTauriPlatform(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const internals = (window as any).__TAURI_INTERNALS__
  if (!internals) {
    return undefined
  }

  const metadata = internals.metadata
  if (!metadata) {
    return undefined
  }

  return metadata.platform
}

/**
 * Gets the current platform.
 *
 * Detection logic:
 * 1. If window is undefined (SSR/Node.js), returns Unknown
 * 2. If Tauri internals are available, reads the platform from metadata
 * 3. Falls back to Desktop if running in a browser-like environment
 * 4. Returns Unknown for unrecognizable environments
 *
 * @returns The current platform
 */
export function getPlatform(): Platform {
  // Return cached value if available
  if (cachedPlatform !== null) {
    return cachedPlatform
  }

  const tauriPlatform = detectTauriPlatform()

  let platform: Platform

  if (!tauriPlatform) {
    // No Tauri internals detected
    if (typeof window === 'undefined') {
      // SSR/Node.js environment
      platform = Platform.Unknown
    } else {
      // Browser-like environment without Tauri, assume desktop
      platform = Platform.Desktop
    }
  } else {
    // Map Tauri platform string to Platform enum
    switch (tauriPlatform) {
      case 'ios':
        platform = Platform.IOS
        break
      case 'android':
        platform = Platform.Android
        break
      case 'macos':
      case 'windows':
      case 'linux':
        platform = Platform.Desktop
        break
      default:
        // Unknown platform string, fallback to desktop
        platform = Platform.Desktop
    }
  }

  // Cache the result
  cachedPlatform = platform

  return platform
}

/**
 * Mobile layout breakpoint in pixels.
 * Screens narrower than this will use mobile layout.
 */
export const MOBILE_BREAKPOINT = 768

/**
 * Checks if the screen width is below mobile breakpoint.
 *
 * @returns true if screen width < MOBILE_BREAKPOINT
 */
export function isNarrowScreen(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.innerWidth < MOBILE_BREAKPOINT
}

/**
 * Checks if the app should use mobile layout.
 * Returns true if:
 * - Running on iOS or Android platform, OR
 * - Screen width is below mobile breakpoint
 *
 * @returns true if mobile layout should be used
 */
export function isMobile(): boolean {
  const platform = getPlatform()

  // Native mobile platforms always use mobile layout
  if (platform === Platform.IOS || platform === Platform.Android) {
    return true
  }

  // Desktop platforms use mobile layout if screen is narrow
  if (platform === Platform.Desktop) {
    return isNarrowScreen()
  }

  return false
}

/**
 * Checks if the app is running on a desktop platform.
 *
 * @returns true if running on macOS, Windows, or Linux, false otherwise
 */
export function isDesktop(): boolean {
  return getPlatform() === Platform.Desktop
}

/**
 * Checks if the app is running on iOS.
 *
 * @returns true if running on iOS, false otherwise
 */
export function isIOS(): boolean {
  return getPlatform() === Platform.IOS
}

/**
 * Checks if the app is running on Android.
 *
 * @returns true if running on Android, false otherwise
 */
export function isAndroid(): boolean {
  return getPlatform() === Platform.Android
}
