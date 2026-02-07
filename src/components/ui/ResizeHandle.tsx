import { Separator } from 'react-resizable-panels'

interface ResizeHandleProps {
  /** 额外的 CSS 类名 */
  className?: string
  /** 元素 ID */
  id?: string
}

/**
 * 可拖拽调整大小的手柄组件
 * 用于连接两个可调整大小的面板
 *
 * @param className - 额外的 CSS 类名
 * @param id - 元素 ID
 */
export function ResizeHandle({ className = '', id = 'resize-handle' }: ResizeHandleProps) {
  return (
    <Separator
      id={id}
      data-testid="resize-handle"
      className={`bg-border hover:bg-muted-foreground/50 transition-colors ${className}`}
      style={{
        width: '4px',
      }}
    />
  )
}
