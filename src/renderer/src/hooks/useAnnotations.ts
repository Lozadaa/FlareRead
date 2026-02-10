import { useState, useCallback, useEffect, useRef } from 'react'
import { Highlight, Note } from '@/types'

interface UseAnnotationsOptions {
  bookId: string
}

export function useAnnotations({ bookId }: UseAnnotationsOptions) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)

  const loadAnnotations = useCallback(async () => {
    setLoading(true)
    const [h, n] = await Promise.all([
      window.api.highlights.getByBook(bookId) as Promise<Highlight[]>,
      window.api.notes.getByBook(bookId) as Promise<Note[]>
    ])
    setHighlights(h)
    setNotes(n)
    setLoading(false)
    loadedRef.current = true
  }, [bookId])

  useEffect(() => {
    loadAnnotations()
  }, [loadAnnotations])

  const createHighlight = useCallback(
    async (data: { cfi_range: string; text: string; color: string; chapter?: string }) => {
      const highlight = (await window.api.highlights.create({
        book_id: bookId,
        cfi_range: data.cfi_range,
        text: data.text,
        color: data.color,
        chapter: data.chapter
      })) as Highlight
      setHighlights((prev) => [highlight, ...prev])
      return highlight
    },
    [bookId]
  )

  const updateHighlight = useCallback(
    async (id: string, data: { color?: string }) => {
      const updated = (await window.api.highlights.update(id, data)) as Highlight
      setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)))
      return updated
    },
    []
  )

  const deleteHighlight = useCallback(async (id: string) => {
    await window.api.highlights.delete(id)
    setHighlights((prev) => prev.filter((h) => h.id !== id))
    // Also remove associated notes from local state
    setNotes((prev) => prev.filter((n) => n.highlight_id !== id))
  }, [])

  const createNote = useCallback(
    async (data: { highlight_id?: string; content: string; tags?: string[] }) => {
      const note = (await window.api.notes.create({
        book_id: bookId,
        highlight_id: data.highlight_id,
        content: data.content,
        tags: JSON.stringify(data.tags || [])
      })) as Note
      setNotes((prev) => [note, ...prev])
      return note
    },
    [bookId]
  )

  const updateNote = useCallback(
    async (id: string, data: { content?: string; tags?: string[] }) => {
      const updateData: Record<string, unknown> = {}
      if (data.content !== undefined) updateData.content = data.content
      if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags)
      const updated = (await window.api.notes.update(id, updateData)) as Note
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
      return updated
    },
    []
  )

  const deleteNote = useCallback(async (id: string) => {
    await window.api.notes.delete(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const getNotesForHighlight = useCallback(
    (highlightId: string) => {
      return notes.filter((n) => n.highlight_id === highlightId)
    },
    [notes]
  )

  return {
    highlights,
    notes,
    loading,
    loaded: loadedRef.current,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    createNote,
    updateNote,
    deleteNote,
    getNotesForHighlight,
    reload: loadAnnotations
  }
}
