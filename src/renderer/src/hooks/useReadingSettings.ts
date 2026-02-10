import { useState, useEffect, useCallback } from 'react'
import { ReadingSettings, DEFAULT_SETTINGS } from '@/types'

const SETTINGS_KEY = 'reader:settings'

export function useReadingSettings() {
  const [settings, setSettingsState] = useState<ReadingSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.settings.get(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
        } catch {
          // ignore parse errors, use defaults
        }
      }
      setLoaded(true)
    })
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<ReadingSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...patch }
        window.api.settings.set(SETTINGS_KEY, JSON.stringify(next))
        return next
      })
    },
    []
  )

  return { settings, updateSettings, loaded }
}
