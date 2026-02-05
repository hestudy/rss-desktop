import { ReactNode, createContext, useContext, useState, useCallback } from 'react'
import { cn } from '../../lib/utils'

interface ConfirmContextType {
  isOpen: boolean
  message: string
  title?: string
  confirm: (message: string, title?: string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState<string>()
  const [resolver, setResolver] = useState<{
    resolve: (value: boolean) => void
  } | null>(null)

  const confirm = useCallback((message: string, title?: string): Promise<boolean> => {
    setMessage(message)
    setTitle(title)
    setIsOpen(true)

    return new Promise((resolve) => {
      setResolver({ resolve })
    })
  }, [])

  const handleConfirm = () => {
    resolver?.resolve(true)
    setIsOpen(false)
  }

  const handleCancel = () => {
    resolver?.resolve(false)
    setIsOpen(false)
  }

  return (
    <ConfirmContext.Provider value={{ isOpen, message, title, confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
          <div className="relative z-50 bg-background rounded-lg shadow-lg border max-w-sm w-full p-6">
            {title && (
              <h3 className="text-lg font-semibold mb-4">{title}</h3>
            )}
            <p className="mb-6">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className={cn(
                  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
                  "h-10 px-4 py-2",
                  "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className={cn(
                  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
                  "h-10 px-4 py-2",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
