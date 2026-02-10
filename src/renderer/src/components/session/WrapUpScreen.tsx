import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Highlighter, StickyNote, ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionWrapUpData } from '@/types'

interface WrapUpScreenProps {
  getWrapUp: () => Promise<SessionWrapUpData | null>
  onContinue: () => void
  onFinish: () => void
  onNavigateToHighlight?: (cfiRange: string) => void
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function WrapUpScreen({
  getWrapUp,
  onContinue,
  onFinish,
  onNavigateToHighlight
}: WrapUpScreenProps) {
  const [data, setData] = useState<SessionWrapUpData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWrapUp().then((result) => {
      setData(result)
      setLoading(false)
    })
  }, [getWrapUp])

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { snapshot, topHighlights } = data

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg w-full mx-4 py-12">
        {/* Header with celebration */}
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-5 w-16 h-16">
            {/* Glow behind icon */}
            <div className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, hsla(var(--primary), 0.15) 0%, transparent 70%)' }}
            />
            <div className="relative w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsla(var(--primary), 0.1) 0%, hsla(var(--gold), 0.08) 100%)' }}
            >
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="font-display text-2xl italic text-foreground mb-1">
            Session Complete
          </h2>
          <p className="text-ui-sm text-muted-foreground">
            Great reading session! Here&apos;s your summary.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard
            icon={Clock}
            label="Active Time"
            value={formatDuration(snapshot.activeMs)}
            accent
          />
          <StatCard
            icon={Highlighter}
            label="Highlights"
            value={String(snapshot.highlightsDuring)}
          />
          <StatCard
            icon={StickyNote}
            label="Notes"
            value={String(snapshot.notesDuring)}
          />
        </div>

        {/* Pomodoro stats */}
        {snapshot.pomodoroEnabled && snapshot.completedPomodoros > 0 && (
          <div className="mb-8 p-4 rounded-xl bg-primary/[0.04] border border-primary/15">
            <div className="flex items-center gap-2 text-ui-sm">
              <span className="font-medium text-foreground">
                {snapshot.completedPomodoros} Pomodoro{snapshot.completedPomodoros !== 1 ? 's' : ''} completed
              </span>
              <span className="text-muted-foreground font-mono text-ui-xs">
                ({snapshot.workMinutes}min work / {snapshot.breakMinutes}min break)
              </span>
            </div>
          </div>
        )}

        {/* Top highlights */}
        {topHighlights.length > 0 && (
          <div className="mb-8">
            <h3 className="text-ui-sm font-medium text-foreground mb-3">
              Top Highlights
            </h3>
            <div className="space-y-2">
              {topHighlights.map((highlight) => (
                <button
                  key={highlight.id}
                  onClick={() => onNavigateToHighlight?.(highlight.cfi_range)}
                  className="w-full text-left p-3 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-[0_4px_16px_-4px_hsla(var(--primary),0.08)] transition-all duration-300 group"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: highlight.color }}
                    />
                    <p className="text-ui-sm text-foreground line-clamp-2 flex-1 leading-relaxed">
                      {highlight.text}
                    </p>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onFinish}
            className="flex-1 btn-press"
          >
            Finish
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1 gap-2 btn-press"
          >
            <BookOpen className="w-4 h-4" />
            Continue Reading
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: typeof Clock
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={`p-4 rounded-xl border text-center transition-all duration-300 hover:-translate-y-0.5 ${
      accent
        ? 'bg-primary/[0.04] border-primary/15 hover:shadow-[0_4px_20px_-4px_hsla(var(--primary),0.12)]'
        : 'bg-card border-border hover:shadow-[0_4px_16px_-4px_hsla(var(--primary),0.08)]'
    }`}>
      <Icon className={`w-4.5 h-4.5 mx-auto mb-2 ${accent ? 'text-primary' : 'text-gold'}`} />
      <p className="text-xl font-mono font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-ui-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
