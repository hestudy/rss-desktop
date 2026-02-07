import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsDialog } from './SettingsDialog'
import { DEFAULT_SETTINGS } from '@/lib/settings'

// Mock settings API
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(() => Promise.resolve(DEFAULT_SETTINGS)),
  updateSettings: vi.fn(() => Promise.resolve(DEFAULT_SETTINGS)),
  POLL_INTERVAL_OPTIONS: [
    { value: '5m', label: '5 分钟' },
    { value: '15m', label: '15 分钟' },
    { value: '30m', label: '30 分钟' },
    { value: '1h', label: '1 小时' },
    { value: '2h', label: '2 小时' },
    { value: '6h', label: '6 小时' },
    { value: '12h', label: '12 小时' },
    { value: '24h', label: '24 小时' },
  ],
  NOTIFICATION_TYPE_OPTIONS: [
    { value: 'system', label: '系统通知' },
    { value: 'none', label: '不通知' },
  ],
  DEFAULT_SETTINGS: {
    pollInterval: '30m',
    notificationType: 'system',
    enableNotifications: true,
    maxNotificationsPerBatch: 5,
    enableBackgroundRefresh: false,
  },
}))

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该渲染设置对话框', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('设置')).toBeInTheDocument()
    })
  })

  it('应该显示轮询间隔选项', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('轮询间隔')).toBeInTheDocument()
    })
  })

  it('应该显示通知设置', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('通知设置')).toBeInTheDocument()
    })
  })

  it('应该调用 onClose 当点击 X 关闭按钮', async () => {
    const handleClose = vi.fn()
    render(<SettingsDialog open={true} onClose={handleClose} />)

    await waitFor(() => {
      expect(screen.getByText('设置')).toBeInTheDocument()
    })

    // 点击 X 按钮
    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)

    expect(handleClose).toHaveBeenCalled()
  })

  it('应该显示启用通知开关', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('启用通知')).toBeInTheDocument()
    })
  })

  it('应该显示最大通知数量设置', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/每批次最大通知数/)).toBeInTheDocument()
    })
  })

  it('应该显示后台刷新设置', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('后台刷新')).toBeInTheDocument()
    })
  })

  it('不渲染当 open 为 false', () => {
    const { container } = render(<SettingsDialog open={false} onClose={vi.fn()} />)

    expect(container.firstChild).toBe(null)
  })

  it('应该有保存按钮', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: '保存' })
      expect(saveButton).toBeInTheDocument()
    })
  })

  it('应该有取消按钮', async () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />)

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: '取消' })
      expect(cancelButton).toBeInTheDocument()
    })
  })
})
