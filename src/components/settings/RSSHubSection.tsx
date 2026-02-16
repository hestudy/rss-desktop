/**
 * RSSHub 设置面板
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle, XCircle, Loader2, Globe } from 'lucide-react'
import { getRSSHubSettings, updateRSSHubSettings, DEFAULT_RSSHUB_SETTINGS } from '../../lib/settings'
import { RSSHubApi } from '../../lib/rsshub'
import { SettingToggle } from './SettingToggle'
import type { RSSHubSettings } from '../../lib/settings'

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'

// URL 格式验证
const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function RSSHubSection() {
  const [settings, setSettings] = useState<RSSHubSettings>(DEFAULT_RSSHUB_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getRSSHubSettings()
      .then((s) => {
        setSettings(s)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const saveSettings = useCallback(async (updated: RSSHubSettings) => {
    setSaving(true)
    try {
      await updateRSSHubSettings(updated)
    } catch {
      // 静默失败
    } finally {
      setSaving(false)
    }
  }, [])

  const handleToggle = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const updated = { ...prev, enabled }
      saveSettings(updated)
      return updated
    })
  }, [saveSettings])

  const handleUrlChange = useCallback((instanceUrl: string) => {
    setSettings((prev) => ({ ...prev, instanceUrl }))

    // 验证 URL 格式
    if (instanceUrl && !isValidUrl(instanceUrl)) {
      setConnectionStatus('error')
      return
    }

    setConnectionStatus('idle')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSettings((prev) => {
        // 只在 URL 有效时保存
        if (isValidUrl(prev.instanceUrl)) {
          saveSettings(prev)
        }
        return prev
      })
    }, 500)
  }, [saveSettings])

  const handleTestConnection = useCallback(async () => {
    setConnectionStatus('testing')
    try {
      const success = await RSSHubApi.testConnection(settings.instanceUrl)
      setConnectionStatus(success ? 'success' : 'error')
    } catch {
      setConnectionStatus('error')
    }
  }, [settings.instanceUrl])

  if (!loaded) {
    return <div className="text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* 启用开关 */}
      <SettingToggle
        label="启用 RSSHub"
        description="启用 RSSHub 发现功能，帮助你找到更多订阅源"
        checked={settings.enabled}
        onChange={handleToggle}
      />

      {/* 实例地址 */}
      <div>
        <label htmlFor="rsshub-instance-url" className="block text-sm font-medium text-foreground mb-1">
          实例地址
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          RSSHub 服务的地址，可以使用公共实例或自建实例
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="rsshub-instance-url"
              type="url"
              value={settings.instanceUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={saving}
              placeholder="https://rsshub.app"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
            />
          </div>
          <button
            onClick={handleTestConnection}
            disabled={connectionStatus === 'testing' || !settings.instanceUrl}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {connectionStatus === 'testing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                测试中
              </>
            ) : (
              '测试连接'
            )}
          </button>
        </div>

        {/* 连接状态 */}
        {connectionStatus === 'success' && (
          <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>连接成功，实例可用</span>
          </div>
        )}
        {connectionStatus === 'error' && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
            <XCircle className="w-4 h-4" />
            <span>连接失败，请检查地址是否正确</span>
          </div>
        )}
      </div>

      {/* 帮助信息 */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>提示：</strong>
          默认使用官方公共实例 <code className="px-1 py-0.5 rounded bg-muted">rsshub.app</code>。
          你也可以部署自己的 RSSHub 实例或使用其他公共实例。
        </p>
      </div>
    </div>
  )
}
