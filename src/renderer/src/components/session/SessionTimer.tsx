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
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500'
    },
    paused_afk: {
      icon: AlertTriangle,
      label: 'AFK',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500'
    },
    break: {
      icon: Coffee,
      label: 'Break',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500'
    },
    completed: {
      icon: Pause,
      label: 'Done',
      color: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-900',
      border: 'border-gray-200 dark:border-gray-700',
      dot: 'bg-gray-400'
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
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border',
          config.bg,
          config.border,
          config.color
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dot)} />
        <span className="tabular-nums">{displayTime}</span>
        {session.pomodoroEnabled && (
          <span className="text-[10px] opacity-70">
            P{session.completedPomodoros + 1}
          </span>
        )}
        {onStop && (
          <button
            onClick={onStop}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
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
        'flex items-center gap-3 px-4 py-2.5 rounded-lg border',
        config.bg,
        config.border
      )}
    >
      <Icon className={cn('w-5 h-5', config.color)} />
      <div className="flex flex-col">
        <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
        <span className={cn('text-lg font-semibold tabular-nums', config.color)}>
          {displayTime}
        </span>
      </div>
      {session.pomodoroEnabled && (
        <div className="flex flex-col items-center ml-2 pl-2 border-l border-current/10">
          <span className="text-[10px] text-muted-foreground">Pomodoro</span>
          <span className={cn('text-sm font-medium', config.color)}>
            #{session.completedPomodoros + (session.state === 'running' ? 1 : 0)}
          </span>
        </div>
      )}
      <div className="flex flex-col items-center ml-2 pl-2 border-l border-current/10">
        <span className="text-[10px] text-muted-foreground">Active</span>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {formatTime(session.timerSeconds)}
        </span>
      </div>
    </div>
  )
}
