import { useState, useCallback } from 'react'
import {
  ArrowLeft,
  Palette,
  BookOpen,
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

// ============= Types =============

export interface MobileSettingsPanelProps {
  /** Back callback */
  onBack?: () => void
}

type SettingGroup = 'appearance' | 'reading' | 'data' | 'about'

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
