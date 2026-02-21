import { useState, useCallback, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Palette,
  BookOpen,
  Bell,
  Sparkles,
  Coins,
  Database,
  Info,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Rss,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, type ThemePreset, type ThemeMode } from '@/contexts/ThemeContext'
import { useReader } from '@/contexts/ReaderContext'
import { DEFAULT_READER_SETTINGS } from '@/types'
import { useUpdater } from '@/hooks/useUpdater'
import { useAppVersion } from '@/hooks/useAppVersion'
import { DataManagementSection } from '@/components/settings/DataManagementSection'
import {
  getSettings,
  updateSettings,
  getAiSettings,
  updateAiSettings,
  POLL_INTERVAL_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  AUTO_UPDATE_CHECK_INTERVAL_OPTIONS,
  DEFAULT_SETTINGS,
  DEFAULT_AI_SETTINGS,
  type AppSettings,
  type AiSettings,
} from '@/lib/settings'
import { RssApi } from '@/lib/api'
import type { AiUsageSummary } from '@/types'

// ============= Types =============

export interface MobileSettingsPanelProps {
  /** Back callback */
  onBack?: () => void
}

type SettingGroup = 'appearance' | 'reading' | 'notification' | 'ai' | 'ai-usage' | 'data' | 'about'

// ============= Theme Configuration =============

const THEME_PRESETS: { key: ThemePreset; label: string; description: string }[] = [
  { key: 'eye-care', label: 'Eye Care', description: 'Warm tones for extended reading' },
  { key: 'paper', label: 'Paper', description: 'Classic paper texture' },
  { key: 'eink', label: 'E-ink', description: 'High contrast black and white' },
]

const MODE_OPTIONS: { key: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { key: 'light', label: 'Light', icon: <Sun className="w-5 h-5" /> },
  { key: 'dark', label: 'Dark', icon: <Moon className="w-5 h-5" /> },
  { key: 'system', label: 'System', icon: <Monitor className="w-5 h-5" /> },
]

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'justify', label: 'Justify' },
] as const

// ============= Accordion Item Component =============

interface AccordionItemProps {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function AccordionItem({ title, icon, isExpanded, onToggle, children }: AccordionItemProps) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={cn(
          'w-full flex items-center justify-between px-4 py-4',
          'text-left hover:bg-accent/50 active:bg-accent transition-colors',
          'min-h-[56px]' // Touch-friendly target size
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ============= Setting Slider Component =============

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
        <label className="text-sm font-medium text-foreground">{label}</label>
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
        aria-label={label}
        className="w-full accent-primary h-2"
      />
    </div>
  )
}

// ============= Setting Toggle Component =============

interface SettingToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3 rounded-lg',
        'border border-border hover:bg-accent/50 transition-colors',
        'min-h-[56px]'
      )}
    >
      <div className="text-left">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      <div
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </div>
    </button>
  )
}

// ============= Main Component =============

export function MobileSettingsPanel({ onBack }: MobileSettingsPanelProps) {
  const [expandedGroup, setExpandedGroup] = useState<Set<SettingGroup>>(new Set())
  const { mode, preset, setMode, setPreset } = useTheme()
  const { readerSettings, updateSettings: onReaderSettingsChange } = useReader()
  const updater = useUpdater()
  const version = useAppVersion()

  const toggleGroup = useCallback((group: SettingGroup) => {
    setExpandedGroup((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }, [])

  const handleBackClick = useCallback(() => {
    onBack?.()
  }, [onBack])

  const isGroupExpanded = (group: SettingGroup) => expandedGroup.has(group)

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button
          onClick={handleBackClick}
          aria-label="Go back"
          className="p-3 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      {/* Scrollable Content */}
      <div
        data-testid="settings-scroll-area"
        className="flex-1 overflow-y-auto"
      >
        {/* Appearance Settings */}
        <AccordionItem
          title="Appearance"
          icon={<Palette className="w-5 h-5" />}
          isExpanded={isGroupExpanded('appearance')}
          onToggle={() => toggleGroup('appearance')}
        >
          {/* Theme Style */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Theme Style</h3>
            <div className="space-y-2">
              {THEME_PRESETS.map(({ key, label, description }) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors min-h-[56px]',
                    preset === key
                      ? 'border-primary bg-accent'
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

          {/* Theme Mode */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Theme Mode</h3>
            <div className="grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-lg border text-sm font-medium transition-colors min-h-[64px]',
                    mode === key
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </AccordionItem>

        {/* Reading Settings */}
        <AccordionItem
          title="Reading"
          icon={<BookOpen className="w-5 h-5" />}
          isExpanded={isGroupExpanded('reading')}
          onToggle={() => toggleGroup('reading')}
        >
          {/* Font Size */}
          <SettingSlider
            label="Font Size"
            value={readerSettings.fontSize}
            min={12}
            max={24}
            step={1}
            unit="px"
            onChange={(v) => onReaderSettingsChange({ ...readerSettings, fontSize: v })}
          />

          {/* Line Height */}
          <SettingSlider
            label="Line Height"
            value={readerSettings.lineHeight}
            min={1}
            max={2.5}
            step={0.1}
            onChange={(v) => onReaderSettingsChange({ ...readerSettings, lineHeight: v })}
          />

          {/* Letter Spacing */}
          <SettingSlider
            label="Letter Spacing"
            value={readerSettings.letterSpacing}
            min={0}
            max={5}
            step={0.5}
            unit="px"
            onChange={(v) => onReaderSettingsChange({ ...readerSettings, letterSpacing: v })}
          />

          {/* Content Width */}
          <SettingSlider
            label="Content Width"
            value={readerSettings.maxWidth}
            min={50}
            max={120}
            step={5}
            unit="ch"
            onChange={(v) => onReaderSettingsChange({ ...readerSettings, maxWidth: v })}
          />

          {/* Text Alignment */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Text Alignment</h3>
            <div className="grid grid-cols-3 gap-2">
              {TEXT_ALIGN_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onReaderSettingsChange({ ...readerSettings, textAlign: value })}
                  className={cn(
                    'py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border min-h-[44px]',
                    readerSettings.textAlign === value
                      ? 'bg-accent text-primary border-primary'
                      : 'border-border hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Show Progress */}
          <SettingToggle
            label="Show Reading Progress"
            description="Display reading progress bar at top of article"
            checked={readerSettings.showProgress}
            onChange={(v) => onReaderSettingsChange({ ...readerSettings, showProgress: v })}
          />

          {/* Reset Button */}
          <button
            onClick={() => onReaderSettingsChange(DEFAULT_READER_SETTINGS)}
            className="w-full py-3 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors min-h-[44px]"
          >
            Reset to Default
          </button>
        </AccordionItem>

        {/* Notification Settings */}
        <AccordionItem
          title="通知"
          icon={<Bell className="w-5 h-5" />}
          isExpanded={isGroupExpanded('notification')}
          onToggle={() => toggleGroup('notification')}
        >
          <NotificationSection />
        </AccordionItem>

        {/* AI Settings */}
        <AccordionItem
          title="AI"
          icon={<Sparkles className="w-5 h-5" />}
          isExpanded={isGroupExpanded('ai')}
          onToggle={() => toggleGroup('ai')}
        >
          <AiSection />
        </AccordionItem>

        {/* AI Usage Settings */}
        <AccordionItem
          title="AI 费用"
          icon={<Coins className="w-5 h-5" />}
          isExpanded={isGroupExpanded('ai-usage')}
          onToggle={() => toggleGroup('ai-usage')}
        >
          <AiUsageSection />
        </AccordionItem>

        {/* Data Management Settings */}
        <AccordionItem
          title="Data Management"
          icon={<Database className="w-5 h-5" />}
          isExpanded={isGroupExpanded('data')}
          onToggle={() => toggleGroup('data')}
        >
          {/* Reuse existing DataManagementSection component */}
          <DataManagementSection />
        </AccordionItem>

        {/* About Section */}
        <AccordionItem
          title="About"
          icon={<Info className="w-5 h-5" />}
          isExpanded={isGroupExpanded('about')}
          onToggle={() => toggleGroup('about')}
        >
          {/* App Info */}
          <div className="flex items-center gap-3 py-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Rss className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">RSS Reader</h3>
              {version && <p className="text-sm text-muted-foreground">{version}</p>}
            </div>
          </div>

          {/* Check Updates */}
          <button
            onClick={() => updater.checkForUpdates()}
            disabled={updater.status === 'checking'}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
              'min-h-[44px] font-medium',
              updater.status === 'checking' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {updater.status === 'checking' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Check for Updates
              </>
            )}
          </button>

          {/* Tech Stack Info */}
          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Framework</span>
              <span>Tauri v2 + React 19</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Frontend</span>
              <span>TypeScript + Vite</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Backend</span>
              <span>Rust</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            A lightweight RSS reader desktop application focused on providing a comfortable reading experience.
          </p>
        </AccordionItem>
      </div>
    </div>
  )
}

// ============= Notification Settings Section =============

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
    return <div className="text-sm text-muted-foreground py-4">加载中...</div>
  }

  return (
    <div className="space-y-4">
      {/* 轮询间隔 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">轮询间隔</h3>
        <p className="text-xs text-muted-foreground mb-2">自动检查新文章的频率</p>
        <select
          value={settings.pollInterval}
          onChange={(e) => handleChange({ pollInterval: e.target.value as AppSettings['pollInterval'] })}
          disabled={saving}
          className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
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
          <p className="text-xs text-muted-foreground mb-2">选择通知的展示方式</p>
          <select
            value={settings.notificationType}
            onChange={(e) => handleChange({ notificationType: e.target.value as AppSettings['notificationType'] })}
            disabled={saving}
            className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
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

      {/* 关闭到托盘 */}
      <SettingToggle
        label="关闭到托盘"
        description="关闭窗口时最小化到系统托盘"
        checked={settings.closeToTray}
        onChange={(v) => handleChange({ closeToTray: v })}
      />

      {/* 分隔线 */}
      <div className="border-t border-border pt-4 mt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">自动更新</h3>

        {/* 自动检查更新 */}
        <SettingToggle
          label="自动检查更新"
          description="启动时和定期检查应用更新"
          checked={settings.enableAutoUpdateCheck}
          onChange={(v) => handleChange({ enableAutoUpdateCheck: v })}
        />

        {/* 检查间隔 */}
        {settings.enableAutoUpdateCheck && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-foreground mb-1">检查间隔</h3>
            <p className="text-xs text-muted-foreground mb-2">自动检查更新的频率</p>
            <select
              value={settings.autoUpdateCheckInterval}
              onChange={(e) => handleChange({ autoUpdateCheckInterval: e.target.value as AppSettings['autoUpdateCheckInterval'] })}
              disabled={saving}
              className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
            >
              {AUTO_UPDATE_CHECK_INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

// ============= AI Settings Section =============

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
      // 静默失败
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
    return <div className="text-sm text-muted-foreground py-4">加载中...</div>
  }

  return (
    <div className="space-y-4">
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
          className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
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
          className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
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
          className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
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

      {/* 最大并发数 */}
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
        description="新文章自动生成 AI 摘要"
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
          className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
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
          className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground text-sm resize-none"
        />
      </div>
    </div>
  )
}

// ============= AI Usage Section =============

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
    return <div className="text-sm text-muted-foreground py-4">加载中...</div>
  }

  return (
    <div className="space-y-4">
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
          <h3 className="text-sm font-medium text-foreground mb-2">按类型统计</h3>
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
          <h3 className="text-sm font-medium text-foreground mb-2">每日趋势</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {[...summary.daily_stats].reverse().map((day) => (
              <div key={day.date} className="flex items-center justify-between py-1.5 px-3 rounded border border-border text-sm">
                <span className="text-muted-foreground">{day.date}</span>
                <div className="flex items-center gap-2">
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
        <p className="text-xs text-muted-foreground mb-2">
          留空则使用内置价格（单位：$/百万 tokens）{savingPrice && ' · 保存中...'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mobile-custom-input-price" className="text-xs text-muted-foreground">Input 价格</label>
            <input
              id="mobile-custom-input-price"
              type="number"
              step="0.01"
              min="0"
              value={aiSettings.customInputPrice ?? ''}
              onChange={(e) => handlePriceChange('customInputPrice', e.target.value)}
              placeholder="自动"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="mobile-custom-output-price" className="text-xs text-muted-foreground">Output 价格</label>
            <input
              id="mobile-custom-output-price"
              type="number"
              step="0.01"
              min="0"
              value={aiSettings.customOutputPrice ?? ''}
              onChange={(e) => handlePriceChange('customOutputPrice', e.target.value)}
              placeholder="自动"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* 清空记录 */}
      <div>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors min-h-[44px]"
          >
            清空历史记录
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              disabled={clearing}
              className="flex-1 py-3 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {clearing ? '清空中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors min-h-[44px]"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
