import { ReactNode, createContext, useContext, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DialogContextType {
  isOpen: boolean
  open: () => void
  close: () => void
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used within Dialog')
  }
  return context
}

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const open = useCallback(() => {
    if (controlledOpen === undefined) {
      setInternalOpen(true)
    }
    onOpenChange?.(true)
  }, [controlledOpen, onOpenChange])

  const close = useCallback(() => {
    if (controlledOpen === undefined) {
      setInternalOpen(false)
    }
    onOpenChange?.(false)
  }, [controlledOpen, onOpenChange])

  return (
    <DialogContext.Provider value={{ isOpen, open, close }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogContent({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  const { isOpen, close } = useDialog()

  if (!isOpen) return null

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={close} />
      <div
        className={cn(
          'relative z-[10001] bg-background rounded-xl shadow-xl border border-border max-w-md w-full p-6',
          'animate-in zoom-in-95 duration-200',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={close}
              aria-label="关闭"
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

