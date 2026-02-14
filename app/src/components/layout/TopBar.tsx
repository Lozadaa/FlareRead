import { useLocation, useNavigate } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/library': 'Library',
  '/sessions': 'Sessions',
  '/notes': 'Notes',
  '/goals': 'Goals',
  '/settings': 'Settings',
}

interface TopBarProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export function TopBar({ sidebarCollapsed, onToggleSidebar }: TopBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'FlareRead'

  const handleImportClick = () => {
    // If already on library page, dispatch event to open import dialog
    if (location.pathname === '/library') {
      window.dispatchEvent(new CustomEvent('flareread:open-import'))
    } else {
      // Navigate to library with import flag
      navigate('/library?import=true')
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Expand sidebar button (desktop, when collapsed) */}
          {sidebarCollapsed && (
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          )}

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-ui-sm font-body">
            <span className="text-muted-foreground">FlareRead</span>
            <svg className="w-3.5 h-3.5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-foreground font-medium">{pageTitle}</span>
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportClick}
            className="
              inline-flex items-center gap-2 rounded-lg
              bg-primary text-primary-foreground
              px-3.5 py-1.5 text-ui-sm font-body font-medium
              hover:bg-primary/90 transition-colors
              shadow-sm
            "
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>
    </header>
  )
}
