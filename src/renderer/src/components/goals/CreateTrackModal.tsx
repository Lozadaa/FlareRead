import { useState, useCallback } from 'react'
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
import { CategorySelect } from '@/components/categories/CategorySelect'
import { Category } from '@/types'

interface CreateTrackModalProps {
  categories: Category[]
  existingTrackCategoryIds: string[]
  onCreateCategory: (data: { name: string; color?: string }) => Promise<Category>
  onCreated: () => Promise<void>
  onClose: () => void
}

export function CreateTrackModal({
  categories,
  existingTrackCategoryIds,
  onCreateCategory,
  onCreated,
  onClose
}: CreateTrackModalProps): JSX.Element {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [targetHours, setTargetHours] = useState('')
  const [weeklyTarget, setWeeklyTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedHasTrack = categoryId ? existingTrackCategoryIds.includes(categoryId) : false
  const canSubmit = categoryId && !selectedHasTrack

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !categoryId) return
    setSubmitting(true)
    try {
      await window.api.tracks.upsert({
        categoryId,
        targetHoursTotal: targetHours ? parseFloat(targetHours) : undefined,
        weeklyTargetHours: weeklyTarget ? parseFloat(weeklyTarget) : undefined,
        targetDeadline: deadline || undefined,
        notes: notes.trim() || undefined
      })
      await onCreated()
    } catch (err) {
      console.error('Failed to create track:', err)
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, categoryId, targetHours, weeklyTarget, deadline, notes, onCreated])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Learning Track</DialogTitle>
          <DialogDescription>
            Set up a personal learning goal for a category
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category select */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCreateCategory={onCreateCategory}
              className="w-full"
            />
            {selectedHasTrack && (
              <p className="text-xs text-amber-600 mt-1">
                This category already has a learning track
              </p>
            )}
          </div>

          {/* Target hours */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Target hours (your personal goal)
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
              placeholder="e.g. 100"
            />
          </div>

          {/* Weekly target */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Weekly target (your personal pace)
            </label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Deadline (optional)
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes about this learning goal..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
            Goals are personal references configured by you. Target hours and weekly paces
            are your own estimates and benchmarks.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Creating...' : 'Create Track'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
