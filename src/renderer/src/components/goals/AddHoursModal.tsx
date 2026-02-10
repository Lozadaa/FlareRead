import { useState, useCallback } from 'react'
import { Plus, Minus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AddHoursModalProps {
  categoryId: string
  currentTotalHours: number
  mode: 'add' | 'correct'
  onAdded: () => Promise<void>
  onClose: () => void
}

export function AddHoursModal({
  categoryId,
  currentTotalHours,
  mode: initialMode,
  onAdded,
  onClose
}: AddHoursModalProps): JSX.Element {
  const [mode, setMode] = useState(initialMode)
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalMinutes = hours * 60 + minutes
  const deltaHours = totalMinutes / 60
  const newTotal = mode === 'add'
    ? currentTotalHours + deltaHours
    : currentTotalHours - deltaHours

  const canSubmit = totalMinutes > 0 && (mode === 'add' || note.trim().length > 0)

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const deltaMinutesValue = mode === 'add' ? totalMinutes : -totalMinutes
      await window.api.manualTime.add({
        categoryId,
        deltaMinutes: deltaMinutesValue,
        occurredAt: new Date(date).toISOString(),
        note: note.trim() || undefined
      })
      await onAdded()
    } catch (err) {
      console.error('Failed to add manual time:', err)
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, mode, totalMinutes, categoryId, date, note, onAdded])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add Hours' : 'Correct Entry'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Log additional study time for this track'
              : 'Subtract hours to correct a previous entry'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
            <button
              onClick={() => setMode('add')}
              className={cn(
                'flex-1 text-ui-sm py-2 rounded-lg transition-all text-center',
                mode === 'add'
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Plus className="h-3 w-3 inline mr-1" />
              Add
            </button>
            <button
              onClick={() => setMode('correct')}
              className={cn(
                'flex-1 text-ui-sm py-2 rounded-lg transition-all text-center',
                mode === 'correct'
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Minus className="h-3 w-3 inline mr-1" />
              Correct
            </button>
          </div>

          {/* Hours + Minutes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
              <Input
                type="number"
                min="0"
                max="999"
                value={hours}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              />
            </div>
          </div>

          {/* Date picker */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Note {mode === 'correct' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === 'correct'
                  ? 'Reason for correction (required)...'
                  : 'Optional note about this entry...'
              }
              rows={2}
              className="flex w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
            />
          </div>

          {/* Preview */}
          {totalMinutes > 0 && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3.5 text-ui-sm">
              <span className="text-muted-foreground/70">New total: </span>
              <span className="font-semibold text-foreground">{newTotal.toFixed(1)} hrs</span>
              <span className="text-muted-foreground/60">
                {' '}(was {currentTotalHours.toFixed(1)} hrs)
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting
              ? 'Saving...'
              : mode === 'add'
                ? `Add ${deltaHours.toFixed(1)} hrs`
                : `Subtract ${deltaHours.toFixed(1)} hrs`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
