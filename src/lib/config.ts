import { invoke } from '@tauri-apps/api/core'
import type { ExportedConfig } from './configExport'

/**
 * 导入结果
 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean
  /** 导入的 Feed 数量 */
  feedsImported: number
  /** 跳过的 Feed 数量 (重复或无效) */
  feedsSkipped: number
  /** 是否导入了应用设置 */
  settingsImported: boolean
  /** 是否导入了 AI 设置 */
  aiSettingsImported: boolean
  /** 错误信息 (仅在失败时) */
  error?: string
}

/**
 * 导出配置到文件
 *
 * 调用后端命令获取配置数据，用户可选择保存位置
 *
 * @returns 导出的配置数据
 * @throws 如果导出过程中发生错误
 */
export async function exportConfigToFile(): Promise<ExportedConfig> {
  const config = await invoke<ExportedConfig>('export_config')
  return config
}

/**
 * 从配置数据导入
 *
 * @param config - 要导入的配置数据
 * @returns 导入结果
 * @throws 如果导入过程中发生错误
 */
export async function importConfigFromFile(config: ExportedConfig): Promise<ImportResult> {
  const result = await invoke<ImportResult>('import_config', { config })
  return result
}
