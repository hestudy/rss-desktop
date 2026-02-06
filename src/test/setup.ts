import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 每个测试后清理
afterEach(() => {
  cleanup()
})

// 模拟 Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// 模拟 react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Group: 'div',
  Panel: 'div',
  ResizeHandle: 'div',
  useGroupRef: () => ({ current: null }),
}))
