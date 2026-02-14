import { useState, useEffect } from 'react'
import { getVersion } from '@tauri-apps/api/app'

export function useAppVersion(): string {
  const [version, setVersion] = useState('')

  useEffect(() => {
    let cancelled = false
    getVersion()
      .then((v) => {
        if (!cancelled) setVersion(`v${v}`)
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('Failed to get app version:', err)
        }
        if (!cancelled) setVersion('unknown')
      })
    return () => { cancelled = true }
  }, [])

  return version
}
