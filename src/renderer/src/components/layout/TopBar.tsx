import { ChevronRight } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
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
        'h-topbar bg-topbar border-b border-topbar-border flex items-center justify-between px-4 shrink-0',
        className
      )}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-ui-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            {crumb.onClick ? (
              <button
                onClick={crumb.onClick}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-topbar-foreground font-medium truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Actions slot */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  )
}
