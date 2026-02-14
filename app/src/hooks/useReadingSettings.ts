import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/services'
import type { ReadingSettings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import type { ViewMode } from './useReader'

export interface ReaderSettings extends ReadingSettings {
  viewMode: ViewMode
}

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  ...DEFAULT_SETTINGS,
  viewMode: 'paginated',
}

export function useReadingSettings() {
  const { user } = useAuth()
  const uid = user?.uid
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load settings from Firestore
  useEffect(() => {
    if (!uid) return
    let cancelled = false

    settingsService.get(uid).then((doc) => {
      if (cancelled) return
      setSettings({
        fontSize: doc.fontSize,
        fontFamily: doc.fontFamily,
        lineHeight: doc.lineHeight,
        margin: doc.margin,
        contentWidth: doc.contentWidth,
        viewMode: DEFAULT_READER_SETTINGS.viewMode, // Not stored in Firestore yet
      })
      setLoaded(true)
    }).catch(() => {
      if (!cancelled) setLoaded(true)
    })

    return () => { cancelled = true }
  }, [uid])

  // Debounced save to Firestore
  const saveToFirestore = useCallback(
    (newSettings: ReaderSettings) => {
      if (!uid) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        const { viewMode: _, ...firestoreSettings } = newSettings
        settingsService.update(uid, firestoreSettings)
      }, 1000)
    },
    [uid]
  )

  const updateSettings = useCallback(
    (partial: Partial<ReaderSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial }
        saveToFirestore(next)
        return next
      })
    },
    [saveToFirestore]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return { settings, updateSettings, loaded }
}
