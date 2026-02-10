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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
