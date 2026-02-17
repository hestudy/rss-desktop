import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'

export interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string
  /** 自定义类名 */
  className?: string
}

/**
 * 可复用的 Markdown 渲染组件
 *
 * 支持:
 * - GitHub Flavored Markdown (GFM)
 * - 代码语法高亮
 * - 暗色/亮色主题适配
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // 处理空内容
  if (!content) {
    return <div className={cn('prose dark:prose-invert max-w-none', className)} />
  }

  return (
    <div className={cn('prose dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 为链接添加安全属性
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // 确保代码块有正确的类
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const isInline = !match && !codeClassName?.includes('hljs')

            if (isInline) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <code className={cn('hljs', codeClassName)} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
