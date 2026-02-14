import { cn } from '@/lib/utils'

interface SettingToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'inline-flex w-11 h-6 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block w-5 h-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

export { SettingToggle }
export type { SettingToggleProps }
