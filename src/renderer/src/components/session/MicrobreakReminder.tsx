import { useState, useEffect, useCallback, useRef } from 'react'
import { SessionSnapshot } from '@/types'

// ─── Rotating break suggestions ────────────────────────
const BREAK_MESSAGES = [
  { title: 'Look away', description: 'Focus on something 20 feet away for 20 seconds' },
  { title: 'Stretch', description: 'Roll your shoulders and stretch your neck gently' },
  { title: 'Hydrate', description: 'Take a sip of water — your brain needs it' },
  { title: 'Breathe', description: 'Take 3 slow, deep breaths in through your nose' },
  { title: 'Move', description: 'Stand up and walk around for a moment' },
  { title: 'Blink', description: 'Close your eyes for 10 seconds to rest them' },
  { title: 'Posture check', description: 'Sit up straight, feet flat on the floor' },
  { title: 'Relax your hands', description: 'Unclench your jaw and shake out your fingers' }
]

interface MicrobreakReminderProps {
  session: SessionSnapshot
  onTakeBreak: () => void
  onPostpone: () => void
  onDisableToday: () => void
  onEndBreak: () => void
}

export function MicrobreakReminder({
  session,
  onTakeBreak,
  onPostpone,
  onDisableToday,
  onEndBreak
}: MicrobreakReminderProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [breakSeconds, setBreakSeconds] = useState(0)
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pick a new message each time the reminder appears
  useEffect(() => {
    if (session.microbreakDue) {
      setMessageIndex((prev) => (prev + 1) % BREAK_MESSAGES.length)
    }
  }, [session.microbreakDue])

  // Track microbreak duration when active
  useEffect(() => {
    if (session.microbreakActive) {
      setBreakSeconds(0)
      breakTimerRef.current = setInterval(() => {
        setBreakSeconds((s) => s + 1)
      }, 1000)
    } else {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current)
        breakTimerRef.current = null
      }
    }
    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current)
        breakTimerRef.current = null
      }
    }
  }, [session.microbreakActive])

  const handleTakeBreak = useCallback(() => {
    onTakeBreak()
  }, [onTakeBreak])

  const handleEndBreak = useCallback(() => {
    onEndBreak()
  }, [onEndBreak])

  const message = BREAK_MESSAGES[messageIndex]

  // ─── Active microbreak overlay (lightweight, not full-screen blocking) ───
  if (session.microbreakActive) {
    const minutes = Math.floor(breakSeconds / 60)
    const secs = breakSeconds % 60
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`

    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[85] animate-in slide-in-from-top-4 fade-in duration-300">
        <div className="bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-lg px-6 py-4 max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {message.title}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {message.description}
              </p>
            </div>
            <span className="text-sm font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {timeStr}
            </span>
          </div>
          <button
            onClick={handleEndBreak}
            className="w-full mt-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            Resume reading
          </button>
        </div>
      </div>
    )
  }

  // ─── Microbreak reminder toast ─────────────────────────
  if (!session.microbreakDue || session.state !== 'running') return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[85] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-amber-50 dark:bg-amber-950/90 border border-amber-200 dark:border-amber-800 rounded-xl shadow-lg px-6 py-4 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Time for a microbreak
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {message.title} — {message.description.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTakeBreak}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Take a break
          </button>
          <button
            onClick={onPostpone}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            +5 min
          </button>
          <button
            onClick={onDisableToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-amber-500 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            Disable today
          </button>
        </div>
      </div>
    </div>
  )
}
