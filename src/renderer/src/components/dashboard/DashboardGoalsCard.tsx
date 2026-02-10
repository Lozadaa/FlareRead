import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Target, Plus, Clock, ArrowRight, Calendar } from 'lucide-react'
import { useTracks } from '@/hooks/useTracks'
import { TrackWithProgress } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface DashboardGoalsCardProps {
  onNavigateGoals?: () => void
}

export function DashboardGoalsCard({ onNavigateGoals }: DashboardGoalsCardProps): JSX.Element | null {
  const { tracks, loading, addManualTime } = useTracks(3)
  const [addHoursTrack, setAddHoursTrack] = useState<TrackWithProgress | null>(null)

  if (loading) return null

  if (tracks.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="font-display text-xl text-foreground mb-4">
          <span className="text-muted-foreground/40 mr-2">&mdash;</span>
          Goals
        </h2>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/[0.06] border border-primary/10 flex items-center justify-center mx-auto mb-4">
            <Target className="h-5 w-5 text-primary/40" />
          </div>
          <p className="text-ui-sm text-muted-foreground">
            No learning goals set. Create one to track your progress.
          </p>
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-foreground">
          <span className="text-muted-foreground/40 mr-2">&mdash;</span>
          Goals
        </h2>
        <button
          onClick={() => onNavigateGoals?.()}
          className="text-ui-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 group"
        >
          View all goals
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tracks.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            index={i}
            onAddHours={() => setAddHoursTrack(track)}
            onAdjustGoal={() => onNavigateGoals?.()}
          />
        ))}
      </div>

      {addHoursTrack && (
        <AddHoursModal
          track={addHoursTrack}
          onClose={() => setAddHoursTrack(null)}
          onSubmit={async (minutes, note, occurredAt) => {
            await addManualTime(addHoursTrack.category_id, minutes, note, occurredAt)
            setAddHoursTrack(null)
          }}
        />
      )}
    </motion.section>
  )
}

// ─── Track Card ─────────────────────────────────────

interface TrackCardProps {
  track: TrackWithProgress
  index: number
  onAddHours: () => void
  onAdjustGoal: () => void
}

function TrackCard({ track, index, onAddHours, onAdjustGoal }: TrackCardProps): JSX.Element {
  const { category, progress } = track
  const targetHours = track.target_hours_total ?? 0
  const percent = Math.round(progress.percentComplete)
  const remainingHours = Math.max(0, targetHours - progress.totalHours)

  // ETA calculation
  let etaText: string | null = null
  if (track.weekly_target_hours && track.weekly_target_hours > 0 && remainingHours > 0) {
    const weeksLeft = Math.ceil(remainingHours / track.weekly_target_hours)
    const etaDate = new Date()
    etaDate.setDate(etaDate.getDate() + weeksLeft * 7)
    etaText = etaDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const categoryColor = category?.color ?? '#6366f1'

  // SVG arc for circular progress
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className={cn(
        'bg-card border border-border rounded-xl p-4',
        'hover:border-primary/20 hover:-translate-y-0.5',
        'hover:shadow-[0_6px_24px_-4px_hsla(var(--primary),0.08)]',
        'transition-all duration-300'
      )}
    >
      {/* Header with category + circular progress */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card"
            style={{ backgroundColor: categoryColor, boxShadow: `0 0 8px ${categoryColor}33` }}
          />
          <span className="text-ui-sm font-medium text-foreground truncate">
            {category?.name ?? 'Unknown'}
          </span>
        </div>

        {/* Circular progress indicator */}
        <div className="relative w-[68px] h-[68px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={categoryColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 4px ${categoryColor}44)` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-ui-sm font-bold text-foreground">{percent}%</span>
          </div>
        </div>
      </div>

      {/* Hours progress */}
      <p className="text-ui-sm text-muted-foreground mb-3">
        <span className="font-mono font-medium text-foreground">{progress.totalHours.toFixed(1)}</span>
        {' / '}
        <span className="font-mono">{targetHours}</span>
        {' hours'}
      </p>

      {/* Meta info */}
      <div className="space-y-1.5 mb-3">
        {etaText && (
          <div className="flex items-center gap-1.5 text-ui-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>ETA {etaText}</span>
          </div>
        )}

        {track.weekly_target_hours && track.weekly_target_hours > 0 && (
          <div className="flex items-center gap-1.5 text-ui-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{track.weekly_target_hours} hrs/week target</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-ui-sm hover:border-primary/30 hover:bg-primary/[0.04]"
          onClick={onAddHours}
        >
          <Plus className="h-3 w-3" />
          Add hours
        </Button>
        <button
          onClick={onAdjustGoal}
          className="text-ui-sm text-primary hover:text-primary/80 transition-colors ml-auto"
        >
          Adjust goal
        </button>
      </div>
    </motion.div>
  )
}

// ─── Add Hours Modal ────────────────────────────────

interface AddHoursModalProps {
  track: TrackWithProgress
  onClose: () => void
  onSubmit: (minutes: number, note?: string, occurredAt?: string) => Promise<void>
}

function AddHoursModal({ track, onClose, onSubmit }: AddHoursModalProps): JSX.Element {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    const totalMinutes = (parseFloat(hours) || 0) * 60 + (parseFloat(minutes) || 0)
    if (totalMinutes <= 0) return

    setSubmitting(true)
    try {
      await onSubmit(totalMinutes, note || undefined, new Date(date).toISOString())
    } finally {
      setSubmitting(false)
    }
  }, [hours, minutes, date, note, onSubmit])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Hours</DialogTitle>
          <DialogDescription>
            Log time for {track.category?.name ?? 'this track'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-ui-sm font-medium text-foreground mb-1 block">Hours</label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-ui-sm font-medium text-foreground mb-1 block">Minutes</label>
              <Input
                type="number"
                min="0"
                max="59"
                step="1"
                placeholder="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-ui-sm font-medium text-foreground mb-1 block">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-ui-sm font-medium text-foreground mb-1 block">
              Note (optional)
            </label>
            <Input
              placeholder="What did you work on?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || ((parseFloat(hours) || 0) * 60 + (parseFloat(minutes) || 0)) <= 0}
          >
            {submitting ? 'Adding...' : 'Add Time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
