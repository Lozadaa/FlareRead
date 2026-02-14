import { useState, useEffect, useRef, useCallback } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { sessionsService } from '@/services'
import type { SessionDoc } from '@/types'

// ─── Types ──────────────────────────────────────────

export type SessionMode = 'pomodoro' | 'free'
export type SessionPhase = 'work' | 'break' | 'idle'

export interface SessionConfig {
  mode: SessionMode
  workMin: number
  breakMin: number
  afkTimeoutMin: number
  microbreakIntervalMin: number
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  mode: 'pomodoro',
  workMin: 25,
  breakMin: 5,
  afkTimeoutMin: 5,
  microbreakIntervalMin: 30,
}

export interface SessionStats {
  activeMs: number
  totalAfkMs: number
  totalBreakMs: number
  completedPomodoros: number
  highlightsDuring: number
  notesDuring: number
  pagesViewed: number
  wordsReadEstimate: number
}

export interface StudySessionState {
  active: boolean
  phase: SessionPhase
  config: SessionConfig
  elapsedMs: number          // Total active reading time
  phaseElapsedMs: number     // Time in current Pomodoro phase
  phaseRemainingMs: number   // Remaining in current phase (Pomodoro only)
  stats: SessionStats
  showAfkModal: boolean
  showMicrobreak: boolean
  showWrapUp: boolean
  sessionDoc: SessionDoc | null
}

// ─── Hook ───────────────────────────────────────────

export function useStudySession() {
  const { user } = useAuth()
  const uid = user?.uid

  // Core state
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<SessionPhase>('idle')
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_SESSION_CONFIG)
  const [sessionDoc, setSessionDoc] = useState<SessionDoc | null>(null)

  // Timers (ms)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [phaseElapsedMs, setPhaseElapsedMs] = useState(0)

  // Stats
  const [stats, setStats] = useState<SessionStats>({
    activeMs: 0,
    totalAfkMs: 0,
    totalBreakMs: 0,
    completedPomodoros: 0,
    highlightsDuring: 0,
    notesDuring: 0,
    pagesViewed: 0,
    wordsReadEstimate: 0,
  })

  // UI modals
  const [showAfkModal, setShowAfkModal] = useState(false)
  const [showMicrobreak, setShowMicrobreak] = useState(false)
  const [showWrapUp, setShowWrapUp] = useState(false)

  // Internal refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const afkStartRef = useRef<number | null>(null)
  const lastMicrobreakRef = useRef<number>(Date.now())
  const phaseStartRef = useRef<number>(0)
  const breakStartRef = useRef<number>(0)

  // ─── AFK Detection ────────────────────────────────

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()

    // If was AFK, record AFK time and dismiss modal
    if (afkStartRef.current !== null) {
      const afkDuration = Date.now() - afkStartRef.current
      setStats((s) => ({ ...s, totalAfkMs: s.totalAfkMs + afkDuration }))
      afkStartRef.current = null
      setShowAfkModal(false)
    }
  }, [])

  // Listen for mouse/keyboard activity when session is active
  useEffect(() => {
    if (!active || phase === 'break') return

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    const handler = () => {
      lastActivityRef.current = Date.now()
    }

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
    }
  }, [active, phase])

  // ─── Main Timer Tick ──────────────────────────────

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now()

      if (phase === 'work' || (phase === 'idle' && config.mode === 'free')) {
        // Check AFK
        const idleMs = now - lastActivityRef.current
        const afkThresholdMs = config.afkTimeoutMin * 60 * 1000

        if (idleMs >= afkThresholdMs && !showAfkModal && afkStartRef.current === null) {
          afkStartRef.current = now - idleMs
          setShowAfkModal(true)
          return // Don't count AFK time as active
        }

        if (afkStartRef.current !== null) {
          return // Paused during AFK
        }

        // Increment active time
        setElapsedMs((t) => t + 1000)
        setPhaseElapsedMs((t) => t + 1000)
        setStats((s) => ({ ...s, activeMs: s.activeMs + 1000 }))

        // Check Pomodoro work phase end
        if (config.mode === 'pomodoro') {
          const workMs = config.workMin * 60 * 1000
          setPhaseElapsedMs((current) => {
            if (current >= workMs) {
              // Work phase done → start break
              setPhase('break')
              breakStartRef.current = Date.now()
              setStats((s) => ({ ...s, completedPomodoros: s.completedPomodoros + 1 }))
              phaseStartRef.current = Date.now()
              return 0
            }
            return current
          })
        }

        // Check microbreak reminder (free mode or during work)
        if (config.microbreakIntervalMin > 0) {
          const microbreakMs = config.microbreakIntervalMin * 60 * 1000
          if (now - lastMicrobreakRef.current >= microbreakMs) {
            setShowMicrobreak(true)
            lastMicrobreakRef.current = now
          }
        }
      }

      if (phase === 'break') {
        setPhaseElapsedMs((t) => t + 1000)
        setStats((s) => ({ ...s, totalBreakMs: s.totalBreakMs + 1000 }))

        // Check if break is over
        const breakMs = config.breakMin * 60 * 1000
        setPhaseElapsedMs((current) => {
          if (current >= breakMs) {
            // Break over → start next work phase
            setPhase('work')
            phaseStartRef.current = Date.now()
            return 0
          }
          return current
        })
      }
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [active, phase, config, showAfkModal])

  // ─── Session Lifecycle ────────────────────────────

  const startSession = useCallback(
    async (bookId: string, sessionConfig: SessionConfig) => {
      if (!uid) return

      setConfig(sessionConfig)
      setElapsedMs(0)
      setPhaseElapsedMs(0)
      setStats({
        activeMs: 0,
        totalAfkMs: 0,
        totalBreakMs: 0,
        completedPomodoros: 0,
        highlightsDuring: 0,
        notesDuring: 0,
        pagesViewed: 0,
        wordsReadEstimate: 0,
      })
      setShowAfkModal(false)
      setShowMicrobreak(false)
      setShowWrapUp(false)

      lastActivityRef.current = Date.now()
      lastMicrobreakRef.current = Date.now()
      afkStartRef.current = null
      phaseStartRef.current = Date.now()

      // Create session in Firestore
      const doc = await sessionsService.create(uid, {
        bookId,
        startTime: Timestamp.now(),
        endTime: null,
        activeMs: 0,
        pagesViewed: 0,
        wordsReadEstimate: 0,
        sessionType: sessionConfig.mode,
        status: 'active',
        pomodoroWorkMin: sessionConfig.workMin,
        pomodoroBreakMin: sessionConfig.breakMin,
        pomodoroEnabled: sessionConfig.mode === 'pomodoro',
        completedPomodoros: 0,
        afkTimeoutMin: sessionConfig.afkTimeoutMin,
        totalAfkMs: 0,
        totalBreakMs: 0,
        highlightsDuring: 0,
        notesDuring: 0,
      })

      setSessionDoc(doc)
      setPhase(sessionConfig.mode === 'pomodoro' ? 'work' : 'idle')
      setActive(true)
    },
    [uid]
  )

  const endSession = useCallback(async () => {
    if (!uid || !sessionDoc) return

    setActive(false)
    setPhase('idle')

    // Finalize any ongoing AFK
    let finalAfkMs = stats.totalAfkMs
    if (afkStartRef.current !== null) {
      finalAfkMs += Date.now() - afkStartRef.current
      afkStartRef.current = null
    }

    const finalStats = {
      activeMs: stats.activeMs,
      pagesViewed: stats.pagesViewed,
      wordsReadEstimate: stats.wordsReadEstimate,
      totalAfkMs: finalAfkMs,
      totalBreakMs: stats.totalBreakMs,
      highlightsDuring: stats.highlightsDuring,
      notesDuring: stats.notesDuring,
      completedPomodoros: stats.completedPomodoros,
    }

    // Save to Firestore
    await sessionsService.endSession(uid, sessionDoc.id, finalStats)

    setStats((s) => ({ ...s, totalAfkMs: finalAfkMs }))
    setShowAfkModal(false)
    setShowMicrobreak(false)
    setShowWrapUp(true)
  }, [uid, sessionDoc, stats])

  const abandonSession = useCallback(async () => {
    if (!uid || !sessionDoc) return
    setActive(false)
    setPhase('idle')
    setShowAfkModal(false)
    setShowMicrobreak(false)
    setShowWrapUp(false)
    await sessionsService.update(uid, sessionDoc.id, { status: 'abandoned' })
    setSessionDoc(null)
  }, [uid, sessionDoc])

  const dismissAfk = useCallback(() => {
    resetActivity()
  }, [resetActivity])

  const dismissMicrobreak = useCallback(() => {
    setShowMicrobreak(false)
    lastMicrobreakRef.current = Date.now()
  }, [])

  const closeWrapUp = useCallback(() => {
    setShowWrapUp(false)
    setSessionDoc(null)
  }, [])

  const skipBreak = useCallback(() => {
    setPhase('work')
    setPhaseElapsedMs(0)
    phaseStartRef.current = Date.now()
  }, [])

  // Increment highlight/note counters
  const recordHighlight = useCallback(() => {
    setStats((s) => ({ ...s, highlightsDuring: s.highlightsDuring + 1 }))
  }, [])

  const recordNote = useCallback(() => {
    setStats((s) => ({ ...s, notesDuring: s.notesDuring + 1 }))
  }, [])

  // Compute remaining time for Pomodoro phases
  const phaseRemainingMs =
    config.mode === 'pomodoro'
      ? phase === 'work'
        ? Math.max(0, config.workMin * 60 * 1000 - phaseElapsedMs)
        : phase === 'break'
          ? Math.max(0, config.breakMin * 60 * 1000 - phaseElapsedMs)
          : 0
      : 0

  return {
    // State
    active,
    phase,
    config,
    elapsedMs,
    phaseElapsedMs,
    phaseRemainingMs,
    stats,
    showAfkModal,
    showMicrobreak,
    showWrapUp,
    sessionDoc,

    // Actions
    startSession,
    endSession,
    abandonSession,
    dismissAfk,
    dismissMicrobreak,
    closeWrapUp,
    skipBreak,
    recordHighlight,
    recordNote,
  }
}
