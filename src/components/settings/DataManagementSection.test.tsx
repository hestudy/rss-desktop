import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataManagementSection } from './DataManagementSection'

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
  open: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn(),
  readTextFile: vi.fn(),
}))

// Mock config API
vi.mock('@/lib/config', () => ({
  exportConfigToFile: vi.fn(),
  importConfigFromFile: vi.fn(),
}))

import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { exportConfigToFile, importConfigFromFile } from '@/lib/config'

describe('DataManagementSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render export and import buttons', () => {
    render(<DataManagementSection />)

    expect(screen.getByRole('button', { name: /导出配置/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /导入配置/ })).toBeInTheDocument()
  })

  it('should show description text', () => {
    render(<DataManagementSection />)

    expect(screen.getByText(/导出当前的订阅源和设置/)).toBeInTheDocument()
  })

  it('should call export when export button clicked', async () => {
    const mockConfig = {
      version: '1.0',
      exportedAt: '2024-01-15T10:30:00.000Z',
      feeds: [],
    }

    vi.mocked(exportConfigToFile).mockResolvedValueOnce(mockConfig)
    vi.mocked(save).mockResolvedValueOnce('/path/to/config.json')
    vi.mocked(writeTextFile).mockResolvedValueOnce(undefined)

    render(<DataManagementSection />)

    const exportButton = screen.getByRole('button', { name: /导出配置/ })
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(exportConfigToFile).toHaveBeenCalled()
    })
  })

  it('should handle export cancellation gracefully', async () => {
    vi.mocked(exportConfigToFile).mockResolvedValueOnce({
      version: '1.0',
      exportedAt: '2024-01-15T10:30:00.000Z',
      feeds: [],
    })
    vi.mocked(save).mockResolvedValueOnce(null) // User cancelled

    render(<DataManagementSection />)

    const exportButton = screen.getByRole('button', { name: /导出配置/ })
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(save).toHaveBeenCalled()
    })

    // writeTextFile should not be called when cancelled
    expect(writeTextFile).not.toHaveBeenCalled()
  })

  it('should call import when import button clicked', async () => {
    const mockConfig = {
      version: '1.0',
      exportedAt: '2024-01-15T10:30:00.000Z',
      feeds: [{ url: 'https://example.com/feed.xml', title: 'Test' }],
    }

    vi.mocked(open).mockResolvedValueOnce('/path/to/config.json')
    vi.mocked(readTextFile).mockResolvedValueOnce(JSON.stringify(mockConfig))
    vi.mocked(importConfigFromFile).mockResolvedValueOnce({
      success: true,
      feedsImported: 1,
      feedsSkipped: 0,
      settingsImported: false,
      aiSettingsImported: false,
    })

    render(<DataManagementSection />)

    const importButton = screen.getByRole('button', { name: /导入配置/ })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(open).toHaveBeenCalled()
    })
  })

  it('should show success message after successful import', async () => {
    const mockConfig = {
      version: '1.0',
      exportedAt: '2024-01-15T10:30:00.000Z',
      feeds: [{ url: 'https://example.com/feed.xml', title: 'Test' }],
    }

    vi.mocked(open).mockResolvedValueOnce('/path/to/config.json')
    vi.mocked(readTextFile).mockResolvedValueOnce(JSON.stringify(mockConfig))
    vi.mocked(importConfigFromFile).mockResolvedValueOnce({
      success: true,
      feedsImported: 2,
      feedsSkipped: 1,
      settingsImported: true,
      aiSettingsImported: false,
    })

    render(<DataManagementSection />)

    const importButton = screen.getByRole('button', { name: /导入配置/ })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/导入成功/)).toBeInTheDocument()
    })
  })

  it('should show error message on import failure', async () => {
    vi.mocked(open).mockResolvedValueOnce('/path/to/config.json')
    vi.mocked(readTextFile).mockResolvedValueOnce('{"version":"1.0","exportedAt":"2024-01-15T10:30:00.000Z","feeds":[]}')
    vi.mocked(importConfigFromFile).mockResolvedValueOnce({
      success: false,
      feedsImported: 0,
      feedsSkipped: 0,
      settingsImported: false,
      aiSettingsImported: false,
      error: 'Invalid config version',
    })

    render(<DataManagementSection />)

    const importButton = screen.getByRole('button', { name: /导入配置/ })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/Invalid config version/)).toBeInTheDocument()
    })
  })

  it('should handle import cancellation gracefully', async () => {
    vi.mocked(open).mockResolvedValueOnce(null) // User cancelled

    render(<DataManagementSection />)

    const importButton = screen.getByRole('button', { name: /导入配置/ })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(open).toHaveBeenCalled()
    })

    // readTextFile should not be called when cancelled
    expect(readTextFile).not.toHaveBeenCalled()
  })

  it('should show loading state during export', async () => {
    vi.mocked(exportConfigToFile).mockImplementationOnce(() =>
      new Promise((resolve) => setTimeout(() => resolve({
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        feeds: [],
      }), 1000))
    )
    vi.mocked(save).mockImplementationOnce(() =>
      new Promise((resolve) => setTimeout(() => resolve(null), 500))
    )

    render(<DataManagementSection />)

    const exportButton = screen.getByRole('button', { name: /导出配置/ })
    fireEvent.click(exportButton)

    // Immediately check for loading state
    expect(exportButton).toBeDisabled()
    expect(screen.getByText('导出中...')).toBeInTheDocument()
  })

  it('should show loading state during import', async () => {
    vi.mocked(open).mockResolvedValueOnce('/path/to/config.json')
    vi.mocked(readTextFile).mockResolvedValueOnce('{"version":"1.0","exportedAt":"2024-01-15T10:30:00.000Z","feeds":[]}')
    vi.mocked(importConfigFromFile).mockImplementationOnce(() =>
      new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        feedsImported: 0,
        feedsSkipped: 0,
        settingsImported: false,
        aiSettingsImported: false,
      }), 1000))
    )

    render(<DataManagementSection />)

    const importButton = screen.getByRole('button', { name: /导入配置/ })
    fireEvent.click(importButton)

    // Wait for loading state to appear after file dialog and read
    await waitFor(() => {
      expect(screen.getByText('导入中...')).toBeInTheDocument()
    }, { timeout: 200 })

    // Button should be disabled during import
    expect(importButton).toBeDisabled()
  })

  it('should display warning about sensitive data', () => {
    render(<DataManagementSection />)

    expect(screen.getByText(/API Key 不会被导出/)).toBeInTheDocument()
  })
})
