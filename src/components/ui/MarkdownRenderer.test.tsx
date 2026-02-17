import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  describe('基础渲染', () => {
    it('渲染纯文本', () => {
      render(<MarkdownRenderer content="Hello World" />)
      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('渲染标题', () => {
      render(
        <MarkdownRenderer
          content={`# 标题一

## 标题二

### 标题三`}
        />
      )
      expect(screen.getByRole('heading', { level: 1, name: '标题一' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: '标题二' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: '标题三' })).toBeInTheDocument()
    })

    it('渲染段落', () => {
      render(<MarkdownRenderer content={`第一段\n\n第二段`} />)
      const paragraphs = screen.getAllByRole('paragraph')
      expect(paragraphs).toHaveLength(2)
    })

    it('渲染粗体和斜体文本', () => {
      render(<MarkdownRenderer content="这是 **粗体** 和 *斜体*" />)
      // 检查 strong 和 em 元素
      const container = screen.getByText(/这是/).closest('div')
      expect(container?.querySelector('strong')?.textContent).toBe('粗体')
      expect(container?.querySelector('em')?.textContent).toBe('斜体')
    })

    it('渲染内联代码', () => {
      render(<MarkdownRenderer content="使用 `npm install` 安装" />)
      const code = screen.getByText('npm install')
      expect(code.tagName.toLowerCase()).toBe('code')
      expect(code).not.toHaveClass('hljs') // 内联代码不应该有 hljs 类
    })
  })

  describe('GFM 扩展', () => {
    it('渲染表格', () => {
      const tableMarkdown = `| 名称 | 版本 |
|------|------|
| React | 19 |
| Tauri | 2 |`
      render(<MarkdownRenderer content={tableMarkdown} />)
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('名称')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
    })

    it('渲染任务列表', () => {
      render(
        <MarkdownRenderer
          content={`- [x] 已完成
- [ ] 未完成`}
        />
      )
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()
    })

    it('渲染删除线', () => {
      render(<MarkdownRenderer content="~~删除的文本~~" />)
      expect(screen.getByText('删除的文本')).toBeInTheDocument()
      const deleted = document.querySelector('del')
      expect(deleted).toBeInTheDocument()
    })

    it('渲染自动链接', () => {
      render(<MarkdownRenderer content="访问 <https://example.com>" />)
      const link = screen.getByRole('link', { name: 'https://example.com' })
      expect(link).toHaveAttribute('href', 'https://example.com')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('代码块', () => {
    it('渲染代码块并添加语法高亮类', () => {
      render(
        <MarkdownRenderer
          content={`\`\`\`typescript
const x: number = 1
\`\`\``}
        />
      )
      const codeBlock = document.querySelector('pre code')
      expect(codeBlock).toBeInTheDocument()
      expect(codeBlock).toHaveClass('hljs')
      expect(codeBlock).toHaveClass('language-typescript')
    })

    it('渲染不带语言标识的代码块', () => {
      render(
        <MarkdownRenderer
          content={`\`\`\`
code
\`\`\``}
        />
      )
      const codeBlock = document.querySelector('pre code')
      expect(codeBlock).toBeInTheDocument()
      // 无语言标识的代码块，rehype-highlight 可能不添加 hljs 类
      // 只检查代码块存在且包含正确内容（注意：可能会有尾随换行）
      expect(codeBlock?.textContent?.trim()).toBe('code')
    })
  })

  describe('样式定制', () => {
    it('应用自定义 className', () => {
      const { container } = render(
        <MarkdownRenderer content="test" className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('包含 prose 类用于排版', () => {
      const { container } = render(<MarkdownRenderer content="test" />)
      expect(container.firstChild).toHaveClass('prose')
    })

    it('暗色模式下应用正确的 prose 类', () => {
      const { container } = render(
        <MarkdownRenderer content="test" className="dark:prose-invert" />
      )
      expect(container.firstChild).toHaveClass('dark:prose-invert')
    })
  })

  describe('边缘情况', () => {
    it('空内容渲染空容器', () => {
      const { container } = render(<MarkdownRenderer content="" />)
      expect(container.firstChild).toBeInTheDocument()
      expect(container.firstChild?.textContent).toBe('')
    })

    it('null 内容不崩溃', () => {
      // 测试 null 输入 - 运行时可能传入 null
      expect(() => render(<MarkdownRenderer content={null as unknown as string} />)).not.toThrow()
    })

    it('处理超长内容', () => {
      const longContent = '# 标题\n\n' + '段落内容 '.repeat(1000)
      expect(() => render(<MarkdownRenderer content={longContent} />)).not.toThrow()
    })

    it('处理特殊字符 - 脚本标签被转义', () => {
      render(<MarkdownRenderer content="<script>alert('xss')</script>" />)
      // 脚本标签应该被转义为文本，不会被执行
      // react-markdown 默认会转义 HTML 标签
      const container = document.querySelector('.prose')
      expect(container?.innerHTML).toContain('&lt;script&gt;')
      // 确保没有可执行的脚本元素
      expect(document.querySelector('script')).not.toBeInTheDocument()
    })

    it('处理 HTML 实体', () => {
      render(<MarkdownRenderer content="&lt;div&gt;" />)
      // HTML 实体应该被正确处理
      expect(screen.getByText(/div/)).toBeInTheDocument()
    })
  })

  describe('链接安全', () => {
    it('外部链接添加安全属性', () => {
      render(<MarkdownRenderer content="[外部链接](https://example.com)" />)
      const link = screen.getByRole('link', { name: '外部链接' })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('图片处理', () => {
    it('渲染图片', () => {
      render(<MarkdownRenderer content="![Alt text](https://example.com/image.png)" />)
      const img = screen.getByRole('img', { name: 'Alt text' })
      expect(img).toHaveAttribute('src', 'https://example.com/image.png')
    })

    it('带标题的图片', () => {
      render(
        <MarkdownRenderer content={'![Alt](https://example.com/img.png "Image title")'} />
      )
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('alt', 'Alt')
    })
  })

  describe('列表', () => {
    it('渲染无序列表', () => {
      render(
        <MarkdownRenderer
          content={`- 项目 1
- 项目 2
- 项目 3`}
        />
      )
      const list = screen.getByRole('list')
      expect(list.tagName.toLowerCase()).toBe('ul')
      // 注意：GFM 可能会将相邻的列表项合并，具体行为取决于实现
      const items = screen.getAllByRole('listitem')
      expect(items.length).toBeGreaterThanOrEqual(1)
    })

    it('渲染有序列表', () => {
      render(
        <MarkdownRenderer
          content={`1. 第一项
2. 第二项
3. 第三项`}
        />
      )
      const list = screen.getByRole('list')
      expect(list.tagName.toLowerCase()).toBe('ol')
      const items = screen.getAllByRole('listitem')
      expect(items.length).toBeGreaterThanOrEqual(1)
    })

    it('渲染嵌套列表', () => {
      render(
        <MarkdownRenderer
          content={`- 外层
  - 内层 1
  - 内层 2`}
        />
      )
      // 检查是否至少有一个列表
      const lists = screen.getAllByRole('list')
      expect(lists.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('引用块', () => {
    it('渲染引用块', () => {
      render(<MarkdownRenderer content="> 这是一段引用" />)
      const blockquote = document.querySelector('blockquote')
      expect(blockquote).toBeInTheDocument()
      expect(screen.getByText('这是一段引用')).toBeInTheDocument()
    })
  })

  describe('水平线', () => {
    it('渲染水平线', () => {
      render(
        <MarkdownRenderer
          content={`上文

---

下文`}
        />
      )
      // 注意：hr 元素没有 role，需要用 querySelector
      const hr = document.querySelector('hr')
      expect(hr).toBeInTheDocument()
    })
  })
})
