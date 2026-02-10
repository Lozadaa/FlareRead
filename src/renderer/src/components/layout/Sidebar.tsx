import { Library, BookMarked, Clock, StickyNote, Target, Sun, Moon, Monitor, Settings } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/components/ThemeProvider'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export type NavPage = 'dashboard' | 'library' | 'sessions' | 'notes' | 'goals' | 'settings'

interface SidebarProps {
  className?: string
  activePage?: NavPage
  onNavigate?: (page: NavPage) => void
}

const NAV_ITEMS: { id: NavPage; label: string; icon: typeof Library; tooltip: string }[] = [
  { id: 'dashboard', label: 'Reading', icon: BookMarked, tooltip: 'Dashboard & currently reading' },
  { id: 'library', label: 'Library', icon: Library, tooltip: 'Your book library' },
  { id: 'sessions', label: 'Sessions', icon: Clock, tooltip: 'Reading sessions' },
  { id: 'notes', label: 'Notes', icon: StickyNote, tooltip: 'Your notes & highlights' },
  { id: 'goals', label: 'Goals', icon: Target, tooltip: 'Learning goals & tracks' }
]

const LITERARY_QUOTES = [
  { text: 'A reader lives a thousand lives before he dies.', author: 'George R.R. Martin' },
  { text: 'There is no friend as loyal as a book.', author: 'Ernest Hemingway' },
  { text: 'A room without books is like a body without a soul.', author: 'Cicero' },
  { text: 'So many books, so little time.', author: 'Frank Zappa' },
  { text: 'Reading is a discount ticket to everywhere.', author: 'Mary Schmich' },
  { text: 'Books are a uniquely portable magic.', author: 'Stephen King' },
  { text: 'One must always be careful of books.', author: 'Cassandra Clare' }
]

function getDailyQuote(): (typeof LITERARY_QUOTES)[number] {
  const dayOfWeek = new Date().getDay()
  return LITERARY_QUOTES[dayOfWeek]
}

export function Sidebar({ className, activePage = 'dashboard', onNavigate }: SidebarProps): JSX.Element {
  const { theme, toggleTheme } = useTheme()
  const quote = getDailyQuote()

  const themeIcon = theme === 'light' ? Moon : theme === 'dark' ? Sun : Monitor
  const themeLabel = theme === 'light' ? 'Dark mode' : theme === 'dark' ? 'System theme' : 'Light mode'
  const ThemeIcon = themeIcon

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'w-sidebar h-full bg-sidebar flex flex-col shrink-0 relative sidebar-edge-glow',
          className
        )}
      >
        {/* App branding */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h1 className="font-display text-xl font-semibold italic tracking-tight text-sidebar-foreground">
            <span className="text-sidebar-gold not-italic">J</span>ust<span className="text-sidebar-gold not-italic">R</span>ead
          </h1>
          {/* Typographic ornament */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sidebar-border" />
            <span className="text-gold-muted text-xs leading-none select-none">&#10045;</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sidebar-border" />
          </div>
        </div>

        {/* Daily literary quote */}
        <div className="px-5 pb-4 shrink-0">
          <p className="font-display italic text-xs leading-tight text-muted-foreground/60 line-clamp-2">
            &ldquo;{quote.text}&rdquo;
            <span className="not-italic"> — {quote.author}</span>
          </p>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate?.(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-md relative',
                      'text-xs font-medium uppercase tracking-widest font-body',
                      'transition-all duration-200 ease-out',
                      activePage === item.id
                        ? 'text-primary'
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:translate-x-0.5 glass-hover'
                    )}
                  >
                    {activePage === item.id && (
                      <>
                        {/* Glass-morphism background for active item */}
                        <motion.div
                          layoutId="sidebar-active-bg"
                          className="absolute inset-0 rounded-md glass"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                        {/* Glowing left indicator */}
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-gold to-primary glow-indicator"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      </>
                    )}
                    <item.icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 relative z-[1] transition-opacity duration-200',
                        activePage === item.id ? 'opacity-90' : 'opacity-50'
                      )}
                    />
                    <span className="relative z-[1]">{item.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
        </ScrollArea>

        {/* Separator */}
        <div className="mx-5 my-1">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border/70 to-transparent" />
        </div>

        {/* Bottom actions */}
        <div className="px-3 pb-3 space-y-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onNavigate?.('settings')}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md relative',
                  'text-xs font-medium uppercase tracking-widest font-body',
                  'transition-all duration-200 ease-out',
                  activePage === 'settings'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:translate-x-0.5 glass-hover'
                )}
              >
                {activePage === 'settings' && (
                  <>
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 rounded-md glass"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-gold to-primary glow-indicator"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  </>
                )}
                <Settings
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 relative z-[1] transition-opacity duration-200',
                    activePage === 'settings' ? 'opacity-90' : 'opacity-50'
                  )}
                />
                <span className="relative z-[1]">Settings</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings (Ctrl+,)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md',
                  'text-xs font-medium uppercase tracking-widest font-body',
                  'transition-all duration-200 ease-out glass-hover',
                  'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:translate-x-0.5'
                )}
              >
                <motion.div
                  key={theme}
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="shrink-0"
                >
                  <ThemeIcon className="h-3.5 w-3.5 opacity-50" />
                </motion.div>
                {themeLabel}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>

          {/* Ctrl+K hint */}
          <div className="pt-2 flex justify-center">
            <kbd className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
