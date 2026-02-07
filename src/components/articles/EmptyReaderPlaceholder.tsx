import { Compass } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface EmptyReaderPlaceholderProps {
  /** Additional CSS classes */
  className?: string
}

export function EmptyReaderPlaceholder({ className }: EmptyReaderPlaceholderProps) {
  return (
    <div className={cn(
      'h-full flex flex-col items-center justify-center',
      className
    )}>
      <Compass
        data-testid="empty-reader-icon"
        className="w-16 h-16 text-muted-foreground/30"
      />
      <h2 className="text-xl font-medium mt-4 text-foreground">准备好开始阅读了吗?</h2>
      <p className="text-muted-foreground mt-2">从左侧选择一篇文章</p>
    </div>
  )
}
