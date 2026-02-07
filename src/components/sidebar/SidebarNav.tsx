import {
  Inbox,
  Mail,
  Star,
  Calendar,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { IconButton } from '../ui/IconButton'

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  inbox: Inbox,
  mail: Mail,
  star: Star,
  calendar: Calendar,
  settings: Settings,
}

export interface NavItem {
  /** Unique identifier */
  id: string
  /** Icon name (maps to lucide icon) */
  icon: string
  /** Label for accessibility */
  label: string
  /** Badge count */
  count?: number
}

export interface SidebarNavProps {
  /** Navigation items */
  items: NavItem[]
  /** Currently active item id */
  activeId: string
  /** Callback when item is selected */
  onSelect: (id: string) => void
  /** Layout direction */
  direction?: 'vertical' | 'horizontal'
  /** Additional CSS classes */
  className?: string
  /** Aria label for navigation */
  'aria-label'?: string
}

export function SidebarNav({
  items,
  activeId,
  onSelect,
  direction = 'vertical',
  className,
  'aria-label': ariaLabel,
}: SidebarNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1 p-2',
        {
          'flex-col': direction === 'vertical',
          'flex-row': direction === 'horizontal',
        },
        className
      )}
    >
      {items.map(item => {
        const Icon = iconMap[item.icon] || Inbox
        const isActive = item.id === activeId

        return (
          <IconButton
            key={item.id}
            icon={Icon}
            aria-label={item.label}
            badgeCount={item.count}
            active={isActive}
            variant="sidebar"
            size="md"
            onClick={() => onSelect(item.id)}
            className={cn(
              isActive && 'text-sidebar-active bg-sidebar-hover'
            )}
          />
        )
      })}
    </nav>
  )
}
