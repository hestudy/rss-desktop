import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DiscoverCategory } from '../../types'
import { cn } from '../../lib/utils'

interface DiscoverCategoryProps {
  categories: DiscoverCategory[]
  selectedCategoryId: string | null
  onSelect: (categoryId: string | null) => void
  /** 布局模式：horizontal 为水平换行布局，vertical 为垂直列表布局 */
  layout?: 'horizontal' | 'vertical'
}

// 动态获取 Lucide 图标
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>
  const Icon = icons[name]
  if (!Icon) return <LucideIcons.Rss className={className} />
  return <Icon className={className} />
}

export function DiscoverCategoryFilter({
  categories,
  selectedCategoryId,
  onSelect,
  layout = 'horizontal',
}: DiscoverCategoryProps) {
  const isVertical = layout === 'vertical'

  return (
    <div className={cn(
      isVertical ? 'flex flex-col gap-1.5' : 'flex flex-wrap gap-2'
    )}>
      {/* 全部分类按钮 */}
      <CategoryButton
        isSelected={selectedCategoryId === null}
        onClick={() => onSelect(null)}
        icon={<LucideIcons.LayoutGrid className="w-4 h-4" />}
        label="全部"
        isVertical={isVertical}
        testId="discover-category-button"
        dataCategory="all"
      />

      {/* 分类列表 */}
      {categories.map((category) => (
        <CategoryButton
          key={category.id}
          isSelected={selectedCategoryId === category.id}
          onClick={() => onSelect(category.id)}
          icon={<DynamicIcon name={category.icon} className="w-4 h-4" />}
          label={category.name}
          description={category.description}
          isVertical={isVertical}
          testId="discover-category-button"
          dataCategory={category.id}
        />
      ))}
    </div>
  )
}

interface CategoryButtonProps {
  isSelected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  description?: string
  isVertical: boolean
  testId?: string
  dataCategory?: string
}

function CategoryButton({
  isSelected,
  onClick,
  icon,
  label,
  description,
  isVertical,
  testId,
  dataCategory,
}: CategoryButtonProps) {
  return (
    <button
      data-testid={testId}
      data-category={dataCategory}
      onClick={onClick}
      title={description}
      className={cn(
        // 基础样式
        'relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        // 垂直布局时的特殊样式
        isVertical && 'w-full justify-start',
        // 选中状态
        isSelected
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted',
        // 选中时的微光效果
        isSelected && 'after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:animate-shimmer'
      )}
    >
      {/* 图标容器 */}
      <span className={cn(
        'flex-shrink-0 transition-transform duration-200',
        isSelected && 'scale-110',
        !isSelected && 'group-hover:scale-105'
      )}>
        {icon}
      </span>

      {/* 文字 */}
      <span className="truncate">{label}</span>

      {/* 选中指示器 */}
      {isSelected && isVertical && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-foreground/80 rounded-full" />
      )}
    </button>
  )
}
