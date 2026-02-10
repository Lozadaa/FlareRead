import { useState, useCallback, useEffect } from 'react'
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  BookOpen,
  Plus,
  Minus,
  Save,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Category,
  TrackWithProgress,
  ManualTimeEntry,
  Book
} from '@/types'
import { AddHoursModal } from './AddHoursModal'

interface TrackDetailViewProps {
  track: TrackWithProgress
  categories: Category[]
  onBack: () => void
  onTrackUpdated: () => Promise<void>
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext
}: {
  icon: typeof Clock
  label: string
  value: string
  subtext?: string
}): JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-ui-lg font-semibold">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-0.5">{subtext}</div>}
    </div>
  )
}

export function TrackDetailView({
  track,
  categories,
  onBack,
  onTrackUpdated
}: TrackDetailViewProps): JSX.Element {
  // Editable settings
  const [editing, setEditing] = useState(false)
  const [targetHours, setTargetHours] = useState(track.target_hours_total?.toString() ?? '')
  const [weeklyTarget, setWeeklyTarget] = useState(track.weekly_target_hours?.toString() ?? '')
  const [deadline, setDeadline] = useState(track.target_deadline ?? '')
  const [manualBaseHours, setManualBaseHours] = useState(
    track.manual_base_hours?.toString() ?? '0'
  )
  const [notes, setNotes] = useState(track.notes ?? '')
  const [sourceLabel, setSourceLabel] = useState(track.source_label ?? '')
  const [saving, setSaving] = useState(false)

  // Manual time entries
  const [entries, setEntries] = useState<ManualTimeEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)

  // Books in this category
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(true)

  // Modals
  const [showAddHours, setShowAddHours] = useState(false)
  const [addHoursMode, setAddHoursMode] = useState<'add' | 'correct'>('add')

  const loadEntries = useCallback(async () => {
    setEntriesLoading(true)
    try {
      const result = await window.api.manualTime.getRecent(track.category_id, 10)
      setEntries(result as ManualTimeEntry[])
    } catch (err) {
      console.error('Failed to load entries:', err)
    } finally {
      setEntriesLoading(false)
    }
  }, [track.category_id])

  const loadBooks = useCallback(async () => {
    setBooksLoading(true)
    try {
      const allBooks = (await window.api.books.getAll()) as Book[]
      setBooks(allBooks.filter((b) => b.category_id === track.category_id))
    } catch (err) {
      console.error('Failed to load books:', err)
    } finally {
      setBooksLoading(false)
    }
  }, [track.category_id])

  useEffect(() => {
    loadEntries()
    loadBooks()
  }, [loadEntries, loadBooks])

  // Reset form when track changes
  useEffect(() => {
    setTargetHours(track.target_hours_total?.toString() ?? '')
    setWeeklyTarget(track.weekly_target_hours?.toString() ?? '')
    setDeadline(track.target_deadline ?? '')
    setManualBaseHours(track.manual_base_hours?.toString() ?? '0')
    setNotes(track.notes ?? '')
    setSourceLabel(track.source_label ?? '')
    setEditing(false)
  }, [track])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await window.api.tracks.upsert({
        categoryId: track.category_id,
        targetHoursTotal: targetHours ? parseFloat(targetHours) : undefined,
        weeklyTargetHours: weeklyTarget ? parseFloat(weeklyTarget) : undefined,
        targetDeadline: deadline || undefined,
        manualBaseHours: manualBaseHours ? parseFloat(manualBaseHours) : 0,
        notes: notes || undefined,
        sourceLabel: sourceLabel || undefined
      })
      setEditing(false)
      await onTrackUpdated()
    } catch (err) {
      console.error('Failed to save track:', err)
    } finally {
      setSaving(false)
    }
  }, [
    track.category_id,
    targetHours,
    weeklyTarget,
    deadline,
    manualBaseHours,
    notes,
    sourceLabel,
    onTrackUpdated
  ])

  const handleCancelEdit = useCallback(() => {
    setTargetHours(track.target_hours_total?.toString() ?? '')
    setWeeklyTarget(track.weekly_target_hours?.toString() ?? '')
    setDeadline(track.target_deadline ?? '')
    setManualBaseHours(track.manual_base_hours?.toString() ?? '0')
    setNotes(track.notes ?? '')
    setSourceLabel(track.source_label ?? '')
    setEditing(false)
  }, [track])

  const handleManualTimeAdded = useCallback(async () => {
    setShowAddHours(false)
    await loadEntries()
    await onTrackUpdated()
  }, [loadEntries, onTrackUpdated])

  const activeHours = track.progress.activeMinutes / 60
  const manualHours = track.progress.manualMinutes / 60
  const baseHours = track.progress.manualBaseMinutes / 60
  const hasTarget = track.target_hours_total && track.target_hours_total > 0

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            {track.category.color && (
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: track.category.color }}
              />
            )}
            <h1 className="text-ui-xl font-semibold">{track.category.name}</h1>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit goal
            </Button>
          )}
        </div>

        {/* Progress Section */}
        <div className="rounded-lg border bg-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-ui-sm font-medium">Progress</span>
            {hasTarget && (
              <span className="text-ui-sm text-muted-foreground">
                {track.progress.percentComplete.toFixed(0)}%
              </span>
            )}
          </div>

          <Progress
            value={hasTarget ? track.progress.percentComplete : 0}
            className="h-3 mb-4"
          />

          <div className="text-ui-lg font-semibold mb-1">
            {track.progress.totalHours.toFixed(1)}
            {hasTarget ? ` / ${track.target_hours_total} hrs` : ' hrs total'}
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>{activeHours.toFixed(1)} hrs from reading sessions</div>
            <div>{manualHours.toFixed(1)} hrs from manual entries</div>
            {baseHours > 0 && <div>{baseHours.toFixed(1)} hrs historical baseline</div>}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={Clock}
            label="Total hours"
            value={`${track.progress.totalHours.toFixed(1)} hrs`}
          />
          <StatCard
            icon={TrendingUp}
            label="Your weekly target"
            value={
              track.weekly_target_hours
                ? `${track.weekly_target_hours} hrs/week`
                : 'Not set'
            }
            subtext="Personal reference"
          />
        </div>

        <Separator className="my-6" />

        {/* Goal Settings */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-ui-base font-medium">Your Goal Settings</h2>
            {editing && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-3 w-3 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Target hours (personal goal)
                </label>
                {editing ? (
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                    placeholder="e.g. 100"
                  />
                ) : (
                  <div className="text-ui-sm py-2">
                    {track.target_hours_total ? `${track.target_hours_total} hrs` : 'Not set'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Weekly target (personal pace)
                </label>
                {editing ? (
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={weeklyTarget}
                    onChange={(e) => setWeeklyTarget(e.target.value)}
                    placeholder="e.g. 5"
                  />
                ) : (
                  <div className="text-ui-sm py-2">
                    {track.weekly_target_hours
                      ? `${track.weekly_target_hours} hrs/week`
                      : 'Not set'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
                {editing ? (
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                ) : (
                  <div className="text-ui-sm py-2">
                    {track.target_deadline
                      ? new Date(track.target_deadline).toLocaleDateString()
                      : 'Not set'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Manual base hours (historical)
                </label>
                {editing ? (
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={manualBaseHours}
                    onChange={(e) => setManualBaseHours(e.target.value)}
                    placeholder="0"
                  />
                ) : (
                  <div className="text-ui-sm py-2">
                    {track.manual_base_hours ? `${track.manual_base_hours} hrs` : '0 hrs'}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              {editing ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Personal notes about this learning goal..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              ) : (
                <div className="text-ui-sm py-2 text-muted-foreground">
                  {track.notes || 'No notes'}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Source label</label>
              {editing ? (
                <Input
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="e.g., Based on personal estimate"
                />
              ) : (
                <div className="text-ui-sm py-2 text-muted-foreground">
                  {track.source_label || 'Personal reference'}
                </div>
              )}
              {editing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Describe where your target comes from — this is your personal reference
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Manual Time Log */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-ui-base font-medium">Manual Time Log</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddHoursMode('correct')
                  setShowAddHours(true)
                }}
              >
                <Minus className="h-3 w-3 mr-1" />
                Correct entry
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAddHoursMode('add')
                  setShowAddHours(true)
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add hours
              </Button>
            </div>
          </div>

          {entriesLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-6 text-ui-sm text-muted-foreground">
              No manual time entries yet
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {new Date(entry.occurred_at).toLocaleDateString()}
                    </span>
                    <span
                      className={cn(
                        'text-ui-sm font-medium',
                        entry.delta_minutes >= 0 ? 'text-emerald-600' : 'text-red-500'
                      )}
                    >
                      {entry.delta_minutes >= 0 ? '+' : ''}
                      {(entry.delta_minutes / 60).toFixed(1)} hrs
                    </span>
                  </div>
                  {entry.note && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {entry.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Books in this category */}
        <div className="mb-6">
          <h2 className="text-ui-base font-medium mb-4">Books in this category</h2>
          {booksLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-6 text-ui-sm text-muted-foreground">
              No books in this category yet
            </div>
          ) : (
            <div className="space-y-1">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50"
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-ui-sm font-medium truncate">{book.title}</div>
                    {book.author && (
                      <div className="text-xs text-muted-foreground truncate">{book.author}</div>
                    )}
                  </div>
                  {book.reading_mode && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        book.reading_mode === 'study'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-purple-500/10 text-purple-600'
                      )}
                    >
                      {book.reading_mode}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddHours && (
        <AddHoursModal
          categoryId={track.category_id}
          currentTotalHours={track.progress.totalHours}
          mode={addHoursMode}
          onAdded={handleManualTimeAdded}
          onClose={() => setShowAddHours(false)}
        />
      )}
    </ScrollArea>
  )
}
