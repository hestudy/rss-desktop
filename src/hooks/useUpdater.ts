import { useState, useCallback, useRef } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'up-to-date'

interface UpdaterState {
  status: UpdateStatus
  newVersion: string | null
  releaseNotes: string | null
  progress: number
  errorMessage: string | null
}

export interface UseUpdaterReturn extends UpdaterState {
  checkForUpdates: () => Promise<void>
  downloadAndInstall: () => Promise<void>
  restartApp: () => Promise<void>
}

export function useUpdater(): UseUpdaterReturn {
  const [state, setState] = useState<UpdaterState>({
    status: 'idle',
    newVersion: null,
    releaseNotes: null,
    progress: 0,
    errorMessage: null,
  })

  const updateRef = useRef<Awaited<ReturnType<typeof check>>>(null)

  const checkForUpdates = useCallback(async () => {
    setState(prev => ({
      ...prev,
      status: 'checking',
      errorMessage: null,
    }))

    try {
      const update = await check()
      updateRef.current = update

      if (update) {
        setState(prev => ({
          ...prev,
          status: 'available',
          newVersion: update.version,
          releaseNotes: update.body ?? null,
        }))
      } else {
        setState(prev => ({
          ...prev,
          status: 'up-to-date',
        }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      if (message.includes('Could not fetch a valid release JSON')) {
        setState(prev => ({
          ...prev,
          status: 'up-to-date',
        }))
        return
      }

      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: message,
      }))
    }
  }, [])

  const downloadAndInstall = useCallback(async () => {
    const update = updateRef.current
    if (!update) return

    setState(prev => ({ ...prev, status: 'downloading', progress: 0 }))

    try {
      let totalSize = 0
      let downloaded = 0

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalSize = event.data.contentLength
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          if (totalSize > 0) {
            setState(prev => ({
              ...prev,
              progress: Math.round((downloaded / totalSize) * 100),
            }))
          }
        }
      })

      setState(prev => ({ ...prev, status: 'ready', progress: 100 }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [])

  const restartApp = useCallback(async () => {
    try {
      await relaunch()
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [])

  return {
    ...state,
    checkForUpdates,
    downloadAndInstall,
    restartApp,
  }
}
