import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

// Mock matchMedia for jsdom
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})

// Test component that uses the theme context
function TestComponent() {
  const { mode, preset, setMode, setPreset, isDark } = useTheme()

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="preset">{preset}</span>
      <span data-testid="isDark">{isDark.toString()}</span>
      <button data-testid="set-light" onClick={() => setMode('light')}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={() => setMode('dark')}>
        Set Dark
      </button>
      <button data-testid="set-system" onClick={() => setMode('system')}>
        Set System
      </button>
      <button data-testid="set-paper" onClick={() => setPreset('paper')}>
        Set Paper
      </button>
      <button data-testid="set-eink" onClick={() => setPreset('eink')}>
        Set E-ink
      </button>
    </div>
  )
}

describe('ThemeContext', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('ThemeProvider', () => {
    it('should throw error when useTheme is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      function ComponentOutsideProvider() {
        useTheme()
        return null
      }

      expect(() => render(<ComponentOutsideProvider />)).toThrow(
        'useTheme must be used within ThemeProvider'
      )

      consoleError.mockRestore()
    })

    it('should provide default theme mode as system', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('mode')).toHaveTextContent('system')
    })

    it('should provide default preset as eye-care', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('preset')).toHaveTextContent('eye-care')
    })

    it('should load saved mode from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('mode')).toHaveTextContent('dark')
    })

    it('should load saved preset from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'rss-reader-theme-preset') return 'paper'
        return null
      })

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('preset')).toHaveTextContent('paper')
    })
  })

  describe('setMode', () => {
    it('should update mode to light', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-light').click()
      })

      expect(screen.getByTestId('mode')).toHaveTextContent('light')
      expect(screen.getByTestId('isDark')).toHaveTextContent('false')
    })

    it('should update mode to dark', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-dark').click()
      })

      expect(screen.getByTestId('mode')).toHaveTextContent('dark')
      expect(screen.getByTestId('isDark')).toHaveTextContent('true')
    })

    it('should save mode to localStorage', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-dark').click()
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('rss-reader-theme-mode', 'dark')
    })
  })

  describe('setPreset', () => {
    it('should update preset to paper', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-paper').click()
      })

      expect(screen.getByTestId('preset')).toHaveTextContent('paper')
    })

    it('should update preset to eink', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-eink').click()
      })

      expect(screen.getByTestId('preset')).toHaveTextContent('eink')
    })

    it('should save preset to localStorage', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-paper').click()
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('rss-reader-theme-preset', 'paper')
    })
  })

  describe('isDark calculation', () => {
    it('should be true when mode is dark', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-dark').click()
      })

      expect(screen.getByTestId('isDark')).toHaveTextContent('true')
    })

    it('should be false when mode is light', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-light').click()
      })

      expect(screen.getByTestId('isDark')).toHaveTextContent('false')
    })
  })

  describe('DOM attributes', () => {
    it('should set data-mode attribute on document element', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-dark').click()
      })

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
      })
    })

    it('should set data-theme attribute on document element', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByTestId('set-paper').click()
      })

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('paper')
      })
    })
  })
})
