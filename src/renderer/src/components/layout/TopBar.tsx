import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Breadcrumb {
  label: string
  onClick?: () => void
}

interface TopBarProps {
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
  className?: string
}

export function TopBar({ breadcrumbs = [], actions, className }: TopBarProps): JSX.Element {
  return (
    <header
      className={cn(
        'h-topbar bg-topbar flex items-center justify-between px-5 shrink-0 topbar-underline',
        className
      )}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-ui-sm min-w-0">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1
          return (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-gold-muted/60 shrink-0" />
              )}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 truncate relative group"
                >
                  <span>{crumb.label}</span>
                  <span className="absolute left-0 -bottom-0.5 w-0 h-[1px] bg-primary/40 transition-all duration-300 group-hover:w-full" />
                </button>
              ) : (
                <span
                  className={cn(
                    'text-topbar-foreground truncate transition-colors duration-200',
                    isLast
                      ? 'font-display text-ui-lg font-medium tracking-tight'
                      : 'font-medium'
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>

      {/* Actions slot */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  )
}
