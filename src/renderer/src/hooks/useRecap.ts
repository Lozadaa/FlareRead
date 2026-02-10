import { useState, useCallback, useEffect } from 'react'
import { RecapData, StaleBook, DEFAULT_INACTIVITY_DAYS } from '@/types'

const SETTINGS_KEY = 'recap:inactivityDays'

export function useRecap() {
  const [inactivityDays, setInactivityDays] = useState(DEFAULT_INACTIVITY_DAYS)
  const [staleBooks, setStaleBooks] = useState<StaleBook[]>([])
  const [loading, setLoading] = useState(true)

  // Load threshold setting from DB
  useEffect(() => {
    window.api.settings.get(SETTINGS_KEY).then((val) => {
      if (val) {
        const parsed = parseInt(val, 10)
        if (!isNaN(parsed) && parsed > 0) setInactivityDays(parsed)
      }
    })
  }, [])

  // Update threshold setting
  const updateInactivityDays = useCallback(async (days: number) => {
    setInactivityDays(days)
    await window.api.settings.set(SETTINGS_KEY, String(days))
  }, [])

  // Load stale books for dashboard
  const loadStaleBooks = useCallback(async () => {
    setLoading(true)
    try {
      const books = (await window.api.recap.staleBooks(inactivityDays)) as StaleBook[]
      setStaleBooks(books)
    } catch (err) {
      console.error('Failed to load stale books:', err)
    } finally {
      setLoading(false)
    }
  }, [inactivityDays])

  useEffect(() => {
    loadStaleBooks()
  }, [loadStaleBooks])

  // Check if a specific book is stale (not read in N days)
  const isBookStale = useCallback(
    async (bookId: string): Promise<boolean> => {
      try {
        const recap = (await window.api.recap.getForBook(bookId)) as RecapData
        if (!recap.stats.last_session_date) return false
        const lastRead = new Date(recap.stats.last_session_date).getTime()
        const cutoff = Date.now() - inactivityDays * 86400000
        return lastRead < cutoff
      } catch {
        return false
      }
    },
    [inactivityDays]
  )

  // Get full recap data for a specific book
  const getRecapForBook = useCallback(async (bookId: string): Promise<RecapData | null> => {
    try {
      return (await window.api.recap.getForBook(bookId)) as RecapData
    } catch {
      return null
    }
  }, [])

  return {
    inactivityDays,
    updateInactivityDays,
    staleBooks,
    staleBooksLoading: loading,
    refreshStaleBooks: loadStaleBooks,
    isBookStale,
    getRecapForBook
  }
}
