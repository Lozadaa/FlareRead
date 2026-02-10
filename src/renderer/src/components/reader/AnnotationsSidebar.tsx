import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Highlight, Note, HIGHLIGHT_COLORS } from '@/types'

interface AnnotationsSidebarProps {
  isOpen: boolean
  onClose: () => void
  highlights: Highlight[]
  notes: Note[]
  onNavigateToCfi: (cfi: string) => void
  onCreateNote: (data: { highlight_id?: string; content: string; tags?: string[] }) => Promise<Note>
  onUpdateNote: (id: string, data: { content?: string; tags?: string[] }) => Promise<Note>
  onDeleteNote: (id: string) => void
  onUpdateHighlight: (id: string, data: { color?: string }) => void
  onDeleteHighlight: (id: string) => void
  onExport: () => void
  getNotesForHighlight: (highlightId: string) => Note[]
}

export function AnnotationsSidebar({
  isOpen,
  onClose,
  highlights,
  notes,
  onNavigateToCfi,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onUpdateHighlight,
  onDeleteHighlight,
  onExport,
  getNotesForHighlight
}: AnnotationsSidebarProps) {
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [addingNoteForHighlight, setAddingNoteForHighlight] = useState<string | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingTagsNoteId, setEditingTagsNoteId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  // Collect all tags for filtering
  const allTags = Array.from(
    new Set(notes.flatMap((n) => { try { return JSON.parse(n.tags || '[]') as string[] } catch { return [] } }))
  )

  // Filter highlights based on tag filter
  const filteredHighlights = filterTag
    ? highlights.filter((h) => {
        const relatedNotes = getNotesForHighlight(h.id)
        return relatedNotes.some((n) => {
          try {
            const tags = JSON.parse(n.tags || '[]') as string[]
            return tags.includes(filterTag)
          } catch { return false }
        })
      })
    : highlights

  const handleStartAddNote = useCallback((highlightId: string) => {
    setAddingNoteForHighlight(highlightId)
    setNewNoteContent('')
  }, [])

  const handleSaveNewNote = useCallback(
    async (highlightId: string) => {
      if (!newNoteContent.trim()) return
      await onCreateNote({ highlight_id: highlightId, content: newNoteContent.trim() })
      setAddingNoteForHighlight(null)
      setNewNoteContent('')
    },
    [newNoteContent, onCreateNote]
  )

  const handleStartEdit = useCallback((note: Note) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }, [])

  const handleSaveEdit = useCallback(
    async (noteId: string) => {
      if (!editContent.trim()) return
      await onUpdateNote(noteId, { content: editContent.trim() })
      setEditingNoteId(null)
    },
    [editContent, onUpdateNote]
  )

  const handleAddTag = useCallback(
    async (noteId: string) => {
      const tag = tagInput.trim()
      if (!tag) return
      const note = notes.find((n) => n.id === noteId)
      if (!note) return
      const existingTags: string[] = JSON.parse(note.tags || '[]')
      if (existingTags.includes(tag)) { setTagInput(''); return }
      await onUpdateNote(noteId, { tags: [...existingTags, tag] })
      setTagInput('')
    },
    [tagInput, notes, onUpdateNote]
  )

  const handleRemoveTag = useCallback(
    async (noteId: string, tag: string) => {
      const note = notes.find((n) => n.id === noteId)
      if (!note) return
      const existingTags: string[] = JSON.parse(note.tags || '[]')
      await onUpdateNote(noteId, { tags: existingTags.filter((t) => t !== tag) })
    },
    [notes, onUpdateNote]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-xl z-40 shadow-xl flex flex-col border-l border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="font-display italic text-foreground text-sm">
                Annotations
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={onExport}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                  title="Export to Markdown"
                  aria-label="Export to Markdown"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                  aria-label="Close annotations"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="px-4 py-2 border-b border-border/50 flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterTag(null)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                    filterTag === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-muted-foreground hover:bg-accent/80'
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
                        : 'bg-accent text-muted-foreground hover:bg-accent/80'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {filteredHighlights.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30 mb-3">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <p className="text-sm text-muted-foreground">No annotations yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Select text to highlight</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredHighlights.map((highlight) => {
                    const relatedNotes = getNotesForHighlight(highlight.id)
                    return (
                      <HighlightCard
                        key={highlight.id}
                        highlight={highlight}
                        notes={relatedNotes}
                        onNavigate={() => onNavigateToCfi(highlight.cfi_range)}
                        onAddNote={() => handleStartAddNote(highlight.id)}
                        onDeleteHighlight={() => onDeleteHighlight(highlight.id)}
                        onChangeColor={(color) => onUpdateHighlight(highlight.id, { color })}
                        addingNote={addingNoteForHighlight === highlight.id}
                        newNoteContent={newNoteContent}
                        onNewNoteContentChange={setNewNoteContent}
                        onSaveNewNote={() => handleSaveNewNote(highlight.id)}
                        onCancelNewNote={() => setAddingNoteForHighlight(null)}
                        editingNoteId={editingNoteId}
                        editContent={editContent}
                        onEditContentChange={setEditContent}
                        onStartEdit={handleStartEdit}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={() => setEditingNoteId(null)}
                        onDeleteNote={onDeleteNote}
                        editingTagsNoteId={editingTagsNoteId}
                        onToggleTagsEdit={(noteId) =>
                          setEditingTagsNoteId(editingTagsNoteId === noteId ? null : noteId)
                        }
                        tagInput={tagInput}
                        onTagInputChange={setTagInput}
                        onAddTag={handleAddTag}
                        onRemoveTag={handleRemoveTag}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Stats footer */}
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground shrink-0">
              {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} &middot;{' '}
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Highlight Card ─────────────────────────────────

interface HighlightCardProps {
  highlight: Highlight
  notes: Note[]
  onNavigate: () => void
  onAddNote: () => void
  onDeleteHighlight: () => void
  onChangeColor: (color: string) => void
  addingNote: boolean
  newNoteContent: string
  onNewNoteContentChange: (v: string) => void
  onSaveNewNote: () => void
  onCancelNewNote: () => void
  editingNoteId: string | null
  editContent: string
  onEditContentChange: (v: string) => void
  onStartEdit: (note: Note) => void
  onSaveEdit: (noteId: string) => void
  onCancelEdit: () => void
  onDeleteNote: (id: string) => void
  editingTagsNoteId: string | null
  onToggleTagsEdit: (noteId: string) => void
  tagInput: string
  onTagInputChange: (v: string) => void
  onAddTag: (noteId: string) => void
  onRemoveTag: (noteId: string, tag: string) => void
}

function HighlightCard({
  highlight,
  notes,
  onNavigate,
  onAddNote,
  onDeleteHighlight,
  onChangeColor,
  addingNote,
  newNoteContent,
  onNewNoteContentChange,
  onSaveNewNote,
  onCancelNewNote,
  editingNoteId,
  editContent,
  onEditContentChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteNote,
  editingTagsNoteId,
  onToggleTagsEdit,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag
}: HighlightCardProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)

  return (
    <div className="px-4 py-3 hover:bg-accent/50 transition-colors">
      {/* Chapter label */}
      {highlight.chapter && (
        <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1 font-medium">
          {highlight.chapter}
        </p>
      )}

      {/* Highlighted text with color bar */}
      <div className="flex gap-2">
        <div
          className="w-1 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: highlight.color }}
        />
        <button
          onClick={onNavigate}
          className="text-sm text-foreground/80 text-left leading-relaxed line-clamp-3 hover:text-primary transition-colors cursor-pointer"
          title="Jump to highlight"
        >
          {highlight.text}
        </button>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1 mt-2 ml-3">
        <button
          onClick={onAddNote}
          className="text-xs text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-primary/10"
          title="Add note"
        >
          + Note
        </button>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent"
          title="Change color"
        >
          Color
        </button>
        <button
          onClick={onDeleteHighlight}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-destructive/10 ml-auto"
          title="Remove highlight"
        >
          Remove
        </button>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className="flex items-center gap-1 mt-1 ml-3">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => { onChangeColor(c.value); setShowColorPicker(false) }}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                highlight.color === c.value ? 'border-foreground/50 scale-110' : 'border-transparent hover:border-foreground/30'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      )}

      {/* Notes for this highlight */}
      {notes.map((note) => {
        const noteTags: string[] = (() => { try { return JSON.parse(note.tags || '[]') } catch { return [] } })()
        return (
          <div key={note.id} className="ml-3 mt-2 pl-3 border-l-2 border-border">
            {editingNoteId === note.id ? (
              <div className="space-y-1">
                <textarea
                  value={editContent}
                  onChange={(e) => onEditContentChange(e.target.value)}
                  className="w-full text-sm p-2 border border-border rounded-md resize-none bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-1">
                  <button onClick={() => onSaveEdit(note.id)} className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Save</button>
                  <button onClick={onCancelEdit} className="text-xs px-2 py-0.5 bg-accent text-muted-foreground rounded hover:bg-accent/80 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {noteTags.map((tag) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full flex items-center gap-0.5">
                      {tag}
                      {editingTagsNoteId === note.id && (
                        <button onClick={() => onRemoveTag(note.id, tag)} className="hover:text-destructive">&times;</button>
                      )}
                    </span>
                  ))}
                </div>
                {/* Tag editing */}
                {editingTagsNoteId === note.id && (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => onTagInputChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddTag(note.id) } }}
                      placeholder="Add tag..."
                      className="text-xs px-2 py-0.5 border border-border rounded-md w-24 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                    />
                    <button onClick={() => onAddTag(note.id)} className="text-xs px-1.5 py-0.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Add</button>
                  </div>
                )}
                {/* Note actions */}
                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => onStartEdit(note)} className="text-xs text-muted-foreground hover:text-primary transition-colors">Edit</button>
                  <button onClick={() => onToggleTagsEdit(note.id)} className="text-xs text-muted-foreground hover:text-primary transition-colors">Tags</button>
                  <button onClick={() => onDeleteNote(note.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto">Delete</button>
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* Add note form */}
      {addingNote && (
        <div className="ml-3 mt-2 pl-3 border-l-2 border-primary/30 space-y-1">
          <textarea
            value={newNoteContent}
            onChange={(e) => onNewNoteContentChange(e.target.value)}
            placeholder="Write a note..."
            className="w-full text-sm p-2 border border-border rounded-md resize-none bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            rows={3}
            autoFocus
          />
          <div className="flex gap-1">
            <button onClick={onSaveNewNote} className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Save</button>
            <button onClick={onCancelNewNote} className="text-xs px-2 py-0.5 bg-accent text-muted-foreground rounded hover:bg-accent/80 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
