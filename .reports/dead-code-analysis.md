# Dead Code Analysis Report

**Project**: rss-desktop (Tauri + React 19 + TypeScript)
**Date**: 2026-02-13
**Analyzer**: Manual static analysis (import/export graph + grep)

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Unused Exports (types/interfaces) | 11 | SAFE |
| Unused Exports (functions) | 3 | SAFE |
| Unused Exports (constants/schemas) | 2 | SAFE |
| Unused Files/Assets | 1 | SAFE |
| Unused Dependencies | 2 | SAFE |
| Duplicated Type Definitions | 4 | CAUTION |
| Unused Dialog Sub-components | 4 | SAFE |

---

## 1. UNUSED EXPORTS — Types/Interfaces

### 🟢 SAFE: Exported interfaces only used internally (never imported elsewhere)

| File | Export | Used In | Severity |
|------|--------|---------|----------|
| `src/types/index.ts` | `ApiResponse<T>` | NOWHERE (only referenced in api.ts comment) | SAFE |
| `src/types/index.ts` | `QueueTaskPriority` | Only used internally in same file | SAFE |
| `src/types/index.ts` | `QueueTaskStatusType` | NOWHERE | SAFE |
| `src/types/index.ts` | `PollInterval` (duplicate) | NOWHERE from types/ — only used from settings.ts | SAFE |
| `src/types/index.ts` | `NotificationType` (duplicate) | NOWHERE from types/ — only used from settings.ts | SAFE |
| `src/types/index.ts` | `AppSettings` (duplicate) | NOWHERE from types/ — only used from settings.ts | SAFE |
| `src/types/index.ts` | `SchedulerState` (duplicate) | NOWHERE from types/ — only used from settings.ts | SAFE |
| `src/hooks/useQueueStatus.ts` | `UseQueueStatusReturn` | NOWHERE (only used internally) | SAFE |
| `src/components/ui/Input.tsx` | `InputProps` | NOWHERE (only used internally) | SAFE |
| `src/components/ui/Button.tsx` | `ButtonProps` | NOWHERE (only used internally) | SAFE |
| `src/components/ui/IconButton.tsx` | `IconButtonProps` | NOWHERE (only used internally) | SAFE |
| `src/components/ui/Badge.tsx` | `BadgeProps` | NOWHERE (only used internally) | SAFE |
| `src/components/ui/Dialog.tsx` | `DialogProps` | NOWHERE (only used internally) | SAFE |
| `src/components/queue/QueuePanel.tsx` | `QueuePanelProps` | NOWHERE (only used internally) | SAFE |
| `src/components/sidebar/SidebarNav.tsx` | `SidebarNavProps` | NOWHERE (only used internally) | SAFE |
| `src/components/articles/ArticleCard.tsx` | `ArticleCardProps` | NOWHERE (only used internally) | SAFE |
| `src/components/articles/ArticleListHeader.tsx` | `ArticleListHeaderProps` | NOWHERE (only used internally) | SAFE |
| `src/components/articles/EmptyReaderPlaceholder.tsx` | `EmptyReaderPlaceholderProps` | NOWHERE (only used internally) | SAFE |
| `src/components/feeds/SectionHeader.tsx` | `SectionHeaderAction` | NOWHERE (only used internally) | SAFE |
| `src/components/feeds/SectionHeader.tsx` | `SectionHeaderProps` | NOWHERE (only used internally) | SAFE |

> **Note**: Component Props interfaces being exported is a common React convention for reusability. These are NOT recommended for deletion — they enable consumers to type-check props if needed in the future.

---

## 2. UNUSED EXPORTS — Functions

### 🟢 SAFE: Functions exported but never imported in production code

| File | Export | Used In | Severity |
|------|--------|---------|----------|
| `src/lib/settings.ts` | `formatPollInterval()` | NOWHERE (only defined, never imported) | SAFE |
| `src/lib/settings.ts` | `calculateNextRunTime()` | NOWHERE (only defined, never imported) | SAFE |
| `src/lib/settings.ts` | `getSchedulerState()` | Only in test file `settings.test.ts` | SAFE |
| `src/lib/articleViewStateCache.ts` | `clearStaleEntries()` | Only in test file `articleViewStateCache.test.ts` | SAFE |
| `src/lib/articleViewStateCache.ts` | `getCacheSize()` | Only in test file `articleViewStateCache.test.ts` | SAFE |
| `src/contexts/ReaderContext.tsx` | `export { DEFAULT_READER_SETTINGS }` (re-export) | NOWHERE (consumers import directly from `@/types`) | SAFE |

---

## 3. UNUSED EXPORTS — Constants/Schemas

| File | Export | Used In | Severity |
|------|--------|---------|----------|
| `src/lib/settings.ts` | `SchedulerStateSchema` | Only internally in `getSchedulerState()` | SAFE |
| `src/lib/settings.ts` | `pollIntervalToMinutes()` | Only internally in settings.ts | SAFE |

---

## 4. UNUSED Dialog Sub-components

### 🟢 SAFE: Exported but never imported anywhere

| File | Export | Severity |
|------|--------|----------|
| `src/components/ui/Dialog.tsx` | `DialogTrigger` | SAFE |
| `src/components/ui/Dialog.tsx` | `DialogHeader` | SAFE |
| `src/components/ui/Dialog.tsx` | `DialogTitle` | SAFE |
| `src/components/ui/Dialog.tsx` | `DialogFooter` | SAFE |

> Only `Dialog` and `DialogContent` are actually imported by `AddFeedDialog` and `EditFeedDialog`.

---

## 5. UNUSED FILES/ASSETS

| File | Reason | Severity |
|------|--------|----------|
| `src/assets/react.svg` | Not imported or referenced anywhere in the codebase | SAFE |
| `public/tauri.svg` | Not referenced in any HTML, CSS, or TS file | SAFE |

---

## 6. UNUSED DEPENDENCIES

| Package | Type | Reason | Severity |
|---------|------|--------|----------|
| `happy-dom` | devDependency | Not referenced in any config or source file. Project uses `jsdom` for test environment. | SAFE |
| `mocks` (`link:@tauri-apps/api/mocks`) | devDependency | The `mocks` package alias is never imported directly. Integration tests import from `@tauri-apps/api/mocks` directly. | SAFE |

---

## 7. DUPLICATED TYPE DEFINITIONS

### 🟡 CAUTION: Types defined in both `src/types/index.ts` AND `src/lib/settings.ts`

| Type | In `types/index.ts` | In `settings.ts` | Actually Used From |
|------|---------------------|-------------------|--------------------|
| `PollInterval` | Line 115 | Line 7 | `settings.ts` only |
| `NotificationType` | Line 120 | Line 12 | `settings.ts` only |
| `AppSettings` | Line 125 | Line 17 | `settings.ts` only |
| `SchedulerState` | Line 141 | Line 33 | `settings.ts` only |

> These types in `types/index.ts` are dead — nobody imports them from there. All consumers use the versions from `settings.ts`.

---

## 8. SAFE DELETION CANDIDATES

### Priority 1: Zero-risk deletions (no imports anywhere)

1. **`src/assets/react.svg`** — Unused asset file
2. **`src/types/index.ts`**: Remove `ApiResponse<T>`, `QueueTaskStatusType`
3. **`src/types/index.ts`**: Remove duplicated `PollInterval`, `NotificationType`, `AppSettings`, `SchedulerState`
4. **`src/lib/settings.ts`**: Remove `formatPollInterval()`, `calculateNextRunTime()`
5. **`src/components/ui/Dialog.tsx`**: Remove `DialogTrigger`, `DialogHeader`, `DialogTitle`, `DialogFooter`
6. **`src/contexts/ReaderContext.tsx`**: Remove unused re-export `export { DEFAULT_READER_SETTINGS } from '../types'`
7. **`package.json`**: Remove `happy-dom` from devDependencies

### Priority 2: Test-only exports (safe but keep for test coverage)

These are only used in test files. Removing them would break tests:
- `src/lib/settings.ts`: `getSchedulerState()` (used in settings.test.ts)
- `src/lib/articleViewStateCache.ts`: `clearStaleEntries()`, `getCacheSize()` (used in cache tests)

> **Recommendation**: Keep these — they provide useful test coverage for internal logic.

### NOT recommended for deletion

- Component Props interfaces (`ButtonProps`, `InputProps`, etc.) — React convention, useful for future consumers
- `public/tauri.svg` — May be used by Tauri build process
- `mocks` devDependency — Linked package, may be needed for `@tauri-apps/api/mocks` resolution

---

## 9. CODEBASE HEALTH NOTES

- **No unused components** — All React components are imported and used
- **No unused hooks** — `useQueueStatus` is used by `QueueIndicator`
- **No unused contexts** — All 3 contexts (Rss, Reader, Theme) are used
- **No circular dependencies** detected
- **CSS is clean** — Both CSS files are imported and all selectors serve active themes
- **All production dependencies are used** — `clsx`, `date-fns`, `dompurify`, `lucide-react`, `react-resizable-panels`, `tailwind-merge`, `zod` all have active imports
