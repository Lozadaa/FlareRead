import { useState, useCallback, useEffect } from 'react'
import { Plus, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { TrackWithProgress } from '@/types'
import { useCategories } from '@/hooks/useCategories'
import { TrackDetailView } from './TrackDetailView'
import { CreateTrackModal } from './CreateTrackModal'

type FilterTab = 'all' | 'active' | 'completed' | 'no-target'

function getTrackStatus(
  track: TrackWithProgress
): 'on-track' | 'behind' | 'ahead' | 'no-target' | 'completed' {
  if (!track.target_hours_total) return 'no-target'
  if (track.progress.percentComplete >= 100) return 'completed'

  if (!track.weekly_target_hours || !track.target_deadline) return 'on-track'

  const now = new Date()
  const deadline = new Date(track.target_deadline)
  const weeksRemaining = Math.max(
    0,
    (deadline.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  if (weeksRemaining === 0) return 'behind'

  const hoursRemaining = track.target_hours_total - track.progress.totalHours
  const requiredWeeklyPace = hoursRemaining / weeksRemaining
  const actualWeeklyPace = track.weekly_target_hours

  if (requiredWeeklyPace > actualWeeklyPace * 1.2) return 'behind'
  if (requiredWeeklyPace < actualWeeklyPace * 0.8) return 'ahead'
  return 'on-track'
}

function StatusBadge({ status }: { status: ReturnType<typeof getTrackStatus> }): JSX.Element {
  const config = {
    'on-track': { label: 'On track', className: 'bg-emerald-500/10 text-emerald-600' },
    behind: { label: 'Behind', className: 'bg-amber-500/10 text-amber-600' },
    ahead: { label: 'Ahead', className: 'bg-blue-500/10 text-blue-600' },
    'no-target': { label: 'No target', className: 'bg-muted text-muted-foreground' },
    completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600' }
  }
  const { label, className } = config[status]
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', className)}>
      {label}
    </span>
  )
}

function TrackCard({
  track,
  onClick
}: {
  track: TrackWithProgress
  onClick: () => void
}): JSX.Element {
  const status = getTrackStatus(track)
  const hasTarget = track.target_hours_total && track.target_hours_total > 0

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {track.category.color && (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: track.category.color }}
            />
          )}
          <span className="font-medium text-ui-sm">{track.category.name}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Progress
            value={hasTarget ? track.progress.percentComplete : 0}
            className="flex-1 h-1.5"
          />
          <span className="text-xs text-muted-foreground shrink-0">
            {track.progress.totalHours.toFixed(1)}
            {hasTarget ? ` / ${track.target_hours_total} hrs` : ' hrs'}
          </span>
        </div>

        {track.weekly_target_hours && track.weekly_target_hours > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {status === 'ahead' ? (
              <TrendingUp className="h-3 w-3 text-blue-500" />
            ) : status === 'behind' ? (
              <TrendingDown className="h-3 w-3 text-amber-500" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>
              Your weekly target: {track.weekly_target_hours} hrs/week
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

export function GoalsView(): JSX.Element {
  const [tracks, setTracks] = useState<TrackWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedTrack, setSelectedTrack] = useState<TrackWithProgress | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { categories, createCategory } = useCategories()

  const loadTracks = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.tracks.getAll()
      setTracks(result as TrackWithProgress[])
    } catch (err) {
      console.error('Failed to load tracks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTracks()
  }, [loadTracks])

  const filteredTracks = tracks.filter((track) => {
    if (filter === 'all') return true
    const status = getTrackStatus(track)
    if (filter === 'active') return status !== 'completed' && status !== 'no-target'
    if (filter === 'completed') return status === 'completed'
    if (filter === 'no-target') return status === 'no-target'
    return true
  })

  const handleTrackCreated = useCallback(async () => {
    await loadTracks()
    setShowCreateModal(false)
  }, [loadTracks])

  const handleTrackUpdated = useCallback(async () => {
    await loadTracks()
    // Refresh the selected track too
    if (selectedTrack) {
      const updated = (await window.api.tracks.getAll()) as TrackWithProgress[]
      const refreshed = updated.find((t) => t.id === selectedTrack.id)
      if (refreshed) setSelectedTrack(refreshed)
    }
  }, [loadTracks, selectedTrack])

  const handleBack = useCallback(() => {
    setSelectedTrack(null)
    loadTracks()
  }, [loadTracks])

  // Detail view
  if (selectedTrack) {
    return (
      <TrackDetailView
        track={selectedTrack}
        categories={categories}
        onBack={handleBack}
        onTrackUpdated={handleTrackUpdated}
      />
    )
  }

  // List view
  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-ui-xl font-semibold">Learning Goals</h1>
            <p className="text-ui-sm text-muted-foreground mt-1">
              Track your personal learning targets across categories
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Track
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="no-target">No Target</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-ui-base font-medium mb-1">
              {filter === 'all' ? 'No learning tracks yet' : `No ${filter} tracks`}
            </h3>
            <p className="text-ui-sm text-muted-foreground mb-4">
              {filter === 'all'
                ? 'Create a track to set personal learning goals for a category'
                : 'Try a different filter or create a new track'}
            </p>
            {filter === 'all' && (
              <Button variant="outline" onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first track
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onClick={() => setSelectedTrack(track)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTrackModal
          categories={categories}
          existingTrackCategoryIds={tracks.map((t) => t.category_id)}
          onCreateCategory={createCategory}
          onCreated={handleTrackCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </ScrollArea>
  )
}
