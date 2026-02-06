import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { ReaderSettings } from '../types'
import { DEFAULT_READER_SETTINGS, ReaderSettingsSchema } from '../types'
import { READER_STORAGE_KEY } from '../lib/constants'

export { DEFAULT_READER_SETTINGS } from '../types'

interface ReaderContextType {
  selectedArticleId: string | null
  readerSettings: ReaderSettings
  selectArticle: (id: string | null) => void
  updateSettings: (settings: ReaderSettings) => void
  resetSettings: () => void
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined)

export function useReader() {
  const context = useContext(ReaderContext)
  if (!context) {
    throw new Error('useReader must be used within ReaderProvider')
  }
  return context
}

interface ReaderProviderProps {
  children: ReactNode
}

export function ReaderProvider({ children }: ReaderProviderProps) {
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS)

  // 从 localStorage 加载阅读器设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(READER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // 使用 Zod 验证数据
        const validated = ReaderSettingsSchema.parse(parsed)
        setReaderSettings(validated)
      }
    } catch {
      // 解析或验证失败时使用默认值，静默失败
      setReaderSettings(DEFAULT_READER_SETTINGS)
    }
  }, [])

  const selectArticle = useCallback((id: string | null) => {
    setSelectedArticleId(id)
  }, [])

  const updateSettings = useCallback((settings: ReaderSettings) => {
    setReaderSettings(settings)
    try {
      localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // 存储失败时静默忽略
    }
  }, [])

  const resetSettings = useCallback(() => {
    setReaderSettings(DEFAULT_READER_SETTINGS)
    try {
      localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(DEFAULT_READER_SETTINGS))
    } catch {
      // 存储失败时静默忽略
    }
  }, [])

  const value: ReaderContextType = {
    selectedArticleId,
    readerSettings,
    selectArticle,
    updateSettings,
    resetSettings,
  }

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
}
