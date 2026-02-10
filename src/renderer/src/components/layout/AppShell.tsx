import { Sidebar, NavPage } from './Sidebar'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
  activePage?: NavPage
  onNavigate?: (page: NavPage) => void
}

export function AppShell({ children, className, activePage, onNavigate }: AppShellProps): JSX.Element {
  return (
    <div className={cn('h-screen flex overflow-hidden bg-background', className)}>
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Subtle inner shadow from sidebar edge for depth */}
        <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 bg-gradient-to-r from-black/[0.02] to-transparent dark:from-black/[0.06]" />
        {children}
      </main>
    </div>
  )
}
