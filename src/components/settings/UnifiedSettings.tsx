import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Palette,
  BookOpen,
  Bell,
  Info,
  Sun,
  Moon,
  Monitor,
  Rss,
  Sparkles,
  Coins,
  RefreshCw,
  Download,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdater } from '@/hooks/useUpdater'
import { useTheme, type ThemePreset, type ThemeMode } from '@/contexts/ThemeContext'
import { useReader } from '@/contexts/ReaderContext'
import { DEFAULT_READER_SETTINGS } from '@/types'
import { RssApi } from '@/lib/api'
import type { AiUsageSummary } from '@/types'
import {
  getSettings,
  updateSettings,
  getAiSettings,
  updateAiSettings,
  POLL_INTERVAL_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  DEFAULT_SETTINGS,
  DEFAULT_AI_SETTINGS,
  type AppSettings,
  type AiSettings,
} from '@/lib/settings'
import { SettingToggle } from './SettingToggle'

// ============= 设置面板 Context =============

type SettingsTab = 'appearance' | 'reading' | 'notification' | 'ai' | 'ai-usage' | 'about'

interface UnifiedSettingsContextType {
  open: boolean
  openSettings: (tab?: SettingsTab) => void
  closeSettings: () => void
}

const UnifiedSettingsContext = createContext<UnifiedSettingsContextType | undefined>(undefined)

export function useUnifiedSettings() {
  const context = useContext(UnifiedSettingsContext)
  if (!context) {
    throw new Error('useUnifiedSettings must be used within UnifiedSettingsProvider')
  }
  return context
}

export function UnifiedSettingsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<SettingsTab>('appearance')

  const openSettings = useCallback((tab: SettingsTab = 'appearance') => {
    setInitialTab(tab)
    setOpen(true)
  }, [])

  const closeSettings = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <UnifiedSettingsContext value={{ open, openSettings, closeSettings }}>
      {children}
      {open && <UnifiedSettingsPanel initialTab={initialTab} onClose={closeSettings} />}
    </UnifiedSettingsContext>
  )
}

// ============= 导航配置 =============

const NAV_ITEMS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'appearance', label: '外观', icon: <Palette className="w-4 h-4" /> },
  { key: 'reading', label: '阅读', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'notification', label: '通知', icon: <Bell className="w-4 h-4" /> },
  { key: 'ai', label: 'AI', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'ai-usage', label: 'AI 费用', icon: <Coins className="w-4 h-4" /> },
  { key: 'about', label: '关于', icon: <Info className="w-4 h-4" /> },
]

// ============= 主设置面板 =============

interface UnifiedSettingsPanelProps {
  initialTab: SettingsTab
  onClose: () => void
}

function UnifiedSettingsPanel({ initialTab, onClose }: UnifiedSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 设置面板 */}
      <div className="relative z-50 bg-card rounded-xl shadow-2xl border border-border w-full max-w-2xl h-[80vh] flex overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 左侧导航 */}
        <nav className="w-48 flex-shrink-0 border-r border-border bg-background flex flex-col">
          {/* Logo */}
          <div className="px-4 py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">RSS Reader</span>
            </div>
          </div>

          {/* 导航项 */}
          <div className="flex-1 p-2 space-y-1">
            {NAV_ITEMS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === key
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              {NAV_ITEMS.find(n => n.key === activeTab)?.icon}
              <h2 className="text-lg font-semibold">
                {NAV_ITEMS.find(n => n.key === activeTab)?.label}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 设置内容 */}
          <div className="flex-1 overflow-y-auto px-6 py-5 bg-card">
            {activeTab === 'appearance' && <AppearanceSection />}
            {activeTab === 'reading' && <ReadingSection />}
            {activeTab === 'notification' && <NotificationSection />}
            {activeTab === 'ai' && <AiSection />}
            {activeTab === 'ai-usage' && <AiUsageSection />}
            {activeTab === 'about' && <AboutSection />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ============= 外观设置 =============

const THEME_PRESETS: { key: ThemePreset; label: string; description: string }[] = [
  { key: 'eye-care', label: '护眼模式', description: '暖白色调，适合长时间阅读' },
  { key: 'paper', label: '羊皮纸', description: '复古纸张质感，温暖舒适' },
  { key: 'eink', label: '墨水屏', description: '高对比度黑白，清晰锐利' },
]

const MODE_OPTIONS: { key: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { key: 'light', label: '浅色', icon: <Sun className="w-4 h-4" /> },
  { key: 'dark', label: '深色', icon: <Moon className="w-4 h-4" /> },
  { key: 'system', label: '跟随系统', icon: <Monitor className="w-4 h-4" /> },
]

function AppearanceSection() {
  const { mode, preset, setMode, setPreset } = useTheme()

  return (
    <div className="space-y-8">
      {/* 主题风格 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">主题风格</h3>
        <p className="text-xs text-muted-foreground mb-3">选择适合你的阅读主题</p>
        <div className="space-y-2">
          {THEME_PRESETS.map(({ key, label, description }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left',
                preset === key
                  ? 'border-primary/60 bg-accent'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
              )}
            >
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
              </div>
              {preset === key && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 明暗模式 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">明暗模式</h3>
        <p className="text-xs text-muted-foreground mb-3">选择界面的明暗风格</p>
        <div className="flex gap-2">
          {MODE_OPTIONS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                mode === key
                  ? 'border-primary/60 bg-accent text-primary'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50 text-muted-foreground'
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============= 阅读设置 =============

function ReadingSection() {
  const { readerSettings, updateSettings: onSettingsChange } = useReader()

  return (
    <div className="space-y-6">
      {/* 字体大小 */}
      <SettingSlider
        label="字体大小"
        value={readerSettings.fontSize}
        min={12}
        max={24}
        step={1}
        unit="px"
        onChange={(v) => onSettingsChange({ ...readerSettings, fontSize: v })}
      />

      {/* 行间距 */}
      <SettingSlider
        label="行间距"
        value={readerSettings.lineHeight}
        min={1}
        max={2.5}
        step={0.1}
        onChange={(v) => onSettingsChange({ ...readerSettings, lineHeight: v })}
      />

      {/* 字间距 */}
      <SettingSlider
        label="字间距"
        value={readerSettings.letterSpacing}
        min={0}
        max={5}
        step={0.5}
        unit="px"
        onChange={(v) => onSettingsChange({ ...readerSettings, letterSpacing: v })}
      />

      {/* 内容宽度 */}
      <SettingSlider
        label="内容宽度"
        value={readerSettings.maxWidth}
        min={50}
        max={120}
        step={5}
        unit="ch"
        onChange={(v) => onSettingsChange({ ...readerSettings, maxWidth: v })}
      />

      {/* 文本对齐 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">文本对齐</h3>
        <div className="flex gap-2">
          {(['left', 'center', 'justify'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onSettingsChange({ ...readerSettings, textAlign: align })}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border',
                readerSettings.textAlign === align
                  ? 'bg-accent text-primary border-primary/60'
                  : 'border-border hover:bg-muted/50 text-muted-foreground'
              )}
            >
              {align === 'left' && '左对齐'}
              {align === 'center' && '居中'}
              {align === 'justify' && '两端对齐'}
            </button>
          ))}
        </div>
      </div>

      {/* 显示阅读进度 */}
      <SettingToggle
        label="显示阅读进度"
        description="在文章顶部显示阅读进度条"
        checked={readerSettings.showProgress}
        onChange={(v) => onSettingsChange({ ...readerSettings, showProgress: v })}
      />

      {/* 重置 */}
      <button
        onClick={() => onSettingsChange(DEFAULT_READER_SETTINGS)}
        className="w-full py-2 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        重置为默认设置
      </button>
    </div>
  )
}

// ============= 通知设置 =============

function NotificationSection() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [])

  const handleChange = async (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    setSaving(true)
    try {
      await updateSettings(updated)
    } catch {
      // 静默失败
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return <div className="text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* 轮询间隔 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">轮询间隔</h3>
        <p className="text-xs text-muted-foreground mb-3">自动检查新文章的频率</p>
        <select
          value={settings.pollInterval}
          onChange={(e) => handleChange({ pollInterval: e.target.value as AppSettings['pollInterval'] })}
          disabled={saving}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        >
          {POLL_INTERVAL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 启用通知 */}
      <SettingToggle
        label="启用通知"
        description="有新文章时发送系统通知"
        checked={settings.enableNotifications}
        onChange={(v) => handleChange({ enableNotifications: v })}
      />

      {/* 通知类型 */}
      {settings.enableNotifications && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">通知类型</h3>
          <p className="text-xs text-muted-foreground mb-3">选择通知的展示方式</p>
          <select
            value={settings.notificationType}
            onChange={(e) => handleChange({ notificationType: e.target.value as AppSettings['notificationType'] })}
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
          >
            {NOTIFICATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 每批次最大通知数 */}
      {settings.enableNotifications && (
        <SettingSlider
          label="每批次最大通知数"
          value={settings.maxNotificationsPerBatch}
          min={1}
          max={20}
          step={1}
          onChange={(v) => handleChange({ maxNotificationsPerBatch: v })}
        />
      )}

      {/* 后台刷新 */}
      <SettingToggle
        label="后台刷新"
        description="应用最小化时继续检查新文章"
        checked={settings.enableBackgroundRefresh}
        onChange={(v) => handleChange({ enableBackgroundRefresh: v })}
      />
    </div>
  )
}

// ============= AI 设置 =============

function AiSection() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    getAiSettings()
      .then((s) => {
        setSettings(s)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const saveSettings = useCallback(async (updated: AiSettings) => {
    setSaving(true)
    try {
      await updateAiSettings(updated)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }, [])

  const handleChange = useCallback((patch: Partial<AiSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...patch }
      saveSettings(updated)
      return updated
    })
  }, [saveSettings])

  const handleDebouncedChange = useCallback((patch: Partial<AiSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSettings((prev) => {
        saveSettings(prev)
        return prev
      })
    }, 500)
  }, [saveSettings])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!loaded) {
    return <div className="text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* API 地址 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">API 地址</h3>
        <p className="text-xs text-muted-foreground mb-2">OpenAI 兼容的 API 端点</p>
        <input
          type="text"
          value={settings.apiEndpoint}
          onChange={(e) => handleDebouncedChange({ apiEndpoint: e.target.value })}
          disabled={saving}
          placeholder="https://api.openai.com/v1"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        />
      </div>

      {/* API Key */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">API Key</h3>
        <p className="text-xs text-muted-foreground mb-2">用于身份验证的密钥</p>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => handleDebouncedChange({ apiKey: e.target.value })}
          disabled={saving}
          placeholder="sk-..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        />
      </div>

      {/* 模型 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">模型</h3>
        <p className="text-xs text-muted-foreground mb-2">用于生成摘要的模型名称</p>
        <input
          type="text"
          value={settings.model}
          onChange={(e) => handleDebouncedChange({ model: e.target.value })}
          disabled={saving}
          placeholder="gpt-4o-mini"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        />
      </div>

      {/* 最大 Token */}
      <SettingSlider
        label="最大 Token 数"
        value={settings.maxTokens}
        min={50}
        max={2000}
        step={50}
        onChange={(v) => handleChange({ maxTokens: v })}
      />

      <SettingSlider
        label="翻译最大并发数"
        value={settings.maxConcurrency}
        min={1}
        max={10}
        step={1}
        onChange={(v) => handleChange({ maxConcurrency: v })}
      />

      {/* 自动摘要 */}
      <SettingToggle
        label="自动生成摘要"
        description="新文章自动生成 AI 摘要（需要配置有效的 API Key）"
        checked={settings.enableAutoSummary}
        onChange={(v) => handleChange({ enableAutoSummary: v })}
      />

      {/* 摘要语言 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">摘要语言</h3>
        <select
          value={settings.language}
          onChange={(e) => handleChange({ language: e.target.value })}
          disabled={saving}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        >
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>

      {/* 自定义提示词 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">自定义提示词</h3>
        <p className="text-xs text-muted-foreground mb-2">AI 生成摘要时使用的系统提示词</p>
        <textarea
          value={settings.prompt}
          onChange={(e) => handleDebouncedChange({ prompt: e.target.value })}
          disabled={saving}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm resize-none"
        />
      </div>
    </div>
  )
}

// ============= AI 费用统计 =============

function AiUsageSection() {
  const [summary, setSummary] = useState<AiUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [savingPrice, setSavingPrice] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const loadData = useCallback(async () => {
    try {
      const [s, ai] = await Promise.all([
        RssApi.getAiUsageSummary(),
        getAiSettings(),
      ])
      setSummary(s)
      setAiSettings(ai)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleClear = async () => {
    setClearing(true)
    try {
      await RssApi.clearAiUsageRecords()
      await loadData()
    } catch {
      // silent
    } finally {
      setClearing(false)
      setShowConfirm(false)
    }
  }

  const handlePriceChange = (field: 'customInputPrice' | 'customOutputPrice', value: string) => {
    const numValue = value === '' ? null : Number(value)
    const updated = { ...aiSettings, [field]: numValue }
    setAiSettings(updated)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSavingPrice(true)
      try {
        await updateAiSettings({ [field]: numValue })
        const s = await RssApi.getAiUsageSummary()
        setSummary(s)
      } catch {
        // silent
      } finally {
        setSavingPrice(false)
      }
    }, 600)
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(6)}`
    if (cost < 1) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(2)}`
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
    return tokens.toString()
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">总 Token</div>
            <div className="text-lg font-semibold mt-1">{formatTokens(summary.total_tokens)}</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">预估费用</div>
            <div className="text-lg font-semibold mt-1">{formatCost(summary.total_cost)}</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">调用次数</div>
            <div className="text-lg font-semibold mt-1">{summary.total_calls}</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">Input / Output</div>
            <div className="text-sm font-medium mt-1">
              {formatTokens(summary.total_prompt_tokens)} / {formatTokens(summary.total_completion_tokens)}
            </div>
          </div>
        </div>
      )}

      {/* 按操作类型统计 */}
      {summary && summary.total_calls > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">按类型统计</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm">摘要</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {summary.summary_calls} 次 · {formatTokens(summary.summary_tokens)} tokens · {formatCost(summary.summary_cost)}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">翻译</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {summary.translation_calls} 次 · {formatTokens(summary.translation_tokens)} tokens · {formatCost(summary.translation_cost)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 每日趋势 */}
      {summary && summary.daily_stats.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">每日趋势</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...summary.daily_stats].reverse().map((day) => (
              <div key={day.date} className="flex items-center justify-between py-1.5 px-3 rounded border border-border text-sm">
                <span className="text-muted-foreground">{day.date}</span>
                <div className="flex items-center gap-3">
                  <span>{day.calls} 次</span>
                  <span className="text-muted-foreground">{formatTokens(day.total_tokens)}</span>
                  <span className="font-medium">{formatCost(day.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 自定义价格 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">自定义价格</h3>
        <p className="text-xs text-muted-foreground mb-3">
          留空则使用内置价格（单位：$/百万 tokens）{savingPrice && ' · 保存中...'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="custom-input-price" className="text-xs text-muted-foreground">Input 价格</label>
            <input
              id="custom-input-price"
              type="number"
              step="0.01"
              min="0"
              value={aiSettings.customInputPrice ?? ''}
              onChange={(e) => handlePriceChange('customInputPrice', e.target.value)}
              placeholder="自动"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
            />
          </div>
          <div>
            <label htmlFor="custom-output-price" className="text-xs text-muted-foreground">Output 价格</label>
            <input
              id="custom-output-price"
              type="number"
              step="0.01"
              min="0"
              value={aiSettings.customOutputPrice ?? ''}
              onChange={(e) => handlePriceChange('customOutputPrice', e.target.value)}
              placeholder="自动"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {/* 清空记录 */}
      <div>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-2 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            清空历史记录
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              disabled={clearing}
              className="flex-1 py-2 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {clearing ? '清空中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============= 关于 =============

function AboutSection() {
  const updater = useUpdater()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Rss className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">RSS Reader</h3>
          <p className="text-sm text-muted-foreground">v0.0.1</p>
        </div>
      </div>

      {/* 更新检查区域 */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">检查更新</h3>
          {updater.status === 'idle' || updater.status === 'error' || updater.status === 'up-to-date' ? (
            <button
              onClick={() => updater.checkForUpdates()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              检查更新
            </button>
          ) : null}
        </div>

        {updater.status === 'checking' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            正在检查更新...
          </div>
        )}

        {updater.status === 'up-to-date' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            已是最新版本
          </div>
        )}

        {updater.status === 'available' && (
          <div className="space-y-2">
            <p className="text-sm">
              发现新版本: <span className="font-medium">v{updater.newVersion}</span>
            </p>
            {updater.releaseNotes && (
              <p className="text-xs text-muted-foreground line-clamp-3">{updater.releaseNotes}</p>
            )}
            <button
              onClick={() => updater.downloadAndInstall()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              下载并安装
            </button>
          </div>
        )}

        {updater.status === 'downloading' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="w-4 h-4 animate-pulse" />
              正在下载... {updater.progress}%
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={updater.progress} aria-valuemin={0} aria-valuemax={100} aria-label="下载进度">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${updater.progress}%` }}
              />
            </div>
          </div>
        )}

        {updater.status === 'ready' && (
          <div className="space-y-2">
            <p className="text-sm text-green-600">更新已下载完成，重启应用以完成安装。</p>
            <button
              onClick={() => updater.restartApp()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重启应用
            </button>
          </div>
        )}

        {updater.status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            {updater.errorMessage ?? '检查更新失败'}
          </div>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b border-border">
          <span className="text-muted-foreground">框架</span>
          <span>Tauri v2 + React 19</span>
        </div>
        <div className="flex justify-between py-2 border-b border-border">
          <span className="text-muted-foreground">前端</span>
          <span>TypeScript + Vite</span>
        </div>
        <div className="flex justify-between py-2 border-b border-border">
          <span className="text-muted-foreground">后端</span>
          <span>Rust</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        一个轻量级的 RSS 阅读器桌面应用，专注于提供舒适的阅读体验。
      </p>
    </div>
  )
}

// ============= 通用设置控件 =============

interface SettingSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}

function SettingSlider({ label, value, min, max, step, unit, onChange }: SettingSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <span className="text-sm text-muted-foreground tabular-nums">
          {step % 1 === 0 ? value : value.toFixed(1)}{unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

