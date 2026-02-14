import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/services'
import { useThemeEffect } from '@/hooks/useTheme'

/**
 * Loads the user's theme preference from Firestore and applies it to the DOM.
 * Placed high in the component tree so theme is applied on every page.
 */
export function ThemeApplicator() {
  const { user } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false

    settingsService.get(user.uid).then((doc) => {
      if (!cancelled) setTheme(doc.theme)
    })

    return () => { cancelled = true }
  }, [user?.uid])

  useThemeEffect(theme)

  return null
}
