import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { ChangelogDialog } from './ChangelogDialog'

// Mock MarkdownRenderer
vi.mock('./MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="markdown-renderer" className={className}>
      {content}
    </div>
  ),
}))

describe('ChangelogDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    version: '1.0.0',
    content: '## 更新内容\n\n- 修复 Bug\n- 新增功能',
  }

  describe('基础渲染', () => {
    it('当 open 为 true 时渲染对话框', () => {
      render(<ChangelogDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('当 open 为 false 时不渲染对话框', () => {
      render(<ChangelogDialog {...defaultProps} open={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('显示版本号', () => {
      render(<ChangelogDialog {...defaultProps} version="2.1.0" />)
      expect(screen.getByText('v2.1.0')).toBeInTheDocument()
    })

    it('渲染标题', () => {
      render(<ChangelogDialog {...defaultProps} />)
      expect(screen.getByText('更新日志')).toBeInTheDocument()
    })
  })

  describe('内容渲染', () => {
    it('使用 MarkdownRenderer 渲染内容', () => {
      render(<ChangelogDialog {...defaultProps} />)
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
    })

    it('传递内容到 MarkdownRenderer', () => {
      render(<ChangelogDialog {...defaultProps} content="# 测试内容" />)
      expect(screen.getByText('# 测试内容')).toBeInTheDocument()
    })
  })

  describe('发布日期', () => {
    it('显示发布日期（如果提供）', () => {
      render(<ChangelogDialog {...defaultProps} publishedAt="2024-01-15" />)
      expect(screen.getByText(/2024-01-15/)).toBeInTheDocument()
    })

    it('不显示发布日期（如果未提供）', () => {
      render(<ChangelogDialog {...defaultProps} />)
      expect(screen.queryByText(/发布日期/)).not.toBeInTheDocument()
    })
  })

  describe('加载状态', () => {
    it('显示加载状态', () => {
      render(<ChangelogDialog {...defaultProps} content="" loading={true} />)
      expect(screen.getByText(/加载中/)).toBeInTheDocument()
    })

    it('加载时显示骨架屏或加载指示器', () => {
      const { container } = render(<ChangelogDialog {...defaultProps} content="" loading={true} />)
      // 检查是否有动画或加载指示器
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('错误处理', () => {
    it('显示错误信息', () => {
      render(<ChangelogDialog {...defaultProps} content="" error="加载失败" />)
      expect(screen.getByText(/加载失败/)).toBeInTheDocument()
    })

    it('显示重试按钮（当有错误时）', () => {
      const onRetry = vi.fn()
      render(<ChangelogDialog {...defaultProps} content="" error="加载失败" onRetry={onRetry} />)
      const retryButton = screen.getByText(/重试/)
      expect(retryButton).toBeInTheDocument()
    })

    it('点击重试按钮调用 onRetry', () => {
      const onRetry = vi.fn()
      render(<ChangelogDialog {...defaultProps} content="" error="加载失败" onRetry={onRetry} />)
      fireEvent.click(screen.getByText(/重试/))
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('关闭行为', () => {
    it('点击关闭按钮调用 onOpenChange', () => {
      const onOpenChange = vi.fn()
      render(<ChangelogDialog {...defaultProps} onOpenChange={onOpenChange} />)
      fireEvent.click(screen.getByLabelText(/关闭/))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('点击背景调用 onOpenChange', () => {
      const onOpenChange = vi.fn()
      render(<ChangelogDialog {...defaultProps} onOpenChange={onOpenChange} />)
      const backdrop = document.querySelector('.bg-black\\/50')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onOpenChange).toHaveBeenCalledWith(false)
      }
    })
  })

  describe('滚动区域', () => {
    it('长内容可滚动', () => {
      const longContent = '## 更新内容\n\n' + '- 更新项\n'.repeat(50)
      render(<ChangelogDialog {...defaultProps} content={longContent} />)
      // 检查是否有滚动容器
      const scrollContainer = document.querySelector('.overflow-y-auto')
      expect(scrollContainer).toBeInTheDocument()
    })
  })

  describe('样式', () => {
    it('应用自定义 className', () => {
      const { container } = render(<ChangelogDialog {...defaultProps} className="custom-class" />)
      // 自定义类应该应用到对话框内容区域
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })

    it('对话框有适当的最大高度', () => {
      render(<ChangelogDialog {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      // 检查是否有 max-h 类
      expect(dialog.className).toMatch(/max-h/)
    })
  })

  describe('GitHub 链接', () => {
    it('显示 GitHub Release 链接（如果提供）', () => {
      render(
        <ChangelogDialog
          {...defaultProps}
          releaseUrl="https://github.com/user/repo/releases/tag/v1.0.0"
        />
      )
      const link = screen.getByText(/在 GitHub 上查看/)
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://github.com/user/repo/releases/tag/v1.0.0')
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('不显示 GitHub 链接（如果未提供）', () => {
      render(<ChangelogDialog {...defaultProps} />)
      expect(screen.queryByText(/在 GitHub 上查看/)).not.toBeInTheDocument()
    })
  })

  describe('边缘情况', () => {
    it('空内容正常渲染', () => {
      render(<ChangelogDialog {...defaultProps} content="" />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('超长内容不会崩溃', () => {
      const veryLongContent = '## 更新\n\n' + '内容 '.repeat(10000)
      expect(() => render(<ChangelogDialog {...defaultProps} content={veryLongContent} />)).not.toThrow()
    })
  })
})
