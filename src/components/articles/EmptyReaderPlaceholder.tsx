import { Rss } from 'lucide-react'

export function EmptyReaderPlaceholder() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Rss className="w-16 h-16 mb-4 opacity-20" />
      <p className="text-lg font-medium">选择一篇文章开始阅读</p>
      <p className="text-sm mt-1">从左侧列表中选择感兴趣的文章</p>
    </div>
  )
}
