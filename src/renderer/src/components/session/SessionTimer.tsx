import { Timer, Pause, Coffee, AlertTriangle } from 'lucide-react'
import { SessionSnapshot } from '@/types'
import { cn } from '@/lib/utils'

interface SessionTimerProps {
  session: SessionSnapshot
  compact?: boolean
  onStop?: () => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionTimer({ session, compact, onStop }: SessionTimerProps) {
  const stateConfig = {
    running: {
      icon: Timer,
      label: 'Focus',
      color: 'text-primary',
      bg: 'bg-primary/[0.06]',
      border: 'border-primary/20',
      dot: 'bg-primary',
      glow: 'shadow-[0_0_8px_1px_hsla(var(--primary),0.2)]'
    },
    paused_afk: {
      icon: AlertTriangle,
      label: 'AFK',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/[0.06]',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500',
      glow: 'shadow-[0_0_8px_1px_hsla(38,80%,55%,0.15)]'
    },
    break: {
      icon: Coffee,
      label: 'Break',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/[0.06]',
      border: 'border-blue-500/20',
      dot: 'bg-blue-500',
      glow: ''
    },
    completed: {
      icon: Pause,
      label: 'Done',
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      border: 'border-border',
      dot: 'bg-muted-foreground',
      glow: ''
    }
  }

  const config = stateConfig[session.state]
  const Icon = config.icon

  // Display: pomodoro countdown if enabled and in work/break, otherwise total active time
  const displayTime = session.pomodoroEnabled && session.state !== 'completed'
    ? formatTime(session.pomodoroRemainingSeconds)
    : formatTime(session.timerSeconds)

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-ui-xs font-medium border',
          'backdrop-blur-sm transition-all duration-300',
          config.bg,
          config.border,
          config.color,
          session.state === 'running' && config.glow
        )}
      >
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          config.dot,
          session.state === 'running' && 'animate-pulse'
        )} />
        <span className="font-mono tabular-nums tracking-tight">{displayTime}</span>
        {session.pomodoroEnabled && (
          <span className="text-xs opacity-60 font-mono">
            P{session.completedPomodoros + 1}
          </span>
        )}
        {onStop && (
          <button
            onClick={onStop}
            className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity duration-200"
            title="End session"
          >
            <Pause className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border',
        'backdrop-blur-sm transition-all duration-300',
        config.bg,
        config.border,
        session.state === 'running' && config.glow
      )}
    >
      {/* Icon with subtle background */}
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center',
        'bg-background/60 border border-border/30'
      )}>
        <Icon className={cn('w-4.5 h-4.5', config.color)} />
      </div>

      <div className="flex flex-col">
        <span className={cn('text-ui-xs font-medium uppercase tracking-wider', config.color)}>
          {config.label}
        </span>
        <span className={cn('text-lg font-mono font-semibold tabular-nums tracking-tight', config.color)}>
          {displayTime}
        </span>
      </div>

      {session.pomodoroEnabled && (
        <div className="flex flex-col items-center ml-2 pl-3 border-l border-border/40">
          <span className="text-ui-xs text-muted-foreground">Pomodoro</span>
          <span className={cn('text-ui-base font-mono font-semibold tabular-nums', config.color)}>
            #{session.completedPomodoros + (session.state === 'running' ? 1 : 0)}
          </span>
        </div>
      )}

      <div className="flex flex-col items-center ml-2 pl-3 border-l border-border/40">
        <span className="text-ui-xs text-muted-foreground">Active</span>
        <span className="text-ui-base font-mono font-medium text-foreground tabular-nums">
          {formatTime(session.timerSeconds)}
        </span>
      </div>
    </div>
  )
}
