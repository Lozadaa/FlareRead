import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Target, Plus, Clock, ArrowRight, Calendar } from 'lucide-react'
import { useTracks } from '@/hooks/useTracks'
import { TrackWithProgress } from '@/types'
import { Progress } from '@/components/ui/progress'
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
        <h2 className="text-ui-base font-semibold text-foreground mb-4">Goals</h2>
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
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
        <h2 className="text-ui-base font-semibold text-foreground">Goals</h2>
        <button
          onClick={() => onNavigateGoals?.()}
          className="text-ui-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          View all goals
          <ArrowRight className="h-3 w-3" />
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      {/* Category header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: categoryColor }}
        />
        <span className="text-ui-sm font-medium text-foreground truncate">
          {category?.name ?? 'Unknown'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1" />
          <span className="text-ui-xs font-medium text-muted-foreground shrink-0">
            {percent}%
          </span>
        </div>
        <p className="text-ui-xs text-muted-foreground">
          {progress.totalHours.toFixed(1)} / {targetHours} hours
        </p>
      </div>

      {/* ETA */}
      {etaText && (
        <div className="flex items-center gap-1.5 mb-3 text-ui-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>ETA {etaText}</span>
        </div>
      )}

      {/* Weekly hours */}
      {track.weekly_target_hours && track.weekly_target_hours > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-ui-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{track.weekly_target_hours} hrs/week target</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button size="sm" variant="outline" className="gap-1.5 text-ui-xs" onClick={onAddHours}>
          <Plus className="h-3 w-3" />
          Add hours
        </Button>
        <button
          onClick={onAdjustGoal}
          className="text-ui-xs text-primary hover:text-primary/80 transition-colors ml-auto"
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
              <label className="text-ui-xs font-medium text-foreground mb-1 block">Hours</label>
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
              <label className="text-ui-xs font-medium text-foreground mb-1 block">Minutes</label>
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
            <label className="text-ui-xs font-medium text-foreground mb-1 block">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-ui-xs font-medium text-foreground mb-1 block">
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
