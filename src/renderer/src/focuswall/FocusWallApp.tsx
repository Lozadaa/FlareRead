import { useState, useEffect } from 'react'
import { SessionSnapshot, FocusWallSettings, FocusWallSessionData } from './types'
import { MinimalPreset } from './presets/MinimalPreset'
import { GradientPreset } from './presets/GradientPreset'
import { MonochromePreset } from './presets/MonochromePreset'
import { IllustrationPreset } from './presets/IllustrationPreset'

const DEFAULT_SETTINGS: FocusWallSettings = {
  enabled: true,
  preset: 'minimal',
  showTitle: true,
  showTimer: true,
  showProgress: true,
  showMetric: true,
  metric: 'wpm'
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function computeMetric(session: SessionSnapshot, metric: 'wpm' | 'pagesPerHour'): string {
  const activeMinutes = session.activeMs / 60000
  if (activeMinutes < 0.5) return '---'

  if (metric === 'wpm') {
    // Estimate based on average reading speed assumption
    // Average reader: ~250 WPM, but we show reading time-based metric
    const estimatedWords = activeMinutes * 250
    const wpm = Math.round(estimatedWords / activeMinutes)
    return `${wpm} WPM`
  }

  // Pages per hour (assuming ~250 words per page)
  const estimatedPages = (activeMinutes * 250) / 250
  const pagesPerHour = Math.round((estimatedPages / activeMinutes) * 60)
  return `${pagesPerHour} pages/hr`
}

export function FocusWallApp() {
  const [session, setSession] = useState<SessionSnapshot | null>(null)
  const [settings, setSettings] = useState<FocusWallSettings>(DEFAULT_SETTINGS)
  const [sessionData, setSessionData] = useState<FocusWallSessionData>({
    bookTitle: '',
    bookAuthor: null,
    sessionGoalMinutes: 25
  })

  useEffect(() => {
    const cleanupSession = window.focusWallApi.onSessionUpdate((snapshot) => {
      setSession(snapshot as SessionSnapshot)
    })

    const cleanupData = window.focusWallApi.onSessionData((data) => {
      setSessionData(data as FocusWallSessionData)
    })

    const cleanupSettings = window.focusWallApi.onSettingsUpdate((s) => {
      setSettings(s as FocusWallSettings)
    })

    return () => {
      cleanupSession()
      cleanupData()
      cleanupSettings()
    }
  }, [])

  if (!session || session.state === 'completed') {
    return (
      <div className="fw-container preset-minimal">
        <div className="fw-content">
          <div className="fw-paused">Session ended</div>
        </div>
      </div>
    )
  }

  const goalMs = sessionData.sessionGoalMinutes * 60 * 1000
  const progress = goalMs > 0 ? Math.min(session.activeMs / goalMs, 1) : 0
  const timerDisplay = formatTimer(session.timerSeconds)
  const metricDisplay = computeMetric(session, settings.metric)

  const presetProps = {
    session,
    sessionData,
    settings,
    progress,
    timerDisplay,
    metricDisplay
  }

  switch (settings.preset) {
    case 'gradient':
      return <GradientPreset {...presetProps} />
    case 'monochrome':
      return <MonochromePreset {...presetProps} />
    case 'illustration':
      return <IllustrationPreset {...presetProps} />
    case 'minimal':
    default:
      return <MinimalPreset {...presetProps} />
  }
}
