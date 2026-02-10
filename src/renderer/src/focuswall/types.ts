export type SessionState = 'running' | 'paused_afk' | 'break' | 'completed'

export interface SessionSnapshot {
  sessionId: string
  bookId: string
  state: SessionState
  activeMs: number
  timerSeconds: number
  pomodoroRemainingSeconds: number
  pomodoroEnabled: boolean
  workMinutes: number
  breakMinutes: number
  completedPomodoros: number
  afkTimeoutMinutes: number
  totalAfkMs: number
  totalBreakMs: number
  highlightsDuring: number
  notesDuring: number
  startTime: string
}

export interface FocusWallSettings {
  enabled: boolean
  preset: 'minimal' | 'gradient' | 'monochrome' | 'illustration'
  showTitle: boolean
  showTimer: boolean
  showProgress: boolean
  showMetric: boolean
  metric: 'wpm' | 'pagesPerHour'
}

export interface FocusWallSessionData {
  bookTitle: string
  bookAuthor: string | null
  sessionGoalMinutes: number
}

export interface PresetProps {
  session: SessionSnapshot
  sessionData: FocusWallSessionData
  settings: FocusWallSettings
  progress: number // 0-1
  timerDisplay: string
  metricDisplay: string
}

declare global {
  interface Window {
    focusWallApi: {
      onSessionUpdate: (callback: (snapshot: unknown) => void) => () => void
      onSessionData: (callback: (data: unknown) => void) => () => void
      onSettingsUpdate: (callback: (settings: unknown) => void) => () => void
    }
  }
}
