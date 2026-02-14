import type { SessionMode, SessionPhase } from '@/hooks/useStudySession'

interface SessionTimerProps {
  elapsedMs: number
  phase: SessionPhase
  phaseRemainingMs: number
  mode: SessionMode
  completedPomodoros: number
  onEnd: () => void
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function SessionTimer({
  elapsedMs,
  phase,
  phaseRemainingMs,
  mode,
  completedPomodoros,
  onEnd,
}: SessionTimerProps) {
  const isBreak = phase === 'break'

  return (
    <div className="flex items-center gap-2 animate-fade-in">
      {/* Phase indicator dot */}
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${
          isBreak ? 'bg-emerald-500 animate-pulse' : 'bg-primary'
        }`}
      />

      {/* Timer display */}
      <div className="flex items-center gap-1.5">
        {mode === 'pomodoro' ? (
          <>
            <span className={`text-ui-xs font-body font-medium tabular-nums ${
              isBreak ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
            }`}>
              {formatTime(phaseRemainingMs)}
            </span>
            <span className="text-ui-xs font-body text-muted-foreground">
              {isBreak ? 'break' : 'focus'}
            </span>
            {completedPomodoros > 0 && (
              <span className="text-ui-xs font-body text-muted-foreground/60 ml-0.5">
                #{completedPomodoros + (isBreak ? 0 : 1)}
              </span>
            )}
          </>
        ) : (
          <span className="text-ui-xs font-body font-medium text-foreground tabular-nums">
            {formatTime(elapsedMs)}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border" />

      {/* Total time (pomodoro) */}
      {mode === 'pomodoro' && (
        <>
          <span className="text-ui-xs font-body text-muted-foreground tabular-nums">
            {formatTime(elapsedMs)}
          </span>
          <div className="w-px h-4 bg-border" />
        </>
      )}

      {/* End button */}
      <button
        onClick={onEnd}
        className="text-ui-xs font-body font-medium text-destructive hover:text-destructive/80 transition-colors"
      >
        End
      </button>
    </div>
  )
}
