import { useState } from 'react'
import { type SessionConfig, DEFAULT_SESSION_CONFIG, type SessionMode } from '@/hooks/useStudySession'

interface StartSessionDialogProps {
  onStart: (config: SessionConfig) => void
  onDismiss: () => void
}

export function StartSessionDialog({ onStart, onDismiss }: StartSessionDialogProps) {
  const [mode, setMode] = useState<SessionMode>(DEFAULT_SESSION_CONFIG.mode)
  const [workMin, setWorkMin] = useState(DEFAULT_SESSION_CONFIG.workMin)
  const [breakMin, setBreakMin] = useState(DEFAULT_SESSION_CONFIG.breakMin)
  const [afkTimeoutMin, setAfkTimeoutMin] = useState(DEFAULT_SESSION_CONFIG.afkTimeoutMin)
  const [microbreakIntervalMin, setMicrobreakIntervalMin] = useState(DEFAULT_SESSION_CONFIG.microbreakIntervalMin)

  const handleStart = () => {
    onStart({ mode, workMin, breakMin, afkTimeoutMin, microbreakIntervalMin })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-display font-semibold text-foreground">
            Start Study Session
          </h2>
          <p className="text-ui-sm font-body text-muted-foreground mt-1">
            Configure your reading session
          </p>
        </div>

        {/* Mode selector */}
        <div className="px-6 pb-4">
          <label className="text-ui-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Session Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('pomodoro')}
              className={`
                flex-1 py-3 px-4 rounded-lg border text-ui-sm font-body font-medium transition-all
                ${mode === 'pomodoro'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }
              `}
            >
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Pomodoro
              </div>
            </button>
            <button
              onClick={() => setMode('free')}
              className={`
                flex-1 py-3 px-4 rounded-lg border text-ui-sm font-body font-medium transition-all
                ${mode === 'free'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }
              `}
            >
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                Free Reading
              </div>
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="px-6 pb-4 space-y-3">
          {mode === 'pomodoro' && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-ui-sm font-body text-foreground">Work duration</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWorkMin(Math.max(5, workMin - 5))}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
                  >
                    -
                  </button>
                  <span className="w-14 text-center text-ui-sm font-body font-medium text-foreground tabular-nums">
                    {workMin} min
                  </span>
                  <button
                    onClick={() => setWorkMin(Math.min(90, workMin + 5))}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-ui-sm font-body text-foreground">Break duration</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBreakMin(Math.max(1, breakMin - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
                  >
                    -
                  </button>
                  <span className="w-14 text-center text-ui-sm font-body font-medium text-foreground tabular-nums">
                    {breakMin} min
                  </span>
                  <button
                    onClick={() => setBreakMin(Math.min(30, breakMin + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <label className="text-ui-sm font-body text-foreground">AFK timeout</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAfkTimeoutMin(Math.max(1, afkTimeoutMin - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
              >
                -
              </button>
              <span className="w-14 text-center text-ui-sm font-body font-medium text-foreground tabular-nums">
                {afkTimeoutMin} min
              </span>
              <button
                onClick={() => setAfkTimeoutMin(Math.min(30, afkTimeoutMin + 1))}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-ui-sm font-body text-foreground">Microbreak reminder</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMicrobreakIntervalMin(Math.max(0, microbreakIntervalMin - 5))}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
              >
                -
              </button>
              <span className="w-14 text-center text-ui-sm font-body font-medium text-foreground tabular-nums">
                {microbreakIntervalMin === 0 ? 'Off' : `${microbreakIntervalMin}m`}
              </span>
              <button
                onClick={() => setMicrobreakIntervalMin(Math.min(120, microbreakIntervalMin + 5))}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-lg border border-border text-ui-sm font-body font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors"
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  )
}
