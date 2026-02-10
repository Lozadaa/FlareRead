import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('flareread-theme') as ThemeMode | null
    return stored ?? 'light'
  })
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(theme))

  // Apply theme class to document
  useEffect(() => {
    const apply = resolveTheme(theme)
    setResolved(apply)
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(apply)
    localStorage.setItem('flareread-theme', theme)
    // Also persist to SQLite for cross-window consistency
    window.api?.settings.set('appearance:theme', theme)
  }, [theme])

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => {
      const apply = getSystemTheme()
      setResolved(apply)
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(apply)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => {
      if (t === 'light') return 'dark'
      if (t === 'dark') return 'system'
      return 'light'
    }),
    []
  )

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
