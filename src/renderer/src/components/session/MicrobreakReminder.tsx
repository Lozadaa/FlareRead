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
        <div className="bg-card/95 backdrop-blur-xl border border-primary/15 rounded-xl shadow-[0_8px_32px_-8px_hsla(var(--primary),0.12)] px-5 py-4 max-w-md">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, hsla(var(--primary), 0.1) 0%, hsla(var(--gold), 0.08) 100%)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ui-sm font-medium text-foreground">
                {message.title}
              </p>
              <p className="text-ui-xs text-muted-foreground truncate">
                {message.description}
              </p>
            </div>
            <span className="text-ui-sm font-mono tabular-nums text-primary font-medium">
              {timeStr}
            </span>
          </div>
          <button
            onClick={handleEndBreak}
            className="w-full mt-1 px-3 py-1.5 text-ui-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 btn-press transition-colors duration-200"
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
      <div className="bg-card/95 backdrop-blur-xl border border-gold/20 rounded-xl shadow-[0_8px_32px_-8px_hsla(38,80%,55%,0.15)] px-5 py-4 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gold/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ui-sm font-medium text-foreground">
              Time for a microbreak
            </p>
            <p className="text-ui-xs text-muted-foreground truncate">
              {message.title} — {message.description.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTakeBreak}
            className="flex-1 px-3 py-1.5 text-ui-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 btn-press transition-colors duration-200"
          >
            Take a break
          </button>
          <button
            onClick={onPostpone}
            className="flex-1 px-3 py-1.5 text-ui-xs font-medium rounded-lg border border-border text-foreground hover:bg-accent hover:border-primary/20 btn-press transition-all duration-200"
          >
            +5 min
          </button>
          <button
            onClick={onDisableToday}
            className="px-3 py-1.5 text-ui-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent btn-press transition-all duration-200"
          >
            Disable today
          </button>
        </div>
      </div>
    </div>
  )
}
