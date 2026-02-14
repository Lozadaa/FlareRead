import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { highlightsService, notesService } from '@/services'
import type { HighlightDoc, NoteDoc } from '@/types'

interface UseHighlightsOptions {
  bookId: string | null
}

export function useHighlights({ bookId }: UseHighlightsOptions) {
  const { user } = useAuth()
  const uid = user?.uid

  const [highlights, setHighlights] = useState<HighlightDoc[]>([])
  const [notes, setNotes] = useState<NoteDoc[]>([])
  const [loading, setLoading] = useState(true)

  // Track if mounted
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Load highlights and notes for the book
  useEffect(() => {
    if (!uid || !bookId) {
      setHighlights([])
      setNotes([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all([
      highlightsService.getByBook(uid, bookId),
      notesService.getByBook(uid, bookId),
    ])
      .then(([h, n]) => {
        if (!cancelled && mountedRef.current) {
          setHighlights(h)
          setNotes(n)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [uid, bookId])

  // Create a highlight
  const createHighlight = useCallback(
    async (data: { cfiRange: string; text: string; color: string; chapter: string | null }) => {
      if (!uid || !bookId) return null
      const highlight = await highlightsService.create(uid, {
        bookId,
        cfiRange: data.cfiRange,
        text: data.text,
        color: data.color,
        chapter: data.chapter,
      })
      if (mountedRef.current) {
        setHighlights((prev) => [highlight, ...prev])
      }
      return highlight
    },
    [uid, bookId]
  )

  // Update highlight color
  const updateHighlightColor = useCallback(
    async (highlightId: string, color: string) => {
      if (!uid) return
      await highlightsService.updateColor(uid, highlightId, color)
      if (mountedRef.current) {
        setHighlights((prev) =>
          prev.map((h) => (h.id === highlightId ? { ...h, color } : h))
        )
      }
    },
    [uid]
  )

  // Delete a highlight (and its notes)
  const deleteHighlight = useCallback(
    async (highlightId: string) => {
      if (!uid) return
      // Delete associated notes first
      const linkedNotes = notes.filter((n) => n.highlightId === highlightId)
      for (const note of linkedNotes) {
        await notesService.delete(uid, note.id)
      }
      await highlightsService.delete(uid, highlightId)
      if (mountedRef.current) {
        setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
        setNotes((prev) => prev.filter((n) => n.highlightId !== highlightId))
      }
    },
    [uid, notes]
  )

  // Create a note (linked to highlight or standalone)
  const createNote = useCallback(
    async (data: { highlightId: string | null; content: string; tags?: string[] }) => {
      if (!uid || !bookId) return null
      const note = await notesService.create(uid, {
        bookId,
        highlightId: data.highlightId,
        content: data.content,
        tags: data.tags || [],
      })
      if (mountedRef.current) {
        setNotes((prev) => [note, ...prev])
      }
      return note
    },
    [uid, bookId]
  )

  // Update a note
  const updateNote = useCallback(
    async (noteId: string, data: { content?: string; tags?: string[] }) => {
      if (!uid) return
      await notesService.update(uid, noteId, data)
      if (mountedRef.current) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, ...data } : n
          )
        )
      }
    },
    [uid]
  )

  // Delete a note
  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!uid) return
      await notesService.delete(uid, noteId)
      if (mountedRef.current) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      }
    },
    [uid]
  )

  // Get notes for a specific highlight
  const getNotesForHighlight = useCallback(
    (highlightId: string) => notes.filter((n) => n.highlightId === highlightId),
    [notes]
  )

  // Get standalone notes (not linked to any highlight)
  const standaloneNotes = notes.filter((n) => !n.highlightId)

  // Export to Markdown
  const exportToMarkdown = useCallback(
    (bookTitle: string, bookAuthor: string | null) => {
      const lines: string[] = []
      lines.push(`# ${bookTitle}`)
      if (bookAuthor) lines.push(`*by ${bookAuthor}*`)
      lines.push('')
      lines.push(`*Exported from FlareRead on ${new Date().toLocaleDateString()}*`)
      lines.push('')

      if (highlights.length > 0) {
        lines.push('## Highlights')
        lines.push('')

        // Group by chapter
        const byChapter = new Map<string, HighlightDoc[]>()
        for (const h of highlights) {
          const chapter = h.chapter || 'Unknown Chapter'
          if (!byChapter.has(chapter)) byChapter.set(chapter, [])
          byChapter.get(chapter)!.push(h)
        }

        for (const [chapter, chapterHighlights] of byChapter) {
          lines.push(`### ${chapter}`)
          lines.push('')
          for (const h of chapterHighlights) {
            lines.push(`> ${h.text}`)
            lines.push('')
            // Add linked notes
            const linkedNotes = notes.filter((n) => n.highlightId === h.id)
            for (const n of linkedNotes) {
              lines.push(`**Note:** ${n.content}`)
              lines.push('')
            }
          }
        }
      }

      if (standaloneNotes.length > 0) {
        lines.push('## Notes')
        lines.push('')
        for (const n of standaloneNotes) {
          lines.push(`- ${n.content}`)
          if (n.tags.length > 0) {
            lines.push(`  *Tags: ${n.tags.join(', ')}*`)
          }
          lines.push('')
        }
      }

      const markdown = lines.join('\n')
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bookTitle.replace(/[^a-zA-Z0-9 ]/g, '')}-annotations.md`
      a.click()
      URL.revokeObjectURL(url)
    },
    [highlights, notes, standaloneNotes]
  )

  return {
    highlights,
    notes,
    standaloneNotes,
    loading,
    createHighlight,
    updateHighlightColor,
    deleteHighlight,
    createNote,
    updateNote,
    deleteNote,
    getNotesForHighlight,
    exportToMarkdown,
  }
}
