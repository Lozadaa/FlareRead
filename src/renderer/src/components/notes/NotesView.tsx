import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, StickyNote, Trash2 } from 'lucide-react'
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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search and filters */}
      <div className="px-6 py-4 border-b border-border/50 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes and highlights..."
            className="w-full pl-9 pr-3 py-2.5 text-ui-sm border border-border/50 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterTag(null)}
              className={`text-ui-sm px-2.5 py-1 rounded-full transition-all ${
                filterTag === null
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`text-ui-sm px-2.5 py-1 rounded-full transition-all ${
                  filterTag === tag
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes content */}
      <div className="flex-1 overflow-y-auto scroll-fade">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <StickyNote className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-ui-lg font-medium text-foreground mb-1">No notes yet</p>
            <p className="text-ui-sm text-muted-foreground/70">
              Highlight text while reading to start taking notes
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-ui-sm text-muted-foreground/70">
              No notes match your search
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {Array.from(bookGroups.entries()).map(([bookId, group], groupIndex) => (
              <motion.div
                key={bookId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: groupIndex * 0.05 }}
                className="px-6 py-5"
              >
                {/* Book header */}
                <div className="mb-3.5">
                  <button
                    onClick={() => onOpenBook?.(bookId)}
                    className="text-ui-sm font-semibold text-foreground hover:text-primary transition-colors text-left"
                  >
                    {group.title}
                  </button>
                  {group.author && (
                    <p className="text-ui-sm text-muted-foreground/60">{group.author}</p>
                  )}
                </div>

                {/* Notes for this book */}
                <div className="space-y-3">
                  {group.notes.map((note, noteIndex) => {
                    const noteTags: string[] = (() => { try { return JSON.parse(note.tags || '[]') } catch { return [] } })()
                    const colorObj = HIGHLIGHT_COLORS.find((c) => c.value === note.highlight_color)
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: noteIndex * 0.03 }}
                        className="group flex gap-2.5 p-3.5 rounded-xl border border-border/30 bg-card/50 hover:bg-card hover:border-border/50 transition-all"
                      >
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
                              className="text-ui-sm text-muted-foreground italic mb-1.5 line-clamp-2 rounded px-1.5 py-0.5"
                              style={{
                                backgroundColor: note.highlight_color
                                  ? `${note.highlight_color}18`
                                  : undefined,
                              }}
                            >
                              &ldquo;{note.highlight_text}&rdquo;
                            </p>
                          )}
                          {/* Note content */}
                          <p className="text-ui-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                          {/* Tags */}
                          {noteTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {noteTags.map((tag) => (
                                <span key={tag} className="text-xs px-1.5 py-0.5 bg-primary/8 text-primary rounded-full font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Actions */}
                          <div className="flex items-center gap-2.5 mt-2">
                            <span className="text-xs text-muted-foreground/50 tabular-nums">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-0.5"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-6 py-2.5 border-t border-border/40 text-ui-sm text-muted-foreground/60 shrink-0 tabular-nums">
        {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''} across{' '}
        {bookGroups.size} book{bookGroups.size !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
