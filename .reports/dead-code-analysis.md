# 死代码分析报告

**项目**: rss-desktop (Tauri + React 19 + TypeScript)
**日期**: 2026-02-17
**分析工具**: knip + depcheck

---

## 摘要

| 类别 | 数量 | 状态 |
|------|------|------|
| 未使用的文件 | 1 | 误报 |
| 未使用的依赖 | 2 | 误报 |
| 未使用的函数导出 | 4 | 可评估 |
| 未使用的类型导出 | 21 | 可评估 |

---

## 测试验证

```
✅ 测试状态: 702 passed (39 files)
```

---

## 1. knip 分析结果

### 未使用的文件 (1)

| 文件 | 严重程度 | 说明 | 建议 |
|------|----------|------|------|
| `tests/fixtures/tauri-api-mock.ts` | 误报 | E2E 测试通过 vite.config.ts 的 alias 条件使用 | **保留** |

**验证**: 该文件在 `E2E_TEST=true` 或 `PLAYWRIGHT=true` 时被 vite 别名使用 (`vite.config.ts:21-24`)。

---

### 未使用的依赖

| 依赖 | 类型 | knip/depcheck 报告 | 实际情况 | 建议 |
|------|------|-------------------|----------|------|
| `highlight.js` | dependency | 未使用 | 通过 `rehype-highlight` 插件间接使用 | **保留** |
| `mocks` (`link:@tauri-apps/api/mocks`) | devDependency | 未使用 | 集成测试使用 `@tauri-apps/api/mocks` | **保留** |
| `@tailwindcss/typography` | dependency | depcheck 报告未使用 | CSS 类使用 (`prose`) | **保留** |
| `tailwindcss` | devDependency | depcheck 报告未使用 | 通过 `@tailwindcss/vite` 使用 | **保留** |
| `@vitest/coverage-v8` | devDependency | depcheck 报告未使用 | vitest 覆盖率配置使用 | **保留** |

---

### 未使用的函数导出 (4)

| 导出 | 文件位置 | 说明 | 建议 |
|------|----------|------|------|
| `AppSettingsSchema` | `src/lib/settings.ts:68` | Zod schema，用于类型推断 | 评估是否需要导出 |
| `AiSettingsSchema` | `src/lib/settings.ts:108` | Zod schema，用于类型推断 | 评估是否需要导出 |
| `SchedulerStateSchema` | `src/lib/settings.ts:124` | Zod schema，用于类型推断 | 评估是否需要导出 |
| `getMockFeeds` | `tests/fixtures/tauri-mock.ts:619` | 测试辅助函数，未被使用 | **可删除** |

---

### 未使用的类型导出 (21)

这些是 React 组件的 Props 类型接口，被导出但未被其他文件导入。它们可能用于：
1. 类型文档 - 显式导出便于 IDE 提示
2. 扩展性 - 为未来使用预留
3. 一致性 - 保持 API 一致性

| 类型 | 文件位置 |
|------|----------|
| `ArticleCardProps` | `src/components/articles/ArticleCard.tsx:7` |
| `ArticleListHeaderProps` | `src/components/articles/ArticleListHeader.tsx:5` |
| `EmptyReaderPlaceholderProps` | `src/components/articles/EmptyReaderPlaceholder.tsx:4` |
| `SectionHeaderAction` | `src/components/feeds/SectionHeader.tsx:10` |
| `SectionHeaderProps` | `src/components/feeds/SectionHeader.tsx:19` |
| `QueuePanelProps` | `src/components/queue/QueuePanel.tsx:4` |
| `QueueTaskDetailDialogProps` | `src/components/queue/QueueTaskDetailDialog.tsx:8` |
| `SettingToggleProps` | `src/components/settings/SettingToggle.tsx:41` |
| `BadgeProps` | `src/components/ui/Badge.tsx:3` |
| `ButtonProps` | `src/components/ui/Button.tsx:4` |
| `ChangelogDialogProps` | `src/components/ui/ChangelogDialog.tsx:5` |
| `DialogProps` | `src/components/ui/Dialog.tsx:21` |
| `InputProps` | `src/components/ui/Input.tsx:4` |
| `MarkdownRendererProps` | `src/components/ui/MarkdownRenderer.tsx:6` |
| `UpdateBannerProps` | `src/components/ui/UpdateBanner.tsx:4` |
| `UpdateInfo` | `src/hooks/useAutoUpdater.ts:9` |
| `UseAutoUpdaterReturn` | `src/hooks/useAutoUpdater.ts:23` |
| `UseQueueStatusReturn` | `src/hooks/useQueueStatus.ts:6` |
| `UpdateStatus` | `src/hooks/useUpdater.ts:5` |
| `UseUpdaterReturn` | `src/hooks/useUpdater.ts:22` |
| `ArticleViewState` | `src/lib/articleViewStateCache.ts:1` |

---

## 2. 历史分析 (2026-02-13)

以下是从之前手动静态分析中发现的问题，部分可能已被修复：

### 可安全删除 ✅

1. **`src/assets/react.svg`** — 未使用的资源文件
2. **`src/types/index.ts`**: 移除 `ApiResponse<T>`, `QueueTaskStatusType`
3. **`src/types/index.ts`**: 移除重复的 `PollInterval`, `NotificationType`, `AppSettings`, `SchedulerState`
4. **`src/lib/settings.ts`**: 移除 `formatPollInterval()`, `calculateNextRunTime()`
5. **`src/components/ui/Dialog.tsx`**: 移除 `DialogTrigger`, `DialogHeader`, `DialogTitle`, `DialogFooter`
6. **`src/contexts/ReaderContext.tsx`**: 移除未使用的重导出 `export { DEFAULT_READER_SETTINGS }`

### 重复类型定义 ⚠️

以下类型在 `src/types/index.ts` 和 `src/lib/settings.ts` 中重复定义：

| 类型 | 在 `types/index.ts` | 在 `settings.ts` | 实际使用来源 |
|------|---------------------|------------------|--------------|
| `PollInterval` | Line 115 | Line 7 | `settings.ts` |
| `NotificationType` | Line 120 | Line 12 | `settings.ts` |
| `AppSettings` | Line 125 | Line 17 | `settings.ts` |
| `SchedulerState` | Line 141 | Line 33 | `settings.ts` |

---

## 3. 建议操作

### 立即可删除 ✅

```diff
// tests/fixtures/tauri-mock.ts
- export function getMockFeeds(): FeedWithUnreadCount[] {
-   return [...MOCK_FEEDS]
- }
```

### 需要评估 ⚠️

1. **Zod Schemas** (`AppSettingsSchema`, `AiSettingsSchema`, `SchedulerStateSchema`)
   - 如果仅用于内部类型推断，可以改为 `type` 导出
   - 如果用于运行时验证，保留

2. **Props 类型接口**
   - 如果不打算在外部使用，可以移除 `export`
   - 或者统一保留以维持 API 一致性

### 不建议删除 ❌

- `tests/fixtures/tauri-api-mock.ts` — E2E 测试必需
- `highlight.js` — 代码语法高亮必需
- 组件 Props 接口 — React 惯例，便于未来使用

---

## 4. 代码库健康状态

- ✅ **无未使用组件** — 所有 React 组件都被导入和使用
- ✅ **无未使用 hooks** — `useQueueStatus` 被 `QueueIndicator` 使用
- ✅ **无未使用 contexts** — 所有 3 个 contexts (Rss, Reader, Theme) 都在使用
- ✅ **无循环依赖** 检测到
- ✅ **CSS 干净** — 所有 CSS 文件都被导入且选择器服务于活动主题
- ✅ **所有生产依赖都被使用**

---

## 5. 下一步

1. [ ] 删除未使用的 `getMockFeeds` 函数
2. [ ] 决定 Props 类型接口的导出策略
3. [ ] 考虑为 knip 添加配置文件以消除误报
4. [ ] 清理 `src/types/index.ts` 中的重复类型定义
