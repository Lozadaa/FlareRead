import { useState, useCallback, useEffect } from 'react'
import { TrackWithProgress } from '@/types'

interface UseTracksResult {
  tracks: TrackWithProgress[]
  loading: boolean
  refresh: () => Promise<void>
  addManualTime: (
    categoryId: string,
    deltaMinutes: number,
    note?: string,
    occurredAt?: string
  ) => Promise<void>
}

export function useTracks(limit?: number): UseTracksResult {
  const [tracks, setTracks] = useState<TrackWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.tracks.getTopForDashboard(limit ?? 3)
      setTracks(result as TrackWithProgress[])
    } catch (err) {
      console.error('Failed to load tracks:', err)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addManualTime = useCallback(
    async (categoryId: string, deltaMinutes: number, note?: string, occurredAt?: string) => {
      await window.api.manualTime.add({
        categoryId,
        deltaMinutes,
        occurredAt: occurredAt ?? new Date().toISOString(),
        note
      })
      await refresh()
    },
    [refresh]
  )

  return { tracks, loading, refresh, addManualTime }
}
