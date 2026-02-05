import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemePreset = 'eye-care' | 'paper' | 'eink'

interface ThemeContextType {
  mode: ThemeMode
  preset: ThemePreset
  setMode: (mode: ThemeMode) => void
  setPreset: (preset: ThemePreset) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY_MODE = 'rss-reader-theme-mode'
const STORAGE_KEY_PRESET = 'rss-reader-theme-preset'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_MODE)
    return (stored as ThemeMode) || 'system'
  })

  const [preset, setPresetState] = useState<ThemePreset>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PRESET)
    return (stored as ThemePreset) || 'eye-care'
  })

  const [isDark, setIsDark] = useState(false)

  // 计算实际是否为暗色模式
  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateDarkMode = () => {
      const shouldBeDark = mode === 'dark' || (mode === 'system' && mediaQuery.matches)
      setIsDark(shouldBeDark)
      root.setAttribute('data-mode', shouldBeDark ? 'dark' : 'light')
    }

    updateDarkMode()

    // 监听系统主题变化
    const handler = () => updateDarkMode()
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [mode])

  // 应用主题预设
  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-theme', preset)
  }, [preset])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY_MODE, newMode)
  }

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset)
    localStorage.setItem(STORAGE_KEY_PRESET, newPreset)
  }

  return (
    <ThemeContext value={{ mode, preset, setMode, setPreset, isDark }}>
      {children}
    </ThemeContext>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
