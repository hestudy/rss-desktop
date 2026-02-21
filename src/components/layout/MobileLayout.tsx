import { ReactNode, useEffect, useState } from 'react'
import { BottomNavigationBar } from './BottomNavigationBar'

interface MobileLayoutProps {
  children: ReactNode
}

/**
 * MobileLayout Component
 */
export function MobileLayout({ children }: MobileLayoutProps) {
  const [height, setHeight] = useState('100vh')

  useEffect(() => {
    const updateHeight = () => {
      setHeight(`${window.innerHeight}px`)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, overflow: 'hidden' }}>
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {children}
      </div>

      {/* Bottom navigation */}
      <BottomNavigationBar />
    </div>
  )
}
