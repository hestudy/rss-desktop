import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import {
  getSettings,
  updateSettings,
  POLL_INTERVAL_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  DEFAULT_SETTINGS,
  type AppSettings,
} from '@/lib/settings'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const loaded = await getSettings()
      setSettings(loaded)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(settings)
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setSettings(DEFAULT_SETTINGS)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent title="设置">
        <div className="space-y-6 py-4">
          {/* 轮询间隔 */}
          <div>
            <label className="block text-sm font-medium mb-2">轮询间隔</label>
            <select
              value={settings.pollInterval}
              onChange={(e) =>
                setSettings({ ...settings, pollInterval: e.target.value as AppSettings['pollInterval'] })
              }
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
            >
              {POLL_INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 通知设置 */}
          <div>
            <h3 className="text-sm font-medium mb-3">通知设置</h3>

            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">启用通知</span>
            </label>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">通知类型</label>
              <select
                value={settings.notificationType}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notificationType: e.target.value as AppSettings['notificationType'],
                  })
                }
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              >
                {NOTIFICATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                每批次最大通知数: {settings.maxNotificationsPerBatch}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.maxNotificationsPerBatch}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxNotificationsPerBatch: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* 后台刷新 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableBackgroundRefresh}
                onChange={(e) =>
                  setSettings({ ...settings, enableBackgroundRefresh: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">后台刷新</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
