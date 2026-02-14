import { useEffect } from 'react'

export function useThemeEffect(theme: 'light' | 'dark' | 'system') {
  useEffect(() => {
    const root = document.documentElement

    function apply(resolved: 'light' | 'dark') {
      if (resolved === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches ? 'dark' : 'light')
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    apply(theme)
  }, [theme])
}
