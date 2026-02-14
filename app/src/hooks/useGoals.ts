import { useState, useEffect, useCallback, useMemo } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import {
  booksService,
  sessionsService,
  tracksService,
  categoriesService,
  manualTimeEntriesService,
} from '@/services'
import type {
  BookDoc,
  SessionDoc,
  CategoryDoc,
  CategoryTrackDoc,
  ManualTimeEntryDoc,
  TrackWithProgress,
  TrackProgress,
} from '@/types'

export interface GoalsData {
  categories: CategoryDoc[]
  tracks: TrackWithProgress[]
  manualEntries: Map<string, ManualTimeEntryDoc[]> // categoryId -> entries
  loading: boolean
  // Category CRUD
  createCategory: (data: { name: string; color: string; icon: string | null }) => Promise<CategoryDoc>
  updateCategory: (id: string, data: { name?: string; color?: string; icon?: string | null }) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  // Track CRUD
  createTrack: (data: {
    categoryId: string
    targetHoursTotal: number | null
    weeklyTargetHours: number | null
    targetDeadline: Date | null
    manualBaseHours: number | null
    notes: string | null
    sourceLabel: string | null
  }) => Promise<CategoryTrackDoc>
  updateTrack: (
    id: string,
    data: Partial<{
      targetHoursTotal: number | null
      weeklyTargetHours: number | null
      targetDeadline: Date | null
      manualBaseHours: number | null
      notes: string | null
      sourceLabel: string | null
    }>
  ) => Promise<void>
  deleteTrack: (id: string) => Promise<void>
  // Manual time entries
  addManualEntry: (categoryId: string, deltaMinutes: number, note: string | null, occurredAt: Date) => Promise<void>
  deleteManualEntry: (entryId: string) => Promise<void>
  // Refresh
  refresh: () => void
  // Get entries for a specific category
  getEntriesForCategory: (categoryId: string) => ManualTimeEntryDoc[]
}

export function useGoals(): GoalsData {
  const { user } = useAuth()
  const uid = user?.uid

  const [categories, setCategories] = useState<CategoryDoc[]>([])
  const [rawTracks, setRawTracks] = useState<CategoryTrackDoc[]>([])
  const [books, setBooks] = useState<BookDoc[]>([])
  const [sessions, setSessions] = useState<SessionDoc[]>([])
  const [manualEntries, setManualEntries] = useState<Map<string, ManualTimeEntryDoc[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!uid) return
    try {
      setLoading(true)
      const [allCategories, allTracks, allBooks, allSessions] = await Promise.all([
        categoriesService.getAll(uid),
        tracksService.getAll(uid),
        booksService.getAll(uid),
        sessionsService.getAll(uid),
      ])

      // Fetch manual entries for all categories that have tracks
      const categoryIds = allTracks.map((t) => t.categoryId)
      const uniqueCategoryIds = [...new Set(categoryIds)]
      const entriesMap = new Map<string, ManualTimeEntryDoc[]>()

      await Promise.all(
        uniqueCategoryIds.map(async (catId) => {
          const entries = await manualTimeEntriesService.getByCategory(uid, catId)
          entriesMap.set(catId, entries)
        })
      )

      setCategories(allCategories)
      setRawTracks(allTracks)
      setBooks(allBooks)
      setSessions(allSessions)
      setManualEntries(entriesMap)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Build tracks with progress (including manual entries)
  const tracks = useMemo<TrackWithProgress[]>(() => {
    return rawTracks
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

        // Manual time entries total
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
          target_deadline:
            track.targetDeadline instanceof Timestamp
              ? track.targetDeadline.toDate().toISOString()
              : null,
          manual_base_hours: track.manualBaseHours,
          notes: track.notes,
          source_label: track.sourceLabel,
          created_at:
            track.createdAt instanceof Timestamp ? track.createdAt.toDate().toISOString() : '',
          updated_at:
            track.updatedAt instanceof Timestamp ? track.updatedAt.toDate().toISOString() : '',
          category: {
            id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon,
            created_at:
              category.createdAt instanceof Timestamp
                ? category.createdAt.toDate().toISOString()
                : '',
          },
          progress,
        }
        return trackWithProgress
      })
      .filter((t): t is TrackWithProgress => t !== null)
      .sort((a, b) => b.progress.percentComplete - a.progress.percentComplete)
  }, [rawTracks, categories, books, sessions, manualEntries])

  // ─── Category CRUD ─────────────────────────────────────
  const createCategory = useCallback(
    async (data: { name: string; color: string; icon: string | null }) => {
      if (!uid) throw new Error('Not authenticated')
      const cat = await categoriesService.create(uid, data)
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
      return cat
    },
    [uid]
  )

  const updateCategory = useCallback(
    async (id: string, data: { name?: string; color?: string; icon?: string | null }) => {
      if (!uid) throw new Error('Not authenticated')
      await categoriesService.update(uid, id, data)
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, ...data } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    },
    [uid]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!uid) throw new Error('Not authenticated')
      await categoriesService.delete(uid, id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    },
    [uid]
  )

  // ─── Track CRUD ────────────────────────────────────────
  const createTrack = useCallback(
    async (data: {
      categoryId: string
      targetHoursTotal: number | null
      weeklyTargetHours: number | null
      targetDeadline: Date | null
      manualBaseHours: number | null
      notes: string | null
      sourceLabel: string | null
    }) => {
      if (!uid) throw new Error('Not authenticated')
      const track = await tracksService.create(uid, {
        categoryId: data.categoryId,
        targetHoursTotal: data.targetHoursTotal,
        weeklyTargetHours: data.weeklyTargetHours,
        targetDeadline: data.targetDeadline ? Timestamp.fromDate(data.targetDeadline) : null,
        manualBaseHours: data.manualBaseHours,
        notes: data.notes,
        sourceLabel: data.sourceLabel,
      })
      setRawTracks((prev) => [...prev, track])
      return track
    },
    [uid]
  )

  const updateTrack = useCallback(
    async (
      id: string,
      data: Partial<{
        targetHoursTotal: number | null
        weeklyTargetHours: number | null
        targetDeadline: Date | null
        manualBaseHours: number | null
        notes: string | null
        sourceLabel: string | null
      }>
    ) => {
      if (!uid) throw new Error('Not authenticated')
      const firestoreData: Record<string, unknown> = {}
      if ('targetHoursTotal' in data) firestoreData.targetHoursTotal = data.targetHoursTotal
      if ('weeklyTargetHours' in data) firestoreData.weeklyTargetHours = data.weeklyTargetHours
      if ('targetDeadline' in data)
        firestoreData.targetDeadline = data.targetDeadline
          ? Timestamp.fromDate(data.targetDeadline)
          : null
      if ('manualBaseHours' in data) firestoreData.manualBaseHours = data.manualBaseHours
      if ('notes' in data) firestoreData.notes = data.notes
      if ('sourceLabel' in data) firestoreData.sourceLabel = data.sourceLabel

      await tracksService.update(uid, id, firestoreData as Partial<CategoryTrackDoc>)
      setRawTracks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...firestoreData } : t))
      )
    },
    [uid]
  )

  const deleteTrack = useCallback(
    async (id: string) => {
      if (!uid) throw new Error('Not authenticated')
      await tracksService.delete(uid, id)
      setRawTracks((prev) => prev.filter((t) => t.id !== id))
    },
    [uid]
  )

  // ─── Manual Time Entries ───────────────────────────────
  const addManualEntry = useCallback(
    async (categoryId: string, deltaMinutes: number, note: string | null, occurredAt: Date) => {
      if (!uid) throw new Error('Not authenticated')
      const entry = await manualTimeEntriesService.create(uid, {
        categoryId,
        deltaMinutes,
        note,
        occurredAt: Timestamp.fromDate(occurredAt),
      })
      setManualEntries((prev) => {
        const next = new Map(prev)
        const existing = next.get(categoryId) || []
        next.set(categoryId, [entry, ...existing])
        return next
      })
    },
    [uid]
  )

  const deleteManualEntry = useCallback(
    async (entryId: string) => {
      if (!uid) throw new Error('Not authenticated')
      await manualTimeEntriesService.delete(uid, entryId)
      setManualEntries((prev) => {
        const next = new Map(prev)
        for (const [catId, entries] of next) {
          const filtered = entries.filter((e) => e.id !== entryId)
          if (filtered.length !== entries.length) {
            next.set(catId, filtered)
            break
          }
        }
        return next
      })
    },
    [uid]
  )

  const getEntriesForCategory = useCallback(
    (categoryId: string): ManualTimeEntryDoc[] => {
      return manualEntries.get(categoryId) || []
    },
    [manualEntries]
  )

  return {
    categories,
    tracks,
    manualEntries,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    createTrack,
    updateTrack,
    deleteTrack,
    addManualEntry,
    deleteManualEntry,
    refresh: fetchAll,
    getEntriesForCategory,
  }
}
