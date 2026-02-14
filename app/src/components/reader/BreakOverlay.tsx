interface BreakOverlayProps {
  remainingMs: number
  completedPomodoros: number
  onSkip: () => void
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function BreakOverlay({ remainingMs, completedPomodoros, onSkip }: BreakOverlayProps) {
  const totalSec = Math.floor(remainingMs / 1000)
  const maxSec = 5 * 60 // Rough estimate for progress ring
  const progress = Math.max(0, Math.min(1, 1 - totalSec / maxSec))
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in">
      <div className="flex flex-col items-center gap-8 text-center px-6">
        {/* Circular timer */}
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="4"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-semibold text-foreground tabular-nums">
              {formatTime(remainingMs)}
            </span>
          </div>
        </div>

        {/* Message */}
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">
            Time for a break
          </h2>
          <p className="text-ui-sm font-body text-muted-foreground max-w-xs">
            You've completed {completedPomodoros} {completedPomodoros === 1 ? 'pomodoro' : 'pomodoros'}.
            Rest your eyes and stretch.
          </p>
        </div>

        {/* Skip button */}
        <button
          onClick={onSkip}
          className="px-5 py-2 rounded-lg border border-border text-ui-sm font-body font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Skip break
        </button>
      </div>
    </div>
  )
}
