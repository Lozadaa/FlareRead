import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { highlightsService, notesService, booksService } from '@/services'
import { HIGHLIGHT_COLORS, type HighlightDoc, type NoteDoc, type BookDoc } from '@/types'

interface HighlightWithBook extends HighlightDoc {
  bookTitle: string
  bookAuthor: string | null
}

interface NoteWithContext extends NoteDoc {
  bookTitle: string
  bookAuthor: string | null
  highlightText: string | null
  highlightColor: string | null
}

export function NotesPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const navigate = useNavigate()

  const [highlights, setHighlights] = useState<HighlightWithBook[]>([])
  const [notes, setNotes] = useState<NoteWithContext[]>([])
  const [books, setBooks] = useState<BookDoc[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState<'highlights' | 'notes'>('highlights')

  // Edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Load all data
  useEffect(() => {
    if (!uid) return
    let cancelled = false

    async function loadData() {
      try {
        const [allHighlights, allNotes, allBooks] = await Promise.all([
          highlightsService.getAll(uid!),
          notesService.getAll(uid!),
          booksService.getAll(uid!),
        ])

        if (cancelled) return

        const bookMap = new Map(allBooks.map((b) => [b.id, b]))
        setBooks(allBooks)

        setHighlights(
          allHighlights.map((h) => ({
            ...h,
            bookTitle: bookMap.get(h.bookId)?.title || 'Unknown Book',
            bookAuthor: bookMap.get(h.bookId)?.author || null,
          }))
        )

        setNotes(
          allNotes.map((n) => {
            const linkedHighlight = n.highlightId
              ? allHighlights.find((h) => h.id === n.highlightId)
              : null
            return {
              ...n,
              bookTitle: bookMap.get(n.bookId)?.title || 'Unknown Book',
              bookAuthor: bookMap.get(n.bookId)?.author || null,
              highlightText: linkedHighlight?.text || null,
              highlightColor: linkedHighlight?.color || null,
            }
          })
        )

        setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [uid])

  // Filter highlights
  const filteredHighlights = highlights.filter((h) => {
    if (selectedBookId && h.bookId !== selectedBookId) return false
    if (selectedColor && h.color !== selectedColor) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !h.text.toLowerCase().includes(q) &&
        !h.bookTitle.toLowerCase().includes(q) &&
        !(h.chapter || '').toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (selectedBookId && n.bookId !== selectedBookId) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !n.content.toLowerCase().includes(q) &&
        !n.bookTitle.toLowerCase().includes(q) &&
        !(n.highlightText || '').toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  // Books that have highlights or notes
  const booksWithAnnotations = books.filter(
    (b) =>
      highlights.some((h) => h.bookId === b.id) ||
      notes.some((n) => n.bookId === b.id)
  )

  // Delete highlight
  const handleDeleteHighlight = useCallback(
    async (id: string) => {
      if (!uid) return
      await highlightsService.delete(uid, id)
      setHighlights((prev) => prev.filter((h) => h.id !== id))
      // Also remove linked notes from view
      setNotes((prev) => prev.filter((n) => n.highlightId !== id))
    },
    [uid]
  )

  // Delete note
  const handleDeleteNote = useCallback(
    async (id: string) => {
      if (!uid) return
      await notesService.delete(uid, id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    },
    [uid]
  )

  // Edit note
  const handleStartEdit = useCallback((note: NoteWithContext) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null)
    setEditContent('')
  }, [])

  const handleSaveEdit = useCallback(
    async (id: string) => {
      if (!uid || !editContent.trim()) return
      await notesService.update(uid, id, { content: editContent.trim() })
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, content: editContent.trim() } : n))
      )
      setEditingNoteId(null)
      setEditContent('')
    },
    [uid, editContent]
  )

  // Export all (or filtered) to Markdown
  const handleExport = useCallback(() => {
    const lines: string[] = []
    lines.push('# My Reading Annotations')
    lines.push(`*Exported from FlareRead on ${new Date().toLocaleDateString()}*`)
    lines.push('')

    // Group highlights by book
    const byBook = new Map<string, { title: string; author: string | null; highlights: HighlightWithBook[]; notes: NoteWithContext[] }>()

    for (const h of filteredHighlights) {
      if (!byBook.has(h.bookId)) {
        byBook.set(h.bookId, { title: h.bookTitle, author: h.bookAuthor, highlights: [], notes: [] })
      }
      byBook.get(h.bookId)!.highlights.push(h)
    }

    for (const n of filteredNotes) {
      if (!byBook.has(n.bookId)) {
        byBook.set(n.bookId, { title: n.bookTitle, author: n.bookAuthor, highlights: [], notes: [] })
      }
      byBook.get(n.bookId)!.notes.push(n)
    }

    for (const [, bookData] of byBook) {
      lines.push(`## ${bookData.title}`)
      if (bookData.author) lines.push(`*by ${bookData.author}*`)
      lines.push('')

      if (bookData.highlights.length > 0) {
        // Group by chapter
        const byChapter = new Map<string, HighlightWithBook[]>()
        for (const h of bookData.highlights) {
          const ch = h.chapter || 'Other'
          if (!byChapter.has(ch)) byChapter.set(ch, [])
          byChapter.get(ch)!.push(h)
        }

        for (const [chapter, chHighlights] of byChapter) {
          lines.push(`### ${chapter}`)
          lines.push('')
          for (const h of chHighlights) {
            lines.push(`> ${h.text}`)
            lines.push('')
            // Add linked notes
            const linked = filteredNotes.filter((n) => n.highlightId === h.id)
            for (const n of linked) {
              lines.push(`**Note:** ${n.content}`)
              lines.push('')
            }
          }
        }
      }

      // Standalone notes
      const standalone = bookData.notes.filter((n) => !n.highlightId)
      if (standalone.length > 0) {
        lines.push('### Notes')
        lines.push('')
        for (const n of standalone) {
          lines.push(`- ${n.content}`)
          if (n.tags.length > 0) {
            lines.push(`  *Tags: ${n.tags.join(', ')}*`)
          }
          lines.push('')
        }
      }
    }

    const markdown = lines.join('\n')
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flareread-annotations-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredHighlights, filteredNotes])

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const totalAnnotations = highlights.length + notes.length

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
            Notes & Highlights
          </h2>
          <p className="text-ui-sm text-muted-foreground font-body">
            {totalAnnotations === 0
              ? 'Start highlighting text in your books to see them here.'
              : `${highlights.length} highlight${highlights.length !== 1 ? 's' : ''} and ${notes.length} note${notes.length !== 1 ? 's' : ''} across ${booksWithAnnotations.length} book${booksWithAnnotations.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {totalAnnotations > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 text-ui-sm font-body font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Markdown
          </button>
        )}
      </div>

      {totalAnnotations === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-16 h-16 text-muted-foreground/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          <h3 className="text-ui-base font-body font-medium text-foreground mb-1">No annotations yet</h3>
          <p className="text-ui-sm font-body text-muted-foreground max-w-sm">
            Open a book and select text to create highlights. You can also add notes to your highlights or create standalone notes.
          </p>
          <button
            onClick={() => navigate('/library')}
            className="mt-4 px-4 py-2 text-ui-sm font-body font-medium text-primary hover:underline"
          >
            Go to Library
          </button>
        </div>
      ) : (
        <>
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Search annotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-ui-sm font-body bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Book filter */}
            {booksWithAnnotations.length > 1 && (
              <select
                value={selectedBookId || ''}
                onChange={(e) => setSelectedBookId(e.target.value || null)}
                className="px-3 py-2 text-ui-sm font-body bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All books</option>
                {booksWithAnnotations.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            )}

            {/* Color filter (highlights tab only) */}
            {tab === 'highlights' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedColor(null)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${
                    !selectedColor ? 'border-foreground/40 bg-accent' : 'border-transparent hover:border-foreground/20'
                  }`}
                  title="All colors"
                >
                  All
                </button>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedColor(selectedColor === c.value ? null : c.value)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      selectedColor === c.value
                        ? 'ring-2 ring-foreground/40 ring-offset-2 ring-offset-background'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-4">
            <button
              onClick={() => setTab('highlights')}
              className={`px-4 py-2.5 text-ui-sm font-body font-medium transition-colors border-b-2 ${
                tab === 'highlights'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Highlights ({filteredHighlights.length})
            </button>
            <button
              onClick={() => setTab('notes')}
              className={`px-4 py-2.5 text-ui-sm font-body font-medium transition-colors border-b-2 ${
                tab === 'notes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Notes ({filteredNotes.length})
            </button>
          </div>

          {/* Content */}
          {tab === 'highlights' && (
            <div className="space-y-2">
              {filteredHighlights.length === 0 ? (
                <p className="py-8 text-center text-ui-sm font-body text-muted-foreground">
                  No highlights match your filters.
                </p>
              ) : (
                filteredHighlights.map((h) => {
                  const linkedNotes = notes.filter((n) => n.highlightId === h.id)
                  return (
                    <div
                      key={h.id}
                      className="group p-4 bg-card border border-border rounded-xl hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: h.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-ui-sm font-body text-foreground leading-relaxed">
                            {h.text}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-ui-xs font-body text-muted-foreground">
                            <button
                              onClick={() => navigate(`/read/${h.bookId}`)}
                              className="hover:text-primary transition-colors truncate max-w-[200px]"
                              title={`Open ${h.bookTitle}`}
                            >
                              {h.bookTitle}
                            </button>
                            {h.chapter && (
                              <>
                                <span className="text-border">|</span>
                                <span className="truncate max-w-[150px]">{h.chapter}</span>
                              </>
                            )}
                          </div>

                          {/* Linked notes */}
                          {linkedNotes.length > 0 && (
                            <div className="mt-2 pl-3 border-l-2 border-border space-y-1">
                              {linkedNotes.map((n) => (
                                <p key={n.id} className="text-ui-xs font-body text-muted-foreground">
                                  {n.content}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteHighlight(h.id)}
                          className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                          title="Delete highlight"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-2">
              {filteredNotes.length === 0 ? (
                <p className="py-8 text-center text-ui-sm font-body text-muted-foreground">
                  No notes match your filters.
                </p>
              ) : (
                filteredNotes.map((n) => {
                  const isEditing = editingNoteId === n.id
                  return (
                    <div
                      key={n.id}
                      className={`group p-4 bg-card border rounded-xl transition-colors ${
                        isEditing ? 'border-primary/40' : 'border-border hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {n.highlightColor ? (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 mt-1"
                            style={{ backgroundColor: n.highlightColor }}
                          />
                        ) : (
                          <svg className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div>
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleSaveEdit(n.id)
                                  }
                                  if (e.key === 'Escape') {
                                    handleCancelEdit()
                                  }
                                }}
                                autoFocus
                                rows={3}
                                className="w-full text-ui-sm font-body text-foreground leading-relaxed bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleSaveEdit(n.id)}
                                  disabled={!editContent.trim()}
                                  className="px-3 py-1.5 text-ui-xs font-body font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1.5 text-ui-xs font-body font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Cancel
                                </button>
                                <span className="text-[10px] text-muted-foreground/50 ml-auto">
                                  Ctrl+Enter to save
                                </span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-ui-sm font-body text-foreground leading-relaxed">
                                {n.content}
                              </p>

                              {/* Linked highlight text */}
                              {n.highlightText && (
                                <p className="mt-1.5 text-ui-xs font-body text-muted-foreground italic line-clamp-2">
                                  &ldquo;{n.highlightText}&rdquo;
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-2 text-ui-xs font-body text-muted-foreground">
                                <button
                                  onClick={() => navigate(`/read/${n.bookId}`)}
                                  className="hover:text-primary transition-colors truncate max-w-[200px]"
                                  title={`Open ${n.bookTitle}`}
                                >
                                  {n.bookTitle}
                                </button>
                                {n.tags.length > 0 && (
                                  <>
                                    <span className="text-border">|</span>
                                    <div className="flex gap-1">
                                      {n.tags.map((tag) => (
                                        <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-accent rounded">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEdit(n)}
                              className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
                              title="Edit note"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteNote(n.id)}
                              className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                              title="Delete note"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
