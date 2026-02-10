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
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { snapshot, topHighlights } = data

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg w-full mx-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Session Complete
          </h2>
          <p className="text-sm text-muted-foreground">
            Great reading session! Here&apos;s your summary.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard
            icon={Clock}
            label="Active Time"
            value={formatDuration(snapshot.activeMs)}
            color="text-blue-500"
            bg="bg-blue-50 dark:bg-blue-950/30"
          />
          <StatCard
            icon={Highlighter}
            label="Highlights"
            value={String(snapshot.highlightsDuring)}
            color="text-amber-500"
            bg="bg-amber-50 dark:bg-amber-950/30"
          />
          <StatCard
            icon={StickyNote}
            label="Notes"
            value={String(snapshot.notesDuring)}
            color="text-purple-500"
            bg="bg-purple-50 dark:bg-purple-950/30"
          />
        </div>

        {/* Pomodoro stats */}
        {snapshot.pomodoroEnabled && snapshot.completedPomodoros > 0 && (
          <div className="mb-8 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <span className="font-medium">
                {snapshot.completedPomodoros} Pomodoro{snapshot.completedPomodoros !== 1 ? 's' : ''} completed
              </span>
              <span className="text-emerald-500/60">
                ({snapshot.workMinutes}min work / {snapshot.breakMinutes}min break)
              </span>
            </div>
          </div>
        )}

        {/* Top highlights */}
        {topHighlights.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Top Highlights
            </h3>
            <div className="space-y-2">
              {topHighlights.map((highlight) => (
                <button
                  key={highlight.id}
                  onClick={() => onNavigateToHighlight?.(highlight.cfi_range)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: highlight.color }}
                    />
                    <p className="text-sm text-foreground line-clamp-2 flex-1">
                      {highlight.text}
                    </p>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
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
            className="flex-1"
          >
            Finish
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1 gap-2"
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
  color,
  bg
}: {
  icon: typeof Clock
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className={`p-4 rounded-lg ${bg} text-center`}>
      <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
