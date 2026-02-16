import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { ReaderProvider, useReader } from './ReaderContext'
import type { ReaderSettings } from '../types'

// Test component that uses the reader context
function TestComponent() {
  const { selectedArticleId, readerSettings, selectArticle, updateSettings, resetSettings } = useReader()

  return (
    <div>
      <span data-testid="selected-id">{selectedArticleId ?? 'none'}</span>
      <span data-testid="font-size">{readerSettings.fontSize}</span>
      <span data-testid="line-height">{readerSettings.lineHeight}</span>
      <button data-testid="select-article" onClick={() => selectArticle('article-123')}>
        Select Article
      </button>
      <button data-testid="deselect-article" onClick={() => selectArticle(null)}>
        Deselect Article
      </button>
      <button
        data-testid="update-settings"
        onClick={() => updateSettings({ ...readerSettings, fontSize: 20 })}
      >
        Update Font Size
      </button>
      <button data-testid="reset-settings" onClick={resetSettings}>
        Reset Settings
      </button>
    </div>
  )
}

describe('ReaderContext', () => {
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

  describe('ReaderProvider', () => {
    it('should throw error when useReader is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      function ComponentOutsideProvider() {
        useReader()
        return null
      }

      expect(() => render(<ComponentOutsideProvider />)).toThrow(
        'useReader must be used within ReaderProvider'
      )

      consoleError.mockRestore()
    })

    it('should provide default selectedArticleId as null', () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      expect(screen.getByTestId('selected-id')).toHaveTextContent('none')
    })

    it('should provide default reader settings', () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      // Default font size is typically 16
      expect(screen.getByTestId('font-size')).toHaveTextContent('16')
    })
  })

  describe('selectArticle', () => {
    it('should update selectedArticleId', async () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      await act(async () => {
        screen.getByTestId('select-article').click()
      })

      expect(screen.getByTestId('selected-id')).toHaveTextContent('article-123')
    })

    it('should clear selectedArticleId when set to null', async () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      // First select an article
      await act(async () => {
        screen.getByTestId('select-article').click()
      })
      expect(screen.getByTestId('selected-id')).toHaveTextContent('article-123')

      // Then deselect
      await act(async () => {
        screen.getByTestId('deselect-article').click()
      })
      expect(screen.getByTestId('selected-id')).toHaveTextContent('none')
    })
  })

  describe('updateSettings', () => {
    it('should update reader settings', async () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      await act(async () => {
        screen.getByTestId('update-settings').click()
      })

      expect(screen.getByTestId('font-size')).toHaveTextContent('20')
    })

    it('should save settings to localStorage', async () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      await act(async () => {
        screen.getByTestId('update-settings').click()
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const calls = localStorageMock.setItem.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall?.[0]).toBe('reader-settings')
    })
  })

  describe('resetSettings', () => {
    it('should reset settings to defaults', async () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      // First update settings
      await act(async () => {
        screen.getByTestId('update-settings').click()
      })
      expect(screen.getByTestId('font-size')).toHaveTextContent('20')

      // Then reset
      await act(async () => {
        screen.getByTestId('reset-settings').click()
      })
      expect(screen.getByTestId('font-size')).toHaveTextContent('16')
    })

    it('should save reset settings to localStorage', async () => {
      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      await act(async () => {
        screen.getByTestId('reset-settings').click()
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('localStorage loading', () => {
    it('should load settings from localStorage on mount', async () => {
      const savedSettings: ReaderSettings = {
        fontSize: 18,
        lineHeight: 1.8,
        letterSpacing: 0,
        textAlign: 'left',
        maxWidth: 80,
        showProgress: true,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings))

      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('font-size')).toHaveTextContent('18')
        expect(screen.getByTestId('line-height')).toHaveTextContent('1.8')
      })
    })

    it('should use default settings if localStorage parsing fails', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      render(
        <ReaderProvider>
          <TestComponent />
        </ReaderProvider>
      )

      // Should fall back to defaults
      expect(screen.getByTestId('font-size')).toHaveTextContent('16')
    })
  })
})
