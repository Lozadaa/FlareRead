import { useState, useCallback, useEffect } from 'react'
import { BookWithProgress, DashboardMetrics } from '@/types'

interface DashboardData {
  currentlyReading: BookWithProgress[]
  recent: BookWithProgress[]
  metrics: DashboardMetrics
  loading: boolean
}

const DEFAULT_METRICS: DashboardMetrics = {
  minutesToday: 0,
  minutesThisWeek: 0,
  streak: 0,
  avgWpm: 0,
  totalSessions: 0,
  pagesPerHour: 0
}

export function useDashboard(): DashboardData & { refresh: () => Promise<void> } {
  const [currentlyReading, setCurrentlyReading] = useState<BookWithProgress[]>([])
  const [recent, setRecent] = useState<BookWithProgress[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics>(DEFAULT_METRICS)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [cr, rec, met] = await Promise.all([
        window.api.dashboard.currentlyReading(),
        window.api.dashboard.recent(),
        window.api.dashboard.metrics()
      ])
      setCurrentlyReading(cr as BookWithProgress[])
      setRecent(rec as BookWithProgress[])
      setMetrics(met as DashboardMetrics)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { currentlyReading, recent, metrics, loading, refresh }
}
