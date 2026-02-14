import { useState, useEffect, useCallback, useMemo } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { booksService, sessionsService, tracksService, categoriesService, manualTimeEntriesService } from '@/services'
import { getCoverUrl } from '@/services/upload'
import type { BookDoc, SessionDoc, CategoryTrackDoc, CategoryDoc, ManualTimeEntryDoc, DashboardMetrics, BookWithProgress, TrackWithProgress, TrackProgress } from '@/types'

export interface StaleBook extends BookWithProgress {}

interface DashboardData {
  currentlyReading: (BookWithProgress & { coverUrl: string | null })[]
  recent: (BookWithProgress & { coverUrl: string | null })[]
  staleBooks: (StaleBook & { coverUrl: string | null })[]
  tracks: TrackWithProgress[]
  metrics: DashboardMetrics
  loading: boolean
  refresh: () => void
}

// ─── Helpers ────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Monday as start of week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function computeStreak(sessions: SessionDoc[]): number {
  if (sessions.length === 0) return 0

  // Get unique dates (yyyy-mm-dd) with completed sessions, sorted descending
  const uniqueDates = Array.from(
    new Set(
      sessions
        .filter((s) => s.status === 'completed' && s.activeMs > 0)
        .map((s) => {
          const d = s.startTime instanceof Timestamp ? s.startTime.toDate() : new Date(s.startTime as unknown as string)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })
    )
  ).sort().reverse()

  if (uniqueDates.length === 0) return 0

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  // Streak must include today or yesterday
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0

  let streak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]!)
    const curr = new Date(uniqueDates[i]!)
    const diffMs = prev.getTime() - curr.getTime()
    const diffDays = Math.round(diffMs / 86400000)
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function sessionActiveMs(s: SessionDoc): number {
  return s.status === 'completed' ? (s.activeMs || 0) : 0
}

function sessionToDate(s: SessionDoc): Date {
  return s.startTime instanceof Timestamp ? s.startTime.toDate() : new Date(s.startTime as unknown as string)
}

// ─── Hook ───────────────────────────────────────────────

export function useDashboard(inactivityDays = 3): DashboardData {
  const { user } = useAuth()
  const uid = user?.uid

  const [books, setBooks] = useState<(BookDoc & { coverUrl: string | null })[]>([])
  const [sessions, setSessions] = useState<SessionDoc[]>([])
  const [tracks, setTracks] = useState<CategoryTrackDoc[]>([])
  const [categories, setCategories] = useState<CategoryDoc[]>([])
  const [manualEntries, setManualEntries] = useState<Map<string, ManualTimeEntryDoc[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!uid) return
    try {
      setLoading(true)
      const [allBooks, allSessions, allTracks, allCategories] = await Promise.all([
        booksService.getAll(uid),
        sessionsService.getAll(uid),
        tracksService.getAll(uid),
        categoriesService.getAll(uid),
      ])

      // Resolve cover URLs in parallel
      const booksWithCovers = await Promise.all(
        allBooks.map(async (book) => {
          let coverUrl: string | null = null
          if (book.coverStoragePath) {
            try {
              coverUrl = await getCoverUrl(book.coverStoragePath)
            } catch { /* cover might not exist */ }
          }
          return { ...book, coverUrl }
        })
      )

      // Fetch manual entries for tracks
      const trackCategoryIds = [...new Set(allTracks.map((t) => t.categoryId))]
      const entriesMap = new Map<string, ManualTimeEntryDoc[]>()
      await Promise.all(
        trackCategoryIds.map(async (catId) => {
          const entries = await manualTimeEntriesService.getByCategory(uid, catId)
          entriesMap.set(catId, entries)
        })
      )

      setBooks(booksWithCovers)
      setSessions(allSessions)
      setTracks(allTracks)
      setCategories(allCategories)
      setManualEntries(entriesMap)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Build session aggregates per book
  const bookSessionMap = useMemo(() => {
    const map = new Map<string, { totalMs: number; lastDate: Date | null }>()
    for (const s of sessions) {
      if (s.status !== 'completed') continue
      const existing = map.get(s.bookId) || { totalMs: 0, lastDate: null }
      existing.totalMs += s.activeMs || 0
      const sDate = sessionToDate(s)
      if (!existing.lastDate || sDate > existing.lastDate) {
        existing.lastDate = sDate
      }
      map.set(s.bookId, existing)
    }
    return map
  }, [sessions])

  // Enrich books with progress data
  const enrichedBooks = useMemo(() => {
    return books.map((book) => {
      const sessionData = bookSessionMap.get(book.id)
      const enriched: BookWithProgress & { coverUrl: string | null } = {
        id: book.id,
        title: book.title,
        author: book.author,
        cover_path: book.coverStoragePath,
        description: book.description,
        language: book.language,
        total_words_estimate: book.totalWordsEstimate,
        category_id: book.categoryId,
        reading_mode: book.readingMode,
        created_at: book.createdAt instanceof Timestamp ? book.createdAt.toDate().toISOString() : '',
        updated_at: book.updatedAt instanceof Timestamp ? book.updatedAt.toDate().toISOString() : '',
        percent_complete: book.percentComplete,
        current_chapter: book.currentChapter,
        total_time_ms: sessionData?.totalMs ?? null,
        last_session_date: sessionData?.lastDate?.toISOString() ?? null,
        coverUrl: book.coverUrl,
      }
      return enriched
    })
  }, [books, bookSessionMap])

  // Currently reading: 0% < progress < 100%
  const currentlyReading = useMemo(() => {
    return enrichedBooks
      .filter((b) => (b.percent_complete ?? 0) > 0 && (b.percent_complete ?? 0) < 100)
      .sort((a, b) => {
        // Sort by last session date descending, then by updated_at
        const aDate = a.last_session_date ? new Date(a.last_session_date).getTime() : 0
        const bDate = b.last_session_date ? new Date(b.last_session_date).getTime() : 0
        return bDate - aDate
      })
  }, [enrichedBooks])

  // Recent: last 5 updated books
  const recent = useMemo(() => {
    return [...enrichedBooks]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
  }, [enrichedBooks])

  // Stale books: currently reading but no session in N days
  const staleBooks = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - inactivityDays)
    return currentlyReading.filter((b) => {
      if (!b.last_session_date) return true
      return new Date(b.last_session_date) < cutoff
    })
  }, [currentlyReading, inactivityDays])

  // Metrics
  const metrics = useMemo<DashboardMetrics>(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const weekStart = startOfWeek(now)

    let minutesToday = 0
    let minutesThisWeek = 0
    let totalWpm = 0
    let wpmCount = 0
    let totalPages = 0
    let totalActiveHours = 0
    let totalSessions = 0

    for (const s of sessions) {
      if (s.status !== 'completed') continue
      totalSessions++
      const activeMs = sessionActiveMs(s)
      const sDate = sessionToDate(s)

      if (sDate >= todayStart) {
        minutesToday += activeMs / 60000
      }
      if (sDate >= weekStart) {
        minutesThisWeek += activeMs / 60000
      }

      if (s.wordsReadEstimate > 0 && activeMs > 0) {
        const wpm = (s.wordsReadEstimate / activeMs) * 60000
        totalWpm += wpm
        wpmCount++
      }

      totalPages += s.pagesViewed || 0
      totalActiveHours += activeMs / 3600000
    }

    return {
      minutesToday: Math.round(minutesToday),
      minutesThisWeek: Math.round(minutesThisWeek),
      streak: computeStreak(sessions),
      avgWpm: wpmCount > 0 ? Math.round(totalWpm / wpmCount) : 0,
      totalSessions,
      pagesPerHour: totalActiveHours > 0 ? Math.round(totalPages / totalActiveHours) : 0,
    }
  }, [sessions])

  // Learning tracks with progress
  const tracksWithProgress = useMemo<TrackWithProgress[]>(() => {
    return tracks
      .map((track) => {
        const category = categories.find((c) => c.id === track.categoryId)
        if (!category) return null

        // Active minutes from sessions for books in this category
        const categoryBookIds = books
          .filter((b) => b.categoryId === track.categoryId)
          .map((b) => b.id)

        const activeMinutes = sessions
          .filter((s) => s.status === 'completed' && categoryBookIds.includes(s.bookId))
          .reduce((acc, s) => acc + (s.activeMs || 0) / 60000, 0)

        // Manual time entries
        const entries = manualEntries.get(track.categoryId) || []
        const manualMinutes = entries.reduce((acc, e) => acc + e.deltaMinutes, 0)

        const manualBaseMinutes = (track.manualBaseHours || 0) * 60
        const totalMinutes = activeMinutes + manualMinutes + manualBaseMinutes
        const totalHours = totalMinutes / 60
        const targetHours = track.targetHoursTotal || 0
        const percentComplete = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0

        const progress: TrackProgress = {
          activeMinutes: Math.round(activeMinutes),
          manualMinutes: Math.round(manualMinutes),
          manualBaseMinutes: Math.round(manualBaseMinutes),
          totalMinutes: Math.round(totalMinutes),
          totalHours: Math.round(totalHours * 10) / 10,
          percentComplete: Math.round(percentComplete),
        }

        const trackWithProgress: TrackWithProgress = {
          id: track.id,
          category_id: track.categoryId,
          target_hours_total: track.targetHoursTotal,
          weekly_target_hours: track.weeklyTargetHours,
          target_deadline: track.targetDeadline instanceof Timestamp ? track.targetDeadline.toDate().toISOString() : null,
          manual_base_hours: track.manualBaseHours,
          notes: track.notes,
          source_label: track.sourceLabel,
          created_at: track.createdAt instanceof Timestamp ? track.createdAt.toDate().toISOString() : '',
          updated_at: track.updatedAt instanceof Timestamp ? track.updatedAt.toDate().toISOString() : '',
          category: {
            id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon,
            created_at: category.createdAt instanceof Timestamp ? category.createdAt.toDate().toISOString() : '',
          },
          progress,
        }
        return trackWithProgress
      })
      .filter((t): t is TrackWithProgress => t !== null)
      .sort((a, b) => b.progress.percentComplete - a.progress.percentComplete)
      .slice(0, 3)
  }, [tracks, categories, books, sessions, manualEntries])

  return {
    currentlyReading,
    recent,
    staleBooks,
    tracks: tracksWithProgress,
    metrics,
    loading,
    refresh: fetchAll,
  }
}
