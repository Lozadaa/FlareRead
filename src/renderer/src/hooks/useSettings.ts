import { useState, useEffect, useCallback } from 'react'
import type { ThemeMode } from '@/components/ThemeProvider'

// ─── Settings Shape ──────────────────────────────────

export interface AppSettings {
  // Appearance
  'appearance:theme': ThemeMode
  'appearance:font': string
  'appearance:fontSize': number
  'appearance:lineHeight': number
  'appearance:margins': number

  // Reading
  'reading:defaultFocusMode': 'pomodoro' | 'free'
  'reading:autoFullscreen': boolean

  // Sessions
  'session:workMinutes': number
  'session:breakMinutes': number
  'session:afkTimeoutMinutes': number
  'session:microbreakInterval': number
  'session:reentryThresholdDays': number

  // Focus Walls
  'focuswall:defaultPreset': string
  'focuswall:showTimer': boolean
  'focuswall:showProgress': boolean
  'focuswall:showPomodoros': boolean

  // Soundscapes
  'soundscape:defaultSound': string
  'soundscape:autoPauseOnAfk': boolean

  // Wizard
  'wizard:completed': boolean
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  'appearance:theme': 'light',
  'appearance:font': 'Georgia, serif',
  'appearance:fontSize': 18,
  'appearance:lineHeight': 1.6,
  'appearance:margins': 60,

  'reading:defaultFocusMode': 'pomodoro',
  'reading:autoFullscreen': false,

  'session:workMinutes': 25,
  'session:breakMinutes': 5,
  'session:afkTimeoutMinutes': 5,
  'session:microbreakInterval': 20,
  'session:reentryThresholdDays': 3,

  'focuswall:defaultPreset': 'minimal',
  'focuswall:showTimer': true,
  'focuswall:showProgress': true,
  'focuswall:showPomodoros': true,

  'soundscape:defaultSound': 'none',
  'soundscape:autoPauseOnAfk': true,

  'wizard:completed': false
}

type SettingKey = keyof AppSettings

// ─── Hook ────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load all settings from SQLite on mount
  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      try {
        const rows = (await window.api.settings.getAll()) as Array<{ key: string; value: string }>
        if (cancelled) return

        const merged = { ...DEFAULT_APP_SETTINGS }
        for (const row of rows) {
          const key = row.key as SettingKey
          if (key in DEFAULT_APP_SETTINGS) {
            merged[key] = deserialize(key, row.value) as never
          }
        }
        setSettingsState(merged)
      } catch {
        // Use defaults on error
      }
      if (!cancelled) setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Update a single setting (persists immediately)
  const setSetting = useCallback(<K extends SettingKey>(key: K, value: AppSettings[K]) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }))
    window.api.settings.set(key, serialize(value))
  }, [])

  // Update multiple settings at once
  const setMultiple = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }))
    for (const [key, value] of Object.entries(patch)) {
      window.api.settings.set(key, serialize(value))
    }
  }, [])

  return { settings, setSetting, setMultiple, loaded }
}

// ─── Serialization helpers ───────────────────────────

function serialize(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function deserialize(key: SettingKey, raw: string): unknown {
  const defaultVal = DEFAULT_APP_SETTINGS[key]
  if (typeof defaultVal === 'string') return raw
  if (typeof defaultVal === 'boolean') {
    if (raw === 'true') return true
    if (raw === 'false') return false
    try { return JSON.parse(raw) } catch { return defaultVal }
  }
  if (typeof defaultVal === 'number') {
    const n = Number(raw)
    return isNaN(n) ? defaultVal : n
  }
  try { return JSON.parse(raw) } catch { return defaultVal }
}
