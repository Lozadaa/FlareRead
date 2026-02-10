import { Coffee, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionSnapshot } from '@/types'

interface BreakOverlayProps {
  session: SessionSnapshot
  onSkipBreak: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function BreakOverlay({ session, onSkipBreak }: BreakOverlayProps) {
  if (session.state !== 'break') return null

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950/80 dark:to-indigo-950/80 backdrop-blur-md">
      {/* Animated breathing circle */}
      <div className="relative mb-8">
        <div className="w-40 h-40 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center animate-pulse">
          <div className="w-28 h-28 rounded-full bg-blue-200/60 dark:bg-blue-800/40 flex items-center justify-center">
            <Coffee className="w-12 h-12 text-blue-500 dark:text-blue-400" />
          </div>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-2">
        Rest
      </h2>
      <p className="text-lg text-blue-600 dark:text-blue-300 mb-1">
        Take a break, stretch, breathe
      </p>
      <p className="text-sm text-blue-500/70 dark:text-blue-400/70 mb-8">
        Pomodoro #{session.completedPomodoros} completed
      </p>

      {/* Timer countdown */}
      <div className="text-5xl font-bold tabular-nums text-blue-700 dark:text-blue-300 mb-8">
        {formatTime(session.pomodoroRemainingSeconds)}
      </div>

      <Button
        variant="outline"
        onClick={onSkipBreak}
        className="gap-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
      >
        <SkipForward className="w-4 h-4" />
        Skip break
      </Button>

      {/* Session stats at bottom */}
      <div className="absolute bottom-8 flex items-center gap-6 text-sm text-blue-500/60 dark:text-blue-400/60">
        <span>Active: {Math.round(session.activeMs / 60000)}min</span>
        <span>{session.highlightsDuring} highlights</span>
        <span>{session.notesDuring} notes</span>
      </div>
    </div>
  )
}
