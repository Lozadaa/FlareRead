import { useState, useEffect, useCallback } from 'react'
import { NoteWithContext, HIGHLIGHT_COLORS } from '@/types'

interface NotesViewProps {
  onOpenBook?: (bookId: string) => void
}

export function NotesView({ onOpenBook }: NotesViewProps) {
  const [notes, setNotes] = useState<NoteWithContext[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadNotes = useCallback(async () => {
    setLoading(true)
    const result = (await window.api.notes.getAll()) as NoteWithContext[]
    setNotes(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Collect all tags
  const allTags = Array.from(
    new Set(
      notes.flatMap((n) => {
        try { return JSON.parse(n.tags || '[]') as string[] } catch { return [] }
      })
    )
  )

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    // Tag filter
    if (filterTag) {
      try {
        const tags = JSON.parse(note.tags || '[]') as string[]
        if (!tags.includes(filterTag)) return false
      } catch { return false }
    }
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !note.content.toLowerCase().includes(q) &&
        !(note.highlight_text || '').toLowerCase().includes(q) &&
        !(note.book_title || '').toLowerCase().includes(q)
      ) {
        return false
      }
    }
    return true
  })

  // Group by book
  const bookGroups = new Map<string, { title: string; author: string | null; notes: NoteWithContext[] }>()
  for (const note of filteredNotes) {
    const key = note.book_id
    if (!bookGroups.has(key)) {
      bookGroups.set(key, {
        title: note.book_title || 'Unknown Book',
        author: note.book_author,
        notes: []
      })
    }
    bookGroups.get(key)!.notes.push(note)
  }

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      await window.api.notes.delete(noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    },
    []
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search and filters */}
      <div className="px-6 py-4 border-b border-border space-y-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes and highlights..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterTag(null)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                filterTag === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  filterTag === tag
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes content */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30 mb-3">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <p className="text-ui-lg text-foreground mb-1">No notes yet</p>
            <p className="text-ui-sm text-muted-foreground">
              Highlight text while reading to start taking notes
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-ui-sm text-muted-foreground">
              No notes match your search
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Array.from(bookGroups.entries()).map(([bookId, group]) => (
              <div key={bookId} className="px-6 py-4">
                {/* Book header */}
                <div className="mb-3">
                  <button
                    onClick={() => onOpenBook?.(bookId)}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left"
                  >
                    {group.title}
                  </button>
                  {group.author && (
                    <p className="text-xs text-muted-foreground">{group.author}</p>
                  )}
                </div>

                {/* Notes for this book */}
                <div className="space-y-3">
                  {group.notes.map((note) => {
                    const noteTags: string[] = (() => { try { return JSON.parse(note.tags || '[]') } catch { return [] } })()
                    const colorObj = HIGHLIGHT_COLORS.find((c) => c.value === note.highlight_color)
                    return (
                      <div key={note.id} className="flex gap-2">
                        {note.highlight_color && (
                          <div
                            className="w-1 rounded-full shrink-0"
                            style={{ backgroundColor: note.highlight_color }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {/* Highlighted text */}
                          {note.highlight_text && (
                            <p
                              className="text-sm text-muted-foreground italic mb-1 line-clamp-2"
                              style={{
                                backgroundColor: note.highlight_color
                                  ? `${note.highlight_color}40`
                                  : undefined,
                                padding: note.highlight_color ? '2px 4px' : undefined,
                                borderRadius: '2px'
                              }}
                            >
                              "{note.highlight_text}"
                            </p>
                          )}
                          {/* Note content */}
                          <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                          {/* Tags */}
                          {noteTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {noteTags.map((tag) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-6 py-2 border-t border-border text-xs text-muted-foreground shrink-0">
        {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''} across{' '}
        {bookGroups.size} book{bookGroups.size !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
