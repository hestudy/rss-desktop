import { useState } from 'react'
import { Sun, Moon, Palette } from 'lucide-react'
import { useTheme, type ThemePreset, type ThemeMode } from '../../contexts/ThemeContext'
import { Button } from './Button'

const themeLabels: Record<ThemePreset, string> = {
  'eye-care': '护眼模式',
  'paper': '羊皮纸',
  'eink': '墨水屏',
}

const modeLabels: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
}

export function ThemeSwitcher() {
  const { mode, preset, setMode, setPreset, isDark } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        title="主题设置"
      >
        <Palette className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 bg-background border rounded-xl shadow-xl w-64 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4">
              {/* 主题预设 */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">主题风格</h3>
                <div className="space-y-1">
                  {(Object.keys(themeLabels) as ThemePreset[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setPreset(key)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        preset === key
                          ? 'bg-accent text-accent-foreground border-l-4 border-l-primary'
                          : 'hover:bg-accent/50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{themeLabels[key]}</span>
                        {preset === key && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 明暗模式 */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">明暗模式</h3>
                <div className="space-y-1">
                  {(Object.keys(modeLabels) as ThemeMode[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        mode === key
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      {key === 'light' && <Sun className="w-4 h-4" />}
                      {key === 'dark' && <Moon className="w-4 h-4" />}
                      {key === 'system' && (isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />)}
                      <span className="text-sm font-medium">{modeLabels[key]}</span>
                      {mode === key && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
