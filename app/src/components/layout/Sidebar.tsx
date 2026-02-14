import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAmbientSoundsContext } from '@/contexts/AmbientSoundsContext'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  tooltip: string
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    tooltip: 'Dashboard & currently reading',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    path: '/library',
    label: 'Library',
    tooltip: 'Your book library',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21" />
      </svg>
    ),
  },
  {
    path: '/sessions',
    label: 'Sessions',
    tooltip: 'Reading sessions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    path: '/notes',
    label: 'Notes',
    tooltip: 'Your notes & highlights',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
  },
  {
    path: '/goals',
    label: 'Goals',
    tooltip: 'Learning goals & tracks',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onOpenCommandPalette: () => void
}

export function Sidebar({ collapsed, onToggle, onOpenCommandPalette }: SidebarProps) {
  const { user, signOut } = useAuth()
  const { toggleOpen, hasActiveSounds, isOpen } = useAmbientSoundsContext()

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-full flex flex-col
          bg-card border-r border-border
          transition-all duration-300 ease-in-out
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64 translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className={`flex items-center border-b border-border h-14 shrink-0 ${collapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'}`}>
          <NavLink to="/" className="flex items-center gap-2 group">
            <span className="text-lg font-display font-bold tracking-tight">
              <span className="text-gold">F</span>
              {!collapsed && (
                <>
                  <span className="text-foreground">lare</span>
                  <span className="text-gold">R</span>
                  <span className="text-foreground">ead</span>
                </>
              )}
              {collapsed && <span className="hidden lg:inline text-gold">R</span>}
            </span>
          </NavLink>

          {/* Collapse toggle (desktop) */}
          <button
            onClick={onToggle}
            className={`
              hidden lg:flex items-center justify-center w-7 h-7 rounded-md
              text-muted-foreground hover:text-foreground hover:bg-accent
              transition-colors ml-auto
              ${collapsed ? '!hidden' : ''}
            `}
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024 && !collapsed) onToggle()
                  }}
                  className={({ isActive }) => `
                    flex items-center gap-3 rounded-lg font-body text-ui-sm
                    transition-all duration-200 relative
                    ${collapsed ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'px-3 py-2.5'}
                    ${isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                    }
                  `}
                  title={collapsed ? item.tooltip : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                      )}
                      <span className={`shrink-0 ${isActive ? 'text-primary' : ''}`}>
                        {item.icon}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className={`border-t border-border p-2 space-y-1 ${collapsed ? 'lg:px-1' : ''}`}>
          {/* Soundscapes toggle */}
          <button
            onClick={toggleOpen}
            className={`
              flex items-center gap-3 w-full rounded-lg font-body text-ui-xs
              transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0 px-3 py-2' : 'px-3 py-2'}
              ${isOpen || hasActiveSounds
                ? 'text-primary bg-primary/5 hover:bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }
            `}
            title="Soundscapes"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
            {!collapsed && (
              <span className="flex-1 text-left">Soundscapes</span>
            )}
            {!collapsed && hasActiveSounds && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </button>

          {/* Command palette hint */}
          <button
            onClick={onOpenCommandPalette}
            className={`
              flex items-center gap-3 w-full rounded-lg font-body text-ui-xs
              text-muted-foreground hover:text-foreground hover:bg-accent/60
              transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0 px-3 py-2' : 'px-3 py-2'}
            `}
            title="Command palette (Ctrl+K)"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                  Ctrl+K
                </kbd>
              </>
            )}
          </button>

          {/* Settings link */}
          <NavLink
            to="/settings"
            className={({ isActive }) => `
              flex items-center gap-3 rounded-lg font-body text-ui-sm
              transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0 px-3 py-2' : 'px-3 py-2'}
              ${isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }
            `}
            title={collapsed ? 'Settings' : undefined}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {/* User info */}
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="w-7 h-7 rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-ui-xs font-body text-foreground truncate">
                  {user?.displayName}
                </p>
                <button
                  onClick={signOut}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-body"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
