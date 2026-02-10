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
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-gradient-to-b from-background via-primary/[0.03] to-background backdrop-blur-md">
      {/* Animated breathing circle with layered rings */}
      <div className="relative mb-10">
        {/* Outermost glow ring */}
        <div
          className="absolute inset-[-20px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsla(var(--primary), 0.08) 0%, transparent 70%)',
            animation: 'breathe 4s ease-in-out infinite'
          }}
        />

        {/* Outer ring */}
        <div
          className="w-44 h-44 rounded-full flex items-center justify-center border border-primary/10"
          style={{
            background: 'linear-gradient(135deg, hsla(var(--primary), 0.06) 0%, hsla(var(--gold), 0.04) 100%)',
            animation: 'breathe 4s ease-in-out infinite'
          }}
        >
          {/* Middle ring */}
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center border border-gold/10"
            style={{
              background: 'linear-gradient(135deg, hsla(var(--gold), 0.08) 0%, hsla(var(--primary), 0.06) 100%)',
              animation: 'breathe 4s ease-in-out infinite 0.3s'
            }}
          >
            {/* Inner ring */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border border-primary/15"
              style={{
                background: 'linear-gradient(135deg, hsla(var(--primary), 0.1) 0%, hsla(var(--gold), 0.08) 100%)',
                animation: 'breathe 4s ease-in-out infinite 0.6s'
              }}
            >
              <Coffee className="w-8 h-8 text-primary/60" />
            </div>
          </div>
        </div>
      </div>

      <h2 className="font-display text-3xl italic text-foreground mb-2">
        Rest
      </h2>
      <p className="text-ui-lg text-muted-foreground mb-1">
        Take a break, stretch, breathe
      </p>
      <p className="text-ui-sm text-muted-foreground/60 mb-8">
        Pomodoro #{session.completedPomodoros} completed
      </p>

      {/* Timer countdown */}
      <div className="text-5xl font-mono font-bold tabular-nums text-foreground mb-8 tracking-tight">
        {formatTime(session.pomodoroRemainingSeconds)}
      </div>

      <Button
        variant="outline"
        onClick={onSkipBreak}
        className="gap-2 border-border hover:border-primary/30 hover:bg-primary/[0.04] btn-press transition-all duration-300"
      >
        <SkipForward className="w-4 h-4" />
        Skip break
      </Button>

      {/* Session stats at bottom */}
      <div className="absolute bottom-8 flex items-center gap-6 text-ui-xs text-muted-foreground/50">
        <span className="font-mono tabular-nums">Active: {Math.round(session.activeMs / 60000)}min</span>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="font-mono tabular-nums">{session.highlightsDuring} highlights</span>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="font-mono tabular-nums">{session.notesDuring} notes</span>
      </div>

      {/* CSS animation for breathing effect */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
