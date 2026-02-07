import { ChevronDown, ChevronRight, Plus, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'

// Icon mapping for action buttons
const actionIconMap: Record<string, LucideIcon> = {
  plus: Plus,
}

export interface SectionHeaderAction {
  /** Icon name */
  icon: string
  /** Accessibility label */
  label: string
  /** Click handler */
  onClick: () => void
}

export interface SectionHeaderProps {
  /** Section title */
  title: string
  /** Item count to display */
  count?: number
  /** Whether section is collapsible */
  collapsible?: boolean
  /** Whether section is collapsed */
  collapsed?: boolean
  /** Callback when collapse state changes */
  onToggle?: () => void
  /** Action button configuration */
  action?: SectionHeaderAction
  /** Section ID for aria-controls */
  sectionId?: string
  /** Additional CSS classes */
  className?: string
}

export function SectionHeader({
  title,
  count,
  collapsible = false,
  collapsed = false,
  onToggle,
  action,
  sectionId,
  className,
}: SectionHeaderProps) {
  const CollapseIcon = collapsed ? ChevronRight : ChevronDown
  const ActionIcon = action ? actionIconMap[action.icon] || Plus : null

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {collapsible && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls={sectionId}
            className="p-0.5 rounded hover:bg-sidebar-hover transition-colors"
          >
            <CollapseIcon className="w-3.5 h-3.5 text-sidebar-muted" />
          </button>
        )}

        <h3
          role="heading"
          className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted"
        >
          {title}
        </h3>

        {count !== undefined && count > 0 && (
          <Badge count={count} size="sm" variant="secondary" />
        )}
      </div>

      {action && ActionIcon && (
        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          className="p-1 rounded hover:bg-sidebar-hover transition-colors text-sidebar-muted hover:text-sidebar-fg"
        >
          <ActionIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
