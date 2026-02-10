import { BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { getDatabase } from '../database'

// ─── Types ───────────────────────────────────────────

export type SessionState = 'running' | 'paused_afk' | 'break' | 'completed'

export interface SessionConfig {
  bookId: string
  pomodoroEnabled: boolean
  workMinutes: number
  breakMinutes: number
  afkTimeoutMinutes: number
  microbreakIntervalMinutes: number
}

export interface SessionSnapshot {
  sessionId: string
  bookId: string
  state: SessionState
  /** Milliseconds of active reading time */
  activeMs: number
  /** Current timer display in seconds (counts down for pomodoro, up for free) */
  timerSeconds: number
  /** Pomodoro phase remaining seconds (work or break) */
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
  /** Whether a microbreak reminder is due */
  microbreakDue: boolean
  /** Whether the user is currently on a microbreak */
  microbreakActive: boolean
  /** Total milliseconds spent on microbreaks */
  totalMicrobreakMs: number
  /** Configured interval in minutes (0 = disabled) */
  microbreakIntervalMinutes: number
}

const DEFAULT_CONFIG: SessionConfig = {
  bookId: '',
  pomodoroEnabled: true,
  workMinutes: 25,
  breakMinutes: 5,
  afkTimeoutMinutes: 5,
  microbreakIntervalMinutes: 20
}

// ─── Manager ─────────────────────────────────────────

export class StudySessionManager {
  private sessionId: string | null = null
  private bookId: string = ''
  private state: SessionState = 'completed'

  // Timing
  private activeMs: number = 0
  private totalAfkMs: number = 0
  private totalBreakMs: number = 0
  private startTime: string = ''
  private lastTickTime: number = 0
  private tickInterval: ReturnType<typeof setInterval> | null = null

  // Pomodoro
  private pomodoroEnabled: boolean = true
  private workMinutes: number = 25
  private breakMinutes: number = 5
  private pomodoroPhaseMs: number = 0 // elapsed ms in current pomodoro phase
  private completedPomodoros: number = 0

  // AFK detection
  private afkTimeoutMinutes: number = 5
  private lastActivityTime: number = 0
  private afkCheckInterval: ReturnType<typeof setInterval> | null = null
  private afkModalTimeoutMs: number = 60000 // 1 minute to respond to AFK modal
  private afkModalTimer: ReturnType<typeof setTimeout> | null = null
  private afkPausedAt: number = 0

  // Session metrics
  private highlightsDuring: number = 0
  private notesDuring: number = 0

  // Microbreak
  private microbreakIntervalMinutes: number = 20
  private activeMsSinceLastMicrobreak: number = 0
  private microbreakDue: boolean = false
  private microbreakActive: boolean = false
  private totalMicrobreakMs: number = 0
  private microbreakDisabledForSession: boolean = false

  // Callback for session end (used by focus wall manager)
  private onSessionEndCallback: (() => void) | null = null

  /** Register a callback that fires when session ends (for any reason) */
  onSessionEnd(callback: () => void): void {
    this.onSessionEndCallback = callback
  }

  // ─── Public API ──────────────────────────────────

  start(config: Partial<SessionConfig> & { bookId: string }): SessionSnapshot {
    if (this.sessionId && this.state !== 'completed') {
      this.endSession()
    }

    const merged = { ...DEFAULT_CONFIG, ...config }
    this.bookId = merged.bookId
    this.pomodoroEnabled = merged.pomodoroEnabled
    this.workMinutes = merged.workMinutes
    this.breakMinutes = merged.breakMinutes
    this.afkTimeoutMinutes = merged.afkTimeoutMinutes
    this.microbreakIntervalMinutes = merged.microbreakIntervalMinutes

    this.sessionId = randomUUID()
    this.state = 'running'
    this.activeMs = 0
    this.totalAfkMs = 0
    this.totalBreakMs = 0
    this.pomodoroPhaseMs = 0
    this.completedPomodoros = 0
    this.highlightsDuring = 0
    this.notesDuring = 0
    this.activeMsSinceLastMicrobreak = 0
    this.microbreakDue = false
    this.microbreakActive = false
    this.totalMicrobreakMs = 0
    this.microbreakDisabledForSession = false
    this.startTime = new Date().toISOString()
    this.lastTickTime = Date.now()
    this.lastActivityTime = Date.now()

    // Persist to DB
    this.createSessionInDb()

    // Start tick loop (1 second interval)
    this.startTicking()

    // Start AFK monitoring
    this.startAfkCheck()

    return this.getSnapshot()
  }

  stop(): SessionSnapshot {
    this.endSession()
    return this.getSnapshot()
  }

  reportActivity(): void {
    this.lastActivityTime = Date.now()

    // If we were in AFK state and user confirms, resume
    if (this.state === 'paused_afk') {
      this.resumeFromAfk()
    }
  }

  confirmPresence(): void {
    if (this.state === 'paused_afk') {
      this.resumeFromAfk()
    }
  }

  dismissAfkTimeout(): void {
    // User didn't respond to AFK modal in time — end session
    if (this.state === 'paused_afk') {
      this.endSession()
      this.broadcastState()
    }
  }

  skipBreak(): void {
    if (this.state === 'break') {
      this.transitionToWork()
    }
  }

  incrementHighlights(): void {
    if (this.sessionId) this.highlightsDuring++
  }

  incrementNotes(): void {
    if (this.sessionId) this.notesDuring++
  }

  /** User clicks "Take a break" — pause active time, start microbreak */
  microbreakTake(): void {
    if (this.state === 'running' && this.microbreakDue) {
      this.microbreakDue = false
      this.microbreakActive = true
      this.activeMsSinceLastMicrobreak = 0
      this.broadcastState()
    }
  }

  /** User ends their microbreak and resumes reading */
  microbreakEnd(): void {
    if (this.microbreakActive) {
      this.microbreakActive = false
      this.lastTickTime = Date.now()
      this.broadcastState()
    }
  }

  /** User clicks "Postpone 5 min" */
  microbreakPostpone(): void {
    if (this.microbreakDue) {
      this.microbreakDue = false
      // Reset counter but give credit for 5 min worth of reading
      // so the next reminder comes in 5 min, not a full interval
      const intervalMs = this.microbreakIntervalMinutes * 60 * 1000
      this.activeMsSinceLastMicrobreak = Math.max(0, intervalMs - 5 * 60 * 1000)
      this.broadcastState()
    }
  }

  /** User clicks "Disable for today" (this session) */
  microbreakDisableToday(): void {
    this.microbreakDue = false
    this.microbreakActive = false
    this.microbreakDisabledForSession = true
    this.broadcastState()
  }

  getSnapshot(): SessionSnapshot {
    const phaseTotalMs = this.pomodoroEnabled
      ? (this.state === 'break' ? this.breakMinutes : this.workMinutes) * 60 * 1000
      : 0

    const pomodoroRemainingSeconds = this.pomodoroEnabled
      ? Math.max(0, Math.ceil((phaseTotalMs - this.pomodoroPhaseMs) / 1000))
      : 0

    return {
      sessionId: this.sessionId || '',
      bookId: this.bookId,
      state: this.state,
      activeMs: this.activeMs,
      timerSeconds: Math.floor(this.activeMs / 1000),
      pomodoroRemainingSeconds,
      pomodoroEnabled: this.pomodoroEnabled,
      workMinutes: this.workMinutes,
      breakMinutes: this.breakMinutes,
      completedPomodoros: this.completedPomodoros,
      afkTimeoutMinutes: this.afkTimeoutMinutes,
      totalAfkMs: this.totalAfkMs,
      totalBreakMs: this.totalBreakMs,
      highlightsDuring: this.highlightsDuring,
      notesDuring: this.notesDuring,
      startTime: this.startTime,
      microbreakDue: this.microbreakDue,
      microbreakActive: this.microbreakActive,
      totalMicrobreakMs: this.totalMicrobreakMs,
      microbreakIntervalMinutes: this.microbreakIntervalMinutes
    }
  }

  isActive(): boolean {
    return this.sessionId !== null && this.state !== 'completed'
  }

  getSessionId(): string | null {
    return this.sessionId
  }

  getWrapUpData(): {
    snapshot: SessionSnapshot
    topHighlights: Array<{ id: string; text: string; color: string; cfi_range: string }>
  } {
    const snapshot = this.getSnapshot()
    let topHighlights: Array<{ id: string; text: string; color: string; cfi_range: string }> = []

    if (this.sessionId && this.bookId) {
      try {
        const db = getDatabase()
        topHighlights = db
          .prepare(
            `SELECT id, text, color, cfi_range FROM highlights
             WHERE book_id = ? AND created_at >= ?
             ORDER BY created_at DESC LIMIT 3`
          )
          .all(this.bookId, this.startTime) as typeof topHighlights
      } catch {
        // Silently fail if DB is unavailable
      }
    }

    return { snapshot, topHighlights }
  }

  // ─── Private ─────────────────────────────────────

  private startTicking(): void {
    this.stopTicking()
    this.tickInterval = setInterval(() => this.tick(), 1000)
  }

  private stopTicking(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  private tick(): void {
    const now = Date.now()
    const delta = now - this.lastTickTime
    this.lastTickTime = now

    if (this.state === 'running') {
      if (this.microbreakActive) {
        // During microbreak: don't count toward active time
        this.totalMicrobreakMs += delta
      } else {
        this.activeMs += delta
        this.pomodoroPhaseMs += delta
        this.activeMsSinceLastMicrobreak += delta

        // Check microbreak interval (only during work, not during Pomodoro breaks)
        if (
          !this.microbreakDisabledForSession &&
          !this.microbreakDue &&
          this.microbreakIntervalMinutes > 0
        ) {
          const intervalMs = this.microbreakIntervalMinutes * 60 * 1000
          if (this.activeMsSinceLastMicrobreak >= intervalMs) {
            this.microbreakDue = true
          }
        }

        // Check pomodoro work phase completion
        if (this.pomodoroEnabled) {
          const workPhaseMs = this.workMinutes * 60 * 1000
          if (this.pomodoroPhaseMs >= workPhaseMs) {
            this.completedPomodoros++
            this.transitionToBreak()
          }
        }
      }
    } else if (this.state === 'break') {
      this.totalBreakMs += delta
      this.pomodoroPhaseMs += delta

      // Check break phase completion
      if (this.pomodoroEnabled) {
        const breakPhaseMs = this.breakMinutes * 60 * 1000
        if (this.pomodoroPhaseMs >= breakPhaseMs) {
          this.transitionToWork()
        }
      }
    } else if (this.state === 'paused_afk') {
      this.totalAfkMs += delta
    }

    this.broadcastState()
  }

  private transitionToBreak(): void {
    this.state = 'break'
    this.pomodoroPhaseMs = 0
    this.lastTickTime = Date.now()
    // Suppress any pending microbreak during Pomodoro breaks
    this.microbreakDue = false
    this.microbreakActive = false
    this.broadcastState()
  }

  private transitionToWork(): void {
    this.state = 'running'
    this.pomodoroPhaseMs = 0
    this.lastTickTime = Date.now()
    this.lastActivityTime = Date.now()
    // Reset microbreak counter after Pomodoro break (user just rested)
    this.activeMsSinceLastMicrobreak = 0
    this.broadcastState()
  }

  private startAfkCheck(): void {
    this.stopAfkCheck()
    // Check every 5 seconds whether user has been idle
    this.afkCheckInterval = setInterval(() => {
      if (this.state !== 'running') return

      const idleMs = Date.now() - this.lastActivityTime
      const afkThresholdMs = this.afkTimeoutMinutes * 60 * 1000

      if (idleMs >= afkThresholdMs) {
        this.transitionToAfk()
      }
    }, 5000)
  }

  private stopAfkCheck(): void {
    if (this.afkCheckInterval) {
      clearInterval(this.afkCheckInterval)
      this.afkCheckInterval = null
    }
    if (this.afkModalTimer) {
      clearTimeout(this.afkModalTimer)
      this.afkModalTimer = null
    }
  }

  private transitionToAfk(): void {
    this.state = 'paused_afk'
    this.afkPausedAt = Date.now()
    this.lastTickTime = Date.now()
    // Clear any pending microbreak when going AFK
    this.microbreakDue = false
    this.microbreakActive = false

    // Start timeout for AFK modal — if no response, end session
    this.afkModalTimer = setTimeout(() => {
      if (this.state === 'paused_afk') {
        this.endSession()
        this.broadcastState()
      }
    }, this.afkModalTimeoutMs)

    this.broadcastState()
  }

  private resumeFromAfk(): void {
    if (this.afkModalTimer) {
      clearTimeout(this.afkModalTimer)
      this.afkModalTimer = null
    }

    this.state = 'running'
    this.lastActivityTime = Date.now()
    this.lastTickTime = Date.now()
    this.broadcastState()
  }

  private endSession(): void {
    this.stopTicking()
    this.stopAfkCheck()
    this.state = 'completed'

    // Persist final data to DB
    this.updateSessionInDb()

    this.broadcastState()

    // Notify listeners (e.g., focus wall manager)
    if (this.onSessionEndCallback) {
      try {
        this.onSessionEndCallback()
      } catch {
        // Ignore callback errors
      }
    }
  }

  private broadcastState(): void {
    const snapshot = this.getSnapshot()
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('session:state-update', snapshot)
      }
    }
  }

  // ─── Database Operations ─────────────────────────

  private createSessionInDb(): void {
    try {
      const db = getDatabase()
      db.prepare(
        `INSERT INTO sessions (id, book_id, start_time, session_type, status,
          pomodoro_work_min, pomodoro_break_min, pomodoro_enabled, afk_timeout_min)
         VALUES (?, ?, ?, 'study', 'active', ?, ?, ?, ?)`
      ).run(
        this.sessionId,
        this.bookId,
        this.startTime,
        this.workMinutes,
        this.breakMinutes,
        this.pomodoroEnabled ? 1 : 0,
        this.afkTimeoutMinutes
      )
    } catch (err) {
      console.error('Failed to create session in DB:', err)
    }
  }

  private updateSessionInDb(): void {
    if (!this.sessionId) return
    try {
      const db = getDatabase()
      db.prepare(
        `UPDATE sessions SET
          end_time = ?,
          active_ms = ?,
          status = ?,
          completed_pomodoros = ?,
          total_afk_ms = ?,
          total_break_ms = ?,
          highlights_during = ?,
          notes_during = ?
         WHERE id = ?`
      ).run(
        new Date().toISOString(),
        this.activeMs,
        this.state === 'completed' ? 'completed' : 'active',
        this.completedPomodoros,
        this.totalAfkMs,
        this.totalBreakMs,
        this.highlightsDuring,
        this.notesDuring,
        this.sessionId
      )
    } catch (err) {
      console.error('Failed to update session in DB:', err)
    }
  }

  /** Clean up on app quit */
  destroy(): void {
    if (this.isActive()) {
      this.endSession()
    }
    this.stopTicking()
    this.stopAfkCheck()
  }
}

// Singleton instance
let instance: StudySessionManager | null = null

export function getSessionManager(): StudySessionManager {
  if (!instance) {
    instance = new StudySessionManager()
  }
  return instance
}
