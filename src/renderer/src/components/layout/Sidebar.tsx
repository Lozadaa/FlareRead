import { BookOpen, Library, BookMarked, Clock, StickyNote, Target, Sun, Moon, Monitor, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/components/ThemeProvider'
import { cn } from '@/lib/utils'

export type NavPage = 'dashboard' | 'library' | 'sessions' | 'notes' | 'goals' | 'settings'

interface SidebarProps {
  className?: string
  activePage?: NavPage
  onNavigate?: (page: NavPage) => void
}

const NAV_ITEMS: { id: NavPage; label: string; icon: typeof Library; tooltip: string }[] = [
  { id: 'dashboard', label: 'Currently Reading', icon: BookMarked, tooltip: 'Dashboard & currently reading' },
  { id: 'library', label: 'Library', icon: Library, tooltip: 'Your book library' },
  { id: 'sessions', label: 'Sessions', icon: Clock, tooltip: 'Reading sessions' },
  { id: 'notes', label: 'Notes', icon: StickyNote, tooltip: 'Your notes & highlights' },
  { id: 'goals', label: 'Goals', icon: Target, tooltip: 'Learning goals & tracks' }
]

export function Sidebar({ className, activePage = 'dashboard', onNavigate }: SidebarProps): JSX.Element {
  const { theme, toggleTheme } = useTheme()

  const themeIcon = theme === 'light' ? Moon : theme === 'dark' ? Sun : Monitor
  const themeLabel = theme === 'light' ? 'Dark mode' : theme === 'dark' ? 'System theme' : 'Light mode'
  const ThemeIcon = themeIcon

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'w-sidebar h-full bg-sidebar border-r border-sidebar-border flex flex-col shrink-0',
          className
        )}
      >
        {/* App branding */}
        <div className="h-topbar flex items-center gap-2 px-4 shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="text-ui-base font-semibold text-sidebar-foreground">JustRead</span>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-2">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => onNavigate?.(item.id)}
                    className={cn(
                      'w-full justify-start gap-2 text-ui-sm',
                      activePage === item.id
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Bottom actions */}
        <div className="px-2 py-2 space-y-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('settings')}
                className={cn(
                  'w-full justify-start gap-2 text-ui-sm',
                  activePage === 'settings'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings (Ctrl+,)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-full justify-start gap-2 text-ui-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <ThemeIcon className="h-4 w-4" />
                {themeLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
