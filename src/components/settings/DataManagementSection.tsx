import { useState } from 'react'
import { Download, Upload, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { exportConfigToFile, importConfigFromFile } from '@/lib/config'
import type { ImportResult } from '@/lib/config'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface State {
  exportStatus: Status
  importStatus: Status
  message: string | null
  importResult: ImportResult | null
}

export function DataManagementSection() {
  const [state, setState] = useState<State>({
    exportStatus: 'idle',
    importStatus: 'idle',
    message: null,
    importResult: null,
  })

  const handleExport = async () => {
    setState((prev) => ({ ...prev, exportStatus: 'loading', message: null }))

    try {
      // 获取配置数据
      const config = await exportConfigToFile()

      // 打开保存对话框
      const filePath = await save({
        defaultPath: `rss-reader-config-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON', extensions: ['json'] },
        ],
      })

      if (!filePath) {
        // 用户取消
        setState((prev) => ({ ...prev, exportStatus: 'idle' }))
        return
      }

      // 写入文件
      await writeTextFile(filePath, JSON.stringify(config, null, 2))

      setState((prev) => ({
        ...prev,
        exportStatus: 'success',
        message: '配置导出成功',
      }))

      // 3秒后重置状态
      setTimeout(() => {
        setState((prev) => ({ ...prev, exportStatus: 'idle', message: null }))
      }, 3000)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        exportStatus: 'error',
        message: error instanceof Error ? error.message : '导出失败',
      }))
    }
  }

  const handleImport = async () => {
    setState((prev) => ({ ...prev, importStatus: 'loading', message: null, importResult: null }))

    try {
      // 打开文件选择对话框
      const filePath = await open({
        multiple: false,
        filters: [
          { name: 'JSON', extensions: ['json'] },
        ],
      })

      if (!filePath || typeof filePath !== 'string') {
        // 用户取消
        setState((prev) => ({ ...prev, importStatus: 'idle' }))
        return
      }

      // 读取文件内容
      const content = await readTextFile(filePath)
      const config = JSON.parse(content)

      // 导入配置
      const result = await importConfigFromFile(config)

      if (result.success) {
        setState((prev) => ({
          ...prev,
          importStatus: 'success',
          message: `导入成功：${result.feedsImported} 个订阅源${result.feedsSkipped > 0 ? `，跳过 ${result.feedsSkipped} 个重复` : ''}`,
          importResult: result,
        }))
      } else {
        setState((prev) => ({
          ...prev,
          importStatus: 'error',
          message: result.error || '导入失败',
          importResult: result,
        }))
      }

      // 5秒后重置状态
      setTimeout(() => {
        setState((prev) => ({ ...prev, importStatus: 'idle', message: null, importResult: null }))
      }, 5000)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        importStatus: 'error',
        message: error instanceof Error ? error.message : '导入失败',
      }))
    }
  }

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <div className="text-sm text-muted-foreground">
        <p>导出当前的订阅源和设置到 JSON 文件，方便备份或迁移到其他设备。</p>
      </div>

      {/* 安全警告 */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-700 dark:text-yellow-500">安全提示</p>
          <p className="text-yellow-600 dark:text-yellow-400/80 mt-1">
            API Key 不会被导出。导入配置后，需要在 AI 设置中重新配置 API Key。
          </p>
        </div>
      </div>

      {/* 导出按钮 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">导出配置</h3>
        <p className="text-xs text-muted-foreground mb-3">
          将所有订阅源、应用设置和 AI 设置（不含 API Key）导出到 JSON 文件
        </p>
        <button
          onClick={handleExport}
          disabled={state.exportStatus === 'loading'}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
            state.exportStatus === 'loading'
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {state.exportStatus === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              导出配置
            </>
          )}
        </button>
      </div>

      {/* 导入按钮 */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">导入配置</h3>
        <p className="text-xs text-muted-foreground mb-3">
          从 JSON 文件导入订阅源和设置。重复的订阅源（URL 相同）将被跳过。
        </p>
        <button
          onClick={handleImport}
          disabled={state.importStatus === 'loading'}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border',
            state.importStatus === 'loading'
              ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
              : 'border-primary text-primary hover:bg-primary/10'
          )}
        >
          {state.importStatus === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              导入中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              导入配置
            </>
          )}
        </button>
      </div>

      {/* 状态消息 */}
      {state.message && (
        <div
          className={cn(
            'flex items-start gap-2 p-3 rounded-lg text-sm',
            state.exportStatus === 'success' || state.importStatus === 'success'
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-red-500/10 text-red-700 dark:text-red-400'
          )}
        >
          {state.exportStatus === 'success' || state.importStatus === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      {/* 导入详情 */}
      {state.importResult && state.importResult.success && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">导入的订阅源</span>
            <span className="font-medium">{state.importResult.feedsImported}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">跳过的订阅源</span>
            <span className="font-medium">{state.importResult.feedsSkipped}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">应用设置</span>
            <span className="font-medium">{state.importResult.settingsImported ? '已导入' : '未导入'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">AI 设置</span>
            <span className="font-medium">{state.importResult.aiSettingsImported ? '已导入' : '未导入'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
