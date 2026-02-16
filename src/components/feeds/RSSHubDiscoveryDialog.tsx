/**
 * RSSHub 发现对话框
 *
 * 允许用户通过两种方式发现和添加 RSSHub 订阅：
 * 1. URL 检测：输入网站 URL，自动检测可用的 RSSHub 订阅
 * 2. 平台搜索：搜索 RSSHub 支持的平台和路由
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { RSSHubApi } from '../../lib/rsshub'
import { useRss } from '../../contexts/RssContext'
import { getRSSHubSettings } from '../../lib/settings'
import type { DetectedRSSHubFeed, RSSHubRoute } from '../../types/rsshub'
import { getValidationErrorMessage } from '../../types/rsshub'
import { Search, Link2, Loader2, Plus, AlertCircle, CheckCircle, Edit3, ShieldCheck } from 'lucide-react'

type TabType = 'detect' | 'search'

interface RSSHubDiscoveryDialogProps {
  isOpen: boolean
  onClose: () => void
}

// 参数输入对话框状态
interface ParamInputDialogState {
  isOpen: boolean
  route: RSSHubRoute | null
  params: Record<string, string>
  status: 'idle' | 'validating' | 'adding' | 'success' | 'error'
  errorMessage: string | null
}

export function RSSHubDiscoveryDialog({
  isOpen,
  onClose,
}: RSSHubDiscoveryDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('detect')
  const { addFeed } = useRss()

  // 用户配置的 RSSHub 实例 URL
  const [instanceUrl, setInstanceUrl] = useState<string>('https://rsshub.app')

  // 延迟关闭的 timeout ref
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  // 加载用户配置的 RSSHub 实例
  useEffect(() => {
    if (isOpen) {
      getRSSHubSettings().then(settings => {
        setInstanceUrl(settings.instanceUrl)
      }).catch(() => {
        // 使用默认值
        setInstanceUrl('https://rsshub.app')
      })
    }
  }, [isOpen])

  // URL 检测状态
  const [detectUrl, setDetectUrl] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedFeeds, setDetectedFeeds] = useState<DetectedRSSHubFeed[]>([])
  const [detectError, setDetectError] = useState<string | null>(null)

  // 平台搜索状态
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RSSHubRoute[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 添加订阅状态
  const [validatingUrl, setValidatingUrl] = useState<string | null>(null)
  const [addingUrl, setAddingUrl] = useState<string | null>(null)
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set())
  const [addError, setAddError] = useState<string | null>(null)

  // 参数输入对话框状态
  const [paramDialog, setParamDialog] = useState<ParamInputDialogState>({
    isOpen: false,
    route: null,
    params: {},
    status: 'idle',
    errorMessage: null,
  })

  // 清理搜索定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // 处理 URL 检测
  const handleDetect = async () => {
    if (!detectUrl.trim()) return

    setIsDetecting(true)
    setDetectError(null)
    setDetectedFeeds([])

    try {
      const feeds = await RSSHubApi.detectFeeds(detectUrl.trim())
      setDetectedFeeds(feeds)
    } catch (err) {
      setDetectError(
        err instanceof Error ? err.message : '检测失败，请检查 URL 是否正确'
      )
    } finally {
      setIsDetecting(false)
    }
  }

  // 处理平台搜索
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchError(null)
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const routes = await RSSHubApi.searchRoutes(query.trim())
      setSearchResults(routes)
    } catch (err) {
      setSearchResults([])
      // 提供更详细的错误信息
      const errorMessage = err instanceof Error ? err.message : '搜索失败'
      setSearchError(`搜索失败: ${errorMessage}`)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // 搜索防抖
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)

    // 清除旧的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 设置新的防抖定时器
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }, [handleSearch])

  // 添加订阅（带验证）
  const handleAddFeed = useCallback(async (rssUrl: string) => {
    // 先验证 URL
    setValidatingUrl(rssUrl)
    setAddError(null)

    try {
      const validationResult = await RSSHubApi.validateRssUrl(rssUrl)

      if (!validationResult.valid) {
        // 验证失败，显示错误
        const errorMessage = getValidationErrorMessage(validationResult)
        setAddError(errorMessage)
        setValidatingUrl(null)
        return
      }

      // 验证成功，开始添加
      setValidatingUrl(null)
      setAddingUrl(rssUrl)

      await addFeed(rssUrl)
      setAddedUrls((prev) => new Set(prev).add(rssUrl))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加订阅失败'
      setAddError(errorMessage)
    } finally {
      setValidatingUrl(null)
      setAddingUrl(null)
    }
  }, [addFeed])

  // 处理需要参数的路由
  const handleRouteWithParams = useCallback((route: RSSHubRoute) => {
    const params = RSSHubApi.extractRouteParams(route.path)
    const initialParams: Record<string, string> = {}
    params.forEach((p) => {
      initialParams[p] = ''
    })

    setParamDialog({
      isOpen: true,
      route,
      params: initialParams,
      status: 'idle',
      errorMessage: null,
    })
  }, [])

  // 确认参数并添加订阅
  const handleConfirmParams = useCallback(async () => {
    if (!paramDialog.route) return

    const filledPath = RSSHubApi.fillRouteParams(
      paramDialog.route.path,
      paramDialog.params
    )

    // 检查是否所有参数都已填充
    if (RSSHubApi.hasRouteParams(filledPath)) {
      // 仍有未填充的参数
      return
    }

    const rssUrl = RSSHubApi.buildRssUrl(filledPath, { instanceUrl })

    // 设置验证中状态
    setParamDialog((prev) => ({
      ...prev,
      status: 'validating',
      errorMessage: null,
    }))

    try {
      // 验证 URL
      const validationResult = await RSSHubApi.validateRssUrl(rssUrl)

      if (!validationResult.valid) {
        // 验证失败，显示错误但保持对话框打开
        const errorMessage = getValidationErrorMessage(validationResult)
        setParamDialog((prev) => ({
          ...prev,
          status: 'error',
          errorMessage,
        }))
        return
      }

      // 验证成功，开始添加
      setParamDialog((prev) => ({
        ...prev,
        status: 'adding',
      }))

      await addFeed(rssUrl)

      // 添加成功
      setAddedUrls((prev) => new Set(prev).add(rssUrl))
      setParamDialog((prev) => ({
        ...prev,
        status: 'success',
      }))

      // 延迟关闭对话框，让用户看到成功状态
      closeTimeoutRef.current = setTimeout(() => {
        setParamDialog((prev) => ({ ...prev, isOpen: false }))
      }, 1500)
    } catch (error) {
      // 添加失败，显示错误但保持对话框打开
      const errorMessage = error instanceof Error ? error.message : '添加订阅失败'
      setParamDialog((prev) => ({
        ...prev,
        status: 'error',
        errorMessage,
      }))
    }
  }, [paramDialog.route, paramDialog.params, instanceUrl, addFeed])

  // 更新参数值
  const handleParamChange = useCallback((paramName: string, value: string) => {
    setParamDialog((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        [paramName]: value,
      },
    }))
  }, [])

  // 检查参数是否都已填写
  const allParamsFilled = useCallback(() => {
    const params = RSSHubApi.extractRouteParams(paramDialog.route?.path || '')
    return params.every((p) => paramDialog.params[p]?.trim())
  }, [paramDialog.route, paramDialog.params])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="RSSHub 发现" className="max-w-2xl">
        {/* Tab 切换 */}
        <div className="flex border-b border-border mb-4">
          <button
            role="tab"
            aria-selected={activeTab === 'detect'}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'detect'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('detect')}
          >
            <Link2 className="w-4 h-4" />
            URL 检测
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'search'}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('search')}
          >
            <Search className="w-4 h-4" />
            平台搜索
          </button>
        </div>

        {/* URL 检测 Tab */}
        {activeTab === 'detect' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="输入网站 URL（如 https://space.bilibili.com/123456）"
                value={detectUrl}
                onChange={(e) => setDetectUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDetect()}
                disabled={isDetecting}
              />
              <Button onClick={handleDetect} disabled={isDetecting || !detectUrl.trim()}>
                {isDetecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '检测'
                )}
              </Button>
            </div>

            {/* 检测错误 */}
            {detectError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>检测失败: {detectError}</span>
              </div>
            )}

            {/* 检测结果 */}
            {detectedFeeds.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  检测到 {detectedFeeds.length} 个订阅
                </h3>
                {detectedFeeds.map((feed, index) => (
                  <DetectedFeedItem
                    key={index}
                    feed={feed}
                    onAdd={() => handleAddFeed(feed.rssUrl)}
                    isValidating={validatingUrl === feed.rssUrl}
                    isAdding={addingUrl === feed.rssUrl}
                    isAdded={addedUrls.has(feed.rssUrl)}
                  />
                ))}
              </div>
            )}

            {/* 添加错误提示 */}
            {addError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            {/* 无结果提示 */}
            {!isDetecting && detectedFeeds.length === 0 && !detectError && detectUrl && (
              <div className="text-center text-muted-foreground py-8">
                <p>未检测到可用的 RSSHub 订阅</p>
                <p className="text-sm mt-1">请确认 URL 是否正确，或尝试手动搜索平台</p>
              </div>
            )}
          </div>
        )}

        {/* 平台搜索 Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索平台（如 bilibili、twitter、知乎）"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* 搜索错误 */}
            {searchError && (
              <div className="flex items-center justify-between gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="px-2 py-1 text-xs rounded hover:bg-destructive/20 transition-colors"
                >
                  重试
                </button>
              </div>
            )}

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {searchResults.map((route, index) => (
                  <RouteItem
                    key={index}
                    route={route}
                    onAdd={(path) => {
                      // 检查是否有参数需要填充
                      if (RSSHubApi.hasRouteParams(path)) {
                        handleRouteWithParams(route)
                      } else {
                        const rssUrl = RSSHubApi.buildRssUrl(path, { instanceUrl })
                        handleAddFeed(rssUrl)
                      }
                    }}
                    isValidating={validatingUrl === RSSHubApi.buildRssUrl(route.path, { instanceUrl })}
                    isAdding={addingUrl === RSSHubApi.buildRssUrl(route.path, { instanceUrl })}
                    isAdded={addedUrls.has(RSSHubApi.buildRssUrl(route.path, { instanceUrl }))}
                  />
                ))}
              </div>
            )}

            {/* 无结果提示 */}
            {!isSearching && searchQuery && searchResults.length === 0 && !searchError && (
              <div className="text-center text-muted-foreground py-8">
                <p>未找到匹配的平台或路由</p>
              </div>
            )}

            {/* 初始提示 */}
            {!searchQuery && (
              <div className="text-center text-muted-foreground py-8">
                <p>输入关键词搜索 RSSHub 支持的平台</p>
                <p className="text-sm mt-1">支持中文和英文搜索</p>
              </div>
            )}
          </div>
        )}

        {/* 参数输入对话框 */}
        {paramDialog.isOpen && paramDialog.route && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-medium mb-2">填写路由参数</h3>
              <p className="text-sm text-muted-foreground mb-4">
                路由 <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">{paramDialog.route.path}</code> 需要以下参数：
              </p>

              <div className="space-y-3 mb-6">
                {RSSHubApi.extractRouteParams(paramDialog.route.path).map((param) => (
                  <div key={param}>
                    <label htmlFor={`param-${param}`} className="block text-sm font-medium mb-1">
                      {param}
                    </label>
                    <Input
                      id={`param-${param}`}
                      type="text"
                      value={paramDialog.params[param] || ''}
                      onChange={(e) => {
                        handleParamChange(param, e.target.value)
                        // 清除错误状态当用户修改参数时
                        if (paramDialog.status === 'error') {
                          setParamDialog((prev) => ({ ...prev, status: 'idle', errorMessage: null }))
                        }
                      }}
                      placeholder={`输入 ${param}`}
                      disabled={paramDialog.status === 'validating' || paramDialog.status === 'adding' || paramDialog.status === 'success'}
                    />
                  </div>
                ))}
              </div>

              {/* 预览 RSS URL */}
              {allParamsFilled() && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">生成的 RSS URL：</p>
                  <p className="text-xs font-mono break-all">
                    {RSSHubApi.buildRssUrl(
                      RSSHubApi.fillRouteParams(paramDialog.route.path, paramDialog.params),
                      { instanceUrl }
                    )}
                  </p>
                </div>
              )}

              {/* 成功提示 */}
              {paramDialog.status === 'success' && (
                <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>添加成功</span>
                </div>
              )}

              {/* 错误提示 */}
              {paramDialog.status === 'error' && paramDialog.errorMessage && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>添加失败: {paramDialog.errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setParamDialog((prev) => ({ ...prev, isOpen: false, status: 'idle', errorMessage: null }))
                    setAddError(null)
                  }}
                  disabled={paramDialog.status === 'validating' || paramDialog.status === 'adding'}
                >
                  取消
                </Button>
                <Button
                  onClick={handleConfirmParams}
                  disabled={
                    !allParamsFilled() ||
                    paramDialog.status === 'validating' ||
                    paramDialog.status === 'adding' ||
                    paramDialog.status === 'success'
                  }
                >
                  {paramDialog.status === 'validating' ? (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-1 animate-pulse" />
                      验证中
                    </>
                  ) : paramDialog.status === 'adding' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      添加中
                    </>
                  ) : paramDialog.status === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      添加成功
                    </>
                  ) : (
                    '添加订阅'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 检测到的订阅项
function DetectedFeedItem({
  feed,
  onAdd,
  isValidating,
  isAdding,
  isAdded,
}: {
  feed: DetectedRSSHubFeed
  onAdd: () => void
  isValidating: boolean
  isAdding: boolean
  isAdded: boolean
}) {
  const isLoading = isValidating || isAdding

  return (
    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
            {feed.namespace}
          </span>
          <span className="font-medium truncate">{feed.title}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-1">{feed.rssUrl}</p>
      </div>
      <Button
        size="sm"
        variant={isAdded ? 'ghost' : 'default'}
        onClick={onAdd}
        disabled={isLoading || isAdded}
      >
        {isValidating ? (
          <>
            <ShieldCheck className="w-4 h-4 mr-1 animate-pulse" />
            验证中
          </>
        ) : isAdding ? (
          <>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            添加中
          </>
        ) : isAdded ? (
          <>
            <CheckCircle className="w-4 h-4 mr-1" />
            已添加
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-1" />
            添加
          </>
        )}
      </Button>
    </div>
  )
}

// 路由项
function RouteItem({
  route,
  onAdd,
  isValidating,
  isAdding,
  isAdded,
}: {
  route: RSSHubRoute
  onAdd: (path: string) => void
  isValidating: boolean
  isAdding: boolean
  isAdded: boolean
}) {
  const hasParams = RSSHubApi.hasRouteParams(route.path)
  const params = RSSHubApi.extractRouteParams(route.path)

  return (
    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
            {route.namespace}
          </span>
          <span className="font-medium truncate">{route.title}</span>
          {hasParams && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              需填写参数
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate mt-1">
          {route.path}
          {hasParams && (
            <span className="text-amber-600 dark:text-amber-400 ml-1">
              ({params.join(', ')})
            </span>
          )}
        </p>
      </div>
      <Button
        size="sm"
        variant={isAdded ? 'ghost' : 'default'}
        onClick={() => onAdd(route.path)}
        disabled={isValidating || isAdding || isAdded}
      >
        {isValidating ? (
          <>
            <ShieldCheck className="w-4 h-4 mr-1 animate-pulse" />
            验证中
          </>
        ) : isAdding ? (
          <>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            添加中
          </>
        ) : isAdded ? (
          <>
            <CheckCircle className="w-4 h-4 mr-1" />
            已添加
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-1" />
            添加
          </>
        )}
      </Button>
    </div>
  )
}
