import { cn } from '../../lib/utils'

export interface BadgeProps {
  /** Number to display */
  count: number
  /** Maximum number to display before showing "max+" */
  max?: number
  /** Visual variant */
  variant?: 'default' | 'secondary' | 'destructive'
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
  /** Show as a dot instead of number */
  dot?: boolean
  /** Show badge even when count is 0 */
  showZero?: boolean
  /** Additional CSS classes */
  className?: string
}

export function Badge({
  count,
  max = 99,
  variant = 'default',
  size = 'md',
  dot = false,
  showZero = false,
  className,
}: BadgeProps) {
  // Don't render if count is 0 or negative (unless showZero is true)
  if (count <= 0 && !showZero) {
    return null
  }

  // Dot mode
  if (dot) {
    return (
      <span
        data-testid="badge-dot"
        className={cn(
          'w-2 h-2 rounded-full',
          {
            'bg-primary': variant === 'default',
            'bg-secondary': variant === 'secondary',
            'bg-destructive': variant === 'destructive',
          },
          className
        )}
      />
    )
  }

  // Calculate display value
  const displayValue = count > max ? `${max}+` : String(count)

  return (
    <span
      aria-label={`${count} unread`}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full',
        // Variant styles
        {
          'bg-primary text-primary-foreground': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-destructive text-destructive-foreground': variant === 'destructive',
        },
        // Size styles
        {
          'text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5': size === 'sm',
          'text-xs px-2 py-0.5 min-w-[1.5rem] h-5': size === 'md',
          'text-sm px-2.5 py-1 min-w-[1.75rem] h-6': size === 'lg',
        },
        className
      )}
    >
      {displayValue}
    </span>
  )
}
