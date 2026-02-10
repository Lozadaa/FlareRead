import { useState, useEffect, useCallback, useRef } from 'react'
import { SessionSnapshot, SessionStartConfig, SessionWrapUpData } from '@/types'

interface UseStudySessionReturn {
  /** Current session snapshot (null if no session active) */
  session: SessionSnapshot | null
  /** Whether a session is currently active (any non-completed state) */
  isActive: boolean
  /** Start a new study session */
  startSession: (config: SessionStartConfig) => Promise<void>
  /** Stop the current session */
  stopSession: () => Promise<void>
  /** Confirm presence after AFK modal */
  confirmPresence: () => Promise<void>
  /** Handle AFK timeout (user didn't respond) */
  handleAfkTimeout: () => Promise<void>
  /** Skip the current break period */
  skipBreak: () => Promise<void>
  /** Get wrap-up data for the completed session */
  getWrapUp: () => Promise<SessionWrapUpData | null>
  /** Report user activity (call on mouse/keyboard events) */
  reportActivity: () => void
  /** Notify that a highlight was created during session */
  onHighlightCreated: () => void
  /** Notify that a note was created during session */
  onNoteCreated: () => void
  /** Take a microbreak (pauses active time) */
  microbreakTake: () => void
  /** End current microbreak (resume reading) */
  microbreakEnd: () => void
  /** Postpone microbreak by 5 minutes */
  microbreakPostpone: () => void
  /** Disable microbreak reminders for this session */
  microbreakDisableToday: () => void
}

export function useStudySession(): UseStudySessionReturn {
  const [session, setSession] = useState<SessionSnapshot | null>(null)
  const activityThrottleRef = useRef<number>(0)

  // Listen for state updates from main process
  useEffect(() => {
    // Check initial state
    window.sessionApi.getState().then((state) => {
      if (state) setSession(state as SessionSnapshot)
    })

    // Listen for real-time updates
    const cleanup = window.sessionApi.onStateUpdate((snapshot) => {
      setSession(snapshot as SessionSnapshot)
    })

    return cleanup
  }, [])

  const startSession = useCallback(async (config: SessionStartConfig) => {
    const snapshot = (await window.sessionApi.start(config)) as SessionSnapshot
    setSession(snapshot)
  }, [])

  const stopSession = useCallback(async () => {
    const snapshot = (await window.sessionApi.stop()) as SessionSnapshot
    setSession(snapshot)
  }, [])

  const confirmPresence = useCallback(async () => {
    const snapshot = (await window.sessionApi.confirmPresence()) as SessionSnapshot
    setSession(snapshot)
  }, [])

  const handleAfkTimeout = useCallback(async () => {
    const snapshot = (await window.sessionApi.afkTimeout()) as SessionSnapshot
    setSession(snapshot)
  }, [])

  const skipBreak = useCallback(async () => {
    const snapshot = (await window.sessionApi.skipBreak()) as SessionSnapshot
    setSession(snapshot)
  }, [])

  const getWrapUp = useCallback(async () => {
    const data = await window.sessionApi.getWrapUp()
    return data as SessionWrapUpData | null
  }, [])

  // Throttled activity reporting (max once per 2 seconds)
  const reportActivity = useCallback(() => {
    const now = Date.now()
    if (now - activityThrottleRef.current > 2000) {
      activityThrottleRef.current = now
      window.sessionApi.reportActivity()
    }
  }, [])

  const onHighlightCreated = useCallback(() => {
    window.sessionApi.incrementHighlight()
  }, [])

  const onNoteCreated = useCallback(() => {
    window.sessionApi.incrementNote()
  }, [])

  const microbreakTake = useCallback(() => {
    window.sessionApi.microbreakTake()
  }, [])

  const microbreakEnd = useCallback(() => {
    window.sessionApi.microbreakEnd()
  }, [])

  const microbreakPostpone = useCallback(() => {
    window.sessionApi.microbreakPostpone()
  }, [])

  const microbreakDisableToday = useCallback(() => {
    window.sessionApi.microbreakDisableToday()
  }, [])

  const isActive = session !== null && session.state !== 'completed'

  return {
    session,
    isActive,
    startSession,
    stopSession,
    confirmPresence,
    handleAfkTimeout,
    skipBreak,
    getWrapUp,
    reportActivity,
    onHighlightCreated,
    onNoteCreated,
    microbreakTake,
    microbreakEnd,
    microbreakPostpone,
    microbreakDisableToday
  }
}
