import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileSettingsPanel } from './MobileSettingsPanel'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ReaderProvider } from '@/contexts/ReaderContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock matchMedia for jsdom (required by ThemeContext)
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

// Wrapper with required providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <ReaderProvider>{children}</ReaderProvider>
  </ThemeProvider>
)

describe('MobileSettingsPanel', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('Basic Rendering', () => {
    it('should render settings panel with title', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should render back button', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel onBack={mockOnBack} />
        </TestWrapper>
      )

      expect(screen.getByLabelText('Go back')).toBeInTheDocument()
    })

    it('should call onBack when back button is clicked', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel onBack={mockOnBack} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByLabelText('Go back'))

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })

    it('should not crash when back button is clicked without onBack callback', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      expect(() => fireEvent.click(screen.getByLabelText('Go back'))).not.toThrow()
    })
  })

  describe('Settings Groups (Accordion)', () => {
    it('should render all setting groups', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByText('Reading')).toBeInTheDocument()
      expect(screen.getByText('Data Management')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
    })

    it('should expand accordion when clicking on collapsed group', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      // Appearance accordion should be collapsed initially (content hidden)
      const appearanceButton = screen.getByRole('button', { name: /Appearance/ })

      // Click to expand
      fireEvent.click(appearanceButton)

      // Should show theme options
      await waitFor(() => {
        expect(screen.getByText('Theme Style')).toBeInTheDocument()
      })
    })

    it('should collapse accordion when clicking on expanded group', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const appearanceButton = screen.getByRole('button', { name: /Appearance/ })

      // Expand
      fireEvent.click(appearanceButton)
      await waitFor(() => {
        expect(screen.getByText('Theme Style')).toBeInTheDocument()
      })

      // Collapse
      fireEvent.click(appearanceButton)
      await waitFor(() => {
        expect(screen.queryByText('Theme Style')).not.toBeInTheDocument()
      })
    })

    it('should allow multiple accordions to be expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const appearanceButton = screen.getByRole('button', { name: /Appearance/ })
      const readingButton = screen.getByRole('button', { name: /Reading/ })

      // Expand both
      fireEvent.click(appearanceButton)
      fireEvent.click(readingButton)

      await waitFor(() => {
        expect(screen.getByText('Theme Style')).toBeInTheDocument()
        expect(screen.getByText('Font Size')).toBeInTheDocument()
      })
    })
  })

  describe('Appearance Settings', () => {
    it('should show theme preset options when expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Appearance/ }))

      await waitFor(() => {
        expect(screen.getByText('Eye Care')).toBeInTheDocument()
        expect(screen.getByText('Paper')).toBeInTheDocument()
        expect(screen.getByText('E-ink')).toBeInTheDocument()
      })
    })

    it('should show theme mode options when expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Appearance/ }))

      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument()
        expect(screen.getByText('Dark')).toBeInTheDocument()
        expect(screen.getByText('System')).toBeInTheDocument()
      })
    })

    it('should change theme preset when option is clicked', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Appearance/ }))

      await waitFor(() => {
        expect(screen.getByText('Paper')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Paper'))

      // The theme should be selected (visual indicator)
      await waitFor(() => {
        const paperButton = screen.getByText('Paper').closest('button')
        expect(paperButton).toHaveClass('border-primary')
      })
    })

    it('should change theme mode when mode option is clicked', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Appearance/ }))

      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Dark'))

      // The mode should be selected (visual indicator)
      await waitFor(() => {
        const darkButton = screen.getByText('Dark').closest('button')
        expect(darkButton).toHaveClass('border-primary')
      })
    })
  })

  describe('Reading Settings', () => {
    it('should show font size slider when expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByText('Font Size')).toBeInTheDocument()
        expect(screen.getByRole('slider', { name: /Font Size/ })).toBeInTheDocument()
      })
    })

    it('should show line height slider when expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByText('Line Height')).toBeInTheDocument()
      })
    })

    it('should show text alignment options when expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByText('Text Alignment')).toBeInTheDocument()
        expect(screen.getByText('Left')).toBeInTheDocument()
        expect(screen.getByText('Center')).toBeInTheDocument()
        expect(screen.getByText('Justify')).toBeInTheDocument()
      })
    })

    it('should update font size when slider is changed', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByRole('slider', { name: /Font Size/ })).toBeInTheDocument()
      })

      const slider = screen.getByRole('slider', { name: /Font Size/ })
      fireEvent.change(slider, { target: { value: 18 } })

      expect(slider).toHaveValue('18')
    })

    it('should update text alignment when option is clicked', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByText('Center')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Center'))

      // The alignment should be selected (visual indicator)
      await waitFor(() => {
        const centerButton = screen.getByText('Center').closest('button')
        expect(centerButton).toHaveClass('bg-accent')
      })
    })

    it('should show reading progress toggle', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByText('Show Reading Progress')).toBeInTheDocument()
      })
    })

    it('should toggle reading progress when clicked', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByText('Show Reading Progress')).toBeInTheDocument()
      })

      const toggleButton = screen.getByText('Show Reading Progress').closest('button')

      // Default is true, so clicking should toggle to false
      fireEvent.click(toggleButton!)

      await waitFor(() => {
        const switchElement = toggleButton?.querySelector('[role="switch"]')
        expect(switchElement).toHaveAttribute('aria-checked', 'false')
      })
    })

    it('should show reset to default button', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        expect(screen.getByText('Reset to Default')).toBeInTheDocument()
      })
    })

    it('should reset settings when reset button is clicked', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      // Change font size first
      await waitFor(() => {
        expect(screen.getByRole('slider', { name: /Font Size/ })).toBeInTheDocument()
      })

      const slider = screen.getByRole('slider', { name: /Font Size/ })
      fireEvent.change(slider, { target: { value: 20 } })
      expect(slider).toHaveValue('20')

      // Click reset
      fireEvent.click(screen.getByText('Reset to Default'))

      // Slider should be reset to default value (16)
      await waitFor(() => {
        expect(slider).toHaveValue('16')
      })
    })
  })

  describe('Data Management Settings', () => {
    it('should expand data management section', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const dataButton = screen.getByRole('button', { name: /Data Management/ })
      expect(dataButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(dataButton)

      await waitFor(() => {
        expect(dataButton).toHaveAttribute('aria-expanded', 'true')
      })
    })
  })

  describe('About Section', () => {
    it('should show app information when expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /About/ }))

      await waitFor(() => {
        expect(screen.getByText('RSS Reader')).toBeInTheDocument()
      })
    })

    it('should show check update button when expanded', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /About/ }))

      await waitFor(() => {
        expect(screen.getByText('Check for Updates')).toBeInTheDocument()
      })
    })
  })

  describe('Touch-Friendly UI', () => {
    it('should have touch-friendly button sizes (min 44px target)', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      // Back button should have adequate padding
      const backButton = screen.getByLabelText('Go back')
      expect(backButton).toHaveClass('p-3')
    })

    it('should have full-width accordion buttons for easy tapping', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const appearanceButton = screen.getByRole('button', { name: /Appearance/ })
      expect(appearanceButton).toHaveClass('w-full')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for accordions', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const appearanceButton = screen.getByRole('button', { name: /Appearance/ })
      expect(appearanceButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should update aria-expanded when accordion is toggled', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const appearanceButton = screen.getByRole('button', { name: /Appearance/ })
      expect(appearanceButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(appearanceButton)

      await waitFor(() => {
        expect(appearanceButton).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('should have accessible labels for sliders', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

      await waitFor(() => {
        const slider = screen.getByRole('slider', { name: /Font Size/ })
        expect(slider).toHaveAttribute('aria-label', 'Font Size')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined onBack callback gracefully', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel onBack={undefined} />
        </TestWrapper>
      )

      expect(() => fireEvent.click(screen.getByLabelText('Go back'))).not.toThrow()
    })

    it('should render without crashing when contexts are available', () => {
      expect(() =>
        render(
          <TestWrapper>
            <MobileSettingsPanel />
          </TestWrapper>
        )
      ).not.toThrow()
    })

    it('should maintain accordion state independently', async () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const appearanceButton = screen.getByRole('button', { name: /Appearance/ })
      const readingButton = screen.getByRole('button', { name: /Reading/ })

      // Expand Appearance
      fireEvent.click(appearanceButton)
      await waitFor(() => {
        expect(appearanceButton).toHaveAttribute('aria-expanded', 'true')
      })

      // Expand Reading - Appearance should still be expanded
      fireEvent.click(readingButton)
      await waitFor(() => {
        expect(appearanceButton).toHaveAttribute('aria-expanded', 'true')
        expect(readingButton).toHaveAttribute('aria-expanded', 'true')
      })
    })
  })

  describe('Full Screen Layout', () => {
    it('should fill the entire viewport', () => {
      const { container } = render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const panel = container.firstChild
      expect(panel).toHaveClass('h-full')
      expect(panel).toHaveClass('w-full')
    })

    it('should have scrollable content area', () => {
      render(
        <TestWrapper>
          <MobileSettingsPanel />
        </TestWrapper>
      )

      const scrollArea = screen.getByTestId('settings-scroll-area')
      expect(scrollArea).toHaveClass('overflow-y-auto')
    })
  })
})
