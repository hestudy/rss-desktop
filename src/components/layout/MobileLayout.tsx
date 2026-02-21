import { ReactNode } from 'react'
import { BottomNavigationBar } from './BottomNavigationBar'

interface MobileLayoutProps {
  children: ReactNode
}

/**
 * MobileLayout Component
 *
 * The main layout container for mobile devices. Provides:
 * - Full-screen layout with flexbox
 * - Safe area inset support for notched devices
 * - Bottom navigation bar integration
 * - Main content area that fills remaining space
 *
 * Usage:
 * ```tsx
 * <MobileLayout>
 *   <FeedView />
 * </MobileLayout>
 * ```
 */
export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="flex h-screen flex-col pt-[env(safe-area-inset-top)]">
      {/* Main content area */}
      <main className="flex-1 overflow-hidden" role="main">
        {children}
      </main>

      {/* Bottom navigation - sticky at bottom */}
      <div className="sticky bottom-0">
        <BottomNavigationBar />
      </div>
    </div>
  )
}
