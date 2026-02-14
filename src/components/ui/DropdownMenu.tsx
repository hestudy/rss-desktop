import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  cloneElement,
  isValidElement,
  ReactElement,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface DropdownMenuContextType {
  isOpen: boolean
  toggle: () => void
  close: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined)

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext)
  if (!context) throw new Error('DropdownMenu components must be used within DropdownMenu')
  return context
}

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <DropdownMenuContext.Provider value={{ isOpen, toggle, close, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: ReactNode
  asChild?: boolean
}) {
  const { toggle, triggerRef } = useDropdownMenu()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggle()
  }

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, {
      ref: triggerRef,
      onClick: handleClick,
    })
  }

  return (
    <button ref={triggerRef as React.RefObject<HTMLButtonElement>} onClick={handleClick}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const { isOpen, close, triggerRef } = useDropdownMenu()
  const contentRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!isOpen) return

    const trigger = triggerRef.current
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      const menuWidth = 160
      setPosition({
        top: rect.bottom + 4,
        left: align === 'end' ? rect.right - menuWidth : rect.left,
      })
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, close, triggerRef, align])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        'fixed z-[9999] min-w-[160px] bg-popover text-popover-foreground rounded-lg border shadow-lg py-1',
        'animate-in fade-in zoom-in-95 duration-100',
        className,
      )}
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body,
  )
}

export function DropdownMenuItem({
  children,
  onClick,
  variant = 'default',
  disabled = false,
  className,
  ...rest
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled' | 'className'>) {
  const { close } = useDropdownMenu()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onClick?.()
    close()
  }

  return (
    <button
      {...rest}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:opacity-50 disabled:pointer-events-none',
        variant === 'destructive' && 'text-destructive hover:text-destructive hover:bg-destructive/10',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-border my-1" />
}
