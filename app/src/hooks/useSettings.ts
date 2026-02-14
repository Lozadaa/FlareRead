import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/services'
import { DEFAULT_USER_SETTINGS } from '@/services/settings'
import type { UserSettingsDoc } from '@/types'

export type SettingsData = Omit<UserSettingsDoc, 'updatedAt'>

export function useSettings() {
  const { user } = useAuth()
  const uid = user?.uid
  const [settings, setSettings] = useState<SettingsData>({ ...DEFAULT_USER_SETTINGS })
  const [loading, setLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!uid) return
    let cancelled = false

    settingsService.get(uid).then((doc) => {
      if (cancelled) return
      const { updatedAt: _, ...rest } = doc
      setSettings({ ...DEFAULT_USER_SETTINGS, ...rest })
      setIsNewUser(!doc.onboardingComplete)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setIsNewUser(true)
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [uid])

  const saveToFirestore = useCallback(
    (data: Partial<SettingsData>) => {
      if (!uid) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        settingsService.update(uid, data)
      }, 800)
    },
    [uid]
  )

  const updateSettings = useCallback(
    (partial: Partial<SettingsData>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial }
        saveToFirestore(next)
        return next
      })
    },
    [saveToFirestore]
  )

  const completeOnboarding = useCallback(() => {
    setIsNewUser(false)
    updateSettings({ onboardingComplete: true })
  }, [updateSettings])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return { settings, updateSettings, loading, isNewUser, completeOnboarding }
}
