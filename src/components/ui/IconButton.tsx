import { forwardRef, ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from './Badge'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide icon component */
  icon: LucideIcon
  /** Badge count to display */
  badgeCount?: number
  /** Show dot badge instead of count */
  showDot?: boolean
  /** Visual variant */
  variant?: 'default' | 'ghost' | 'sidebar'
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg'
  /** Active state */
  active?: boolean
  /** Tooltip text */
  tooltip?: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      badgeCount,
      showDot = false,
      variant = 'default',
      size = 'md',
      active = false,
      tooltip,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    // Icon sizes based on button size
    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        title={tooltip}
        aria-pressed={active ? 'true' : undefined}
        className={cn(
          'relative inline-flex items-center justify-center rounded-lg transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Size styles
          {
            'w-8 h-8': size === 'sm',
            'w-10 h-10': size === 'md',
            'w-12 h-12': size === 'lg',
          },
          // Variant styles
          {
            'hover:bg-accent hover:text-accent-foreground': variant === 'default' || variant === 'ghost',
            'text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover': variant === 'sidebar',
          },
          // Active state
          {
            'text-primary': active && variant !== 'sidebar',
            'text-sidebar-active': active && variant === 'sidebar',
          },
          className
        )}
        {...props}
      >
        <Icon className={iconSizes[size]} />

        {/* Badge */}
        {(badgeCount !== undefined && badgeCount > 0) && (
          <span className="absolute -top-1 -right-1">
            <Badge count={badgeCount} size="sm" variant="destructive" />
          </span>
        )}

        {/* Dot badge */}
        {showDot && !badgeCount && (
          <span className="absolute -top-0.5 -right-0.5">
            <Badge count={1} dot showZero variant="destructive" />
          </span>
        )}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

export { IconButton }
