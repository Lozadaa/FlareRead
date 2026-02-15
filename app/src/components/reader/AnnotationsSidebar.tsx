import { useState, useEffect } from 'react'
import { HIGHLIGHT_COLORS, type HighlightDoc, type NoteDoc } from '@/types'

interface AnnotationsSidebarProps {
  highlights: HighlightDoc[]
  notes: NoteDoc[]
  bookTitle?: string
  bookAuthor?: string | null
  onHighlightClick: (cfiRange: string) => void
  onDeleteHighlight: (id: string) => void
  onAddNote: (data: { highlightId: string | null; content: string }) => void
  onDeleteNote: (id: string) => void
  onExport: () => void
  onClose: () => void
}

type TabType = 'highlights' | 'notes'

export function AnnotationsSidebar({
  highlights,
  notes,
  onHighlightClick,
  onDeleteHighlight,
  onAddNote,
  onDeleteNote,
  onExport,
  onClose,
}: AnnotationsSidebarProps) {
  const [tab, setTab] = useState<TabType>('highlights')
  const [newNoteText, setNewNoteText] = useState('')
  const [showNewNote, setShowNewNote] = useState(false)

  const standaloneNotes = notes.filter((n) => !n.highlightId)
  const getNotesForHighlight = (highlightId: string) =>
    notes.filter((n) => n.highlightId === highlightId)

  const handleAddStandaloneNote = () => {
    if (!newNoteText.trim()) return
    onAddNote({ highlightId: null, content: newNoteText.trim() })
    setNewNoteText('')
    setShowNewNote(false)
  }

  // Group highlights by chapter
  const highlightsByChapter = new Map<string, HighlightDoc[]>()
  for (const h of highlights) {
    const chapter = h.chapter || 'Other'
    if (!highlightsByChapter.has(chapter)) highlightsByChapter.set(chapter, [])
    highlightsByChapter.get(chapter)!.push(h)
  }

  // Prevent body scroll on mobile when sidebar is open
  useEffect(() => {
    const isMobile = window.innerWidth < 1024
    if (isMobile) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [])

  const colorDot = (color: string) => {
    const name = HIGHLIGHT_COLORS.find((c) => c.value === color)?.name || 'Highlight'
    return (
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        title={name}
      />
    )
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 lg:relative lg:z-auto lg:w-80 h-full bg-card border-l border-border flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-ui-sm font-body font-semibold text-foreground">Annotations</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onExport}
            className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Export to Markdown"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setTab('highlights')}
          className={`flex-1 px-4 py-2 text-ui-xs font-body font-medium transition-colors border-b-2 ${
            tab === 'highlights'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Highlights ({highlights.length})
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`flex-1 px-4 py-2 text-ui-xs font-body font-medium transition-colors border-b-2 ${
            tab === 'notes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Notes ({standaloneNotes.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'highlights' && (
          <div className="py-2">
            {highlights.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                <p className="text-ui-xs font-body text-muted-foreground">
                  No highlights yet. Select text to highlight.
                </p>
              </div>
            ) : (
              Array.from(highlightsByChapter.entries()).map(([chapter, chapterHighlights]) => (
                <div key={chapter}>
                  <div className="px-4 py-1.5 text-ui-xs font-body font-medium text-muted-foreground uppercase tracking-wider bg-muted/50">
                    {chapter}
                  </div>
                  {chapterHighlights.map((h) => {
                    const linkedNotes = getNotesForHighlight(h.id)
                    return (
                      <div
                        key={h.id}
                        className="group px-4 py-2.5 border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => onHighlightClick(h.cfiRange)}
                      >
                        <div className="flex items-start gap-2">
                          {colorDot(h.color)}
                          <p className="flex-1 text-ui-xs font-body text-foreground leading-relaxed line-clamp-3">
                            {h.text}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteHighlight(h.id)
                            }}
                            className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded opacity-60 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                            title="Delete highlight"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {linkedNotes.length > 0 && (
                          <div className="ml-4.5 mt-1.5 pl-2.5 border-l-2 border-border">
                            {linkedNotes.map((note) => (
                              <p key={note.id} className="text-ui-xs font-body text-muted-foreground leading-relaxed">
                                {note.content}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="py-2">
            {/* Add standalone note button */}
            <div className="px-4 py-2">
              {showNewNote ? (
                <div className="space-y-2">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Write a note about this book..."
                    className="w-full px-3 py-2 text-ui-xs font-body bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddStandaloneNote()
                      }
                      if (e.key === 'Escape') {
                        setShowNewNote(false)
                        setNewNoteText('')
                      }
                    }}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => { setShowNewNote(false); setNewNoteText('') }}
                      className="px-2.5 py-1 text-ui-xs font-body text-muted-foreground hover:text-foreground rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddStandaloneNote}
                      disabled={!newNoteText.trim()}
                      className="px-2.5 py-1 text-ui-xs font-body font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-40"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewNote(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-ui-xs font-body text-muted-foreground border border-dashed border-border rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add a standalone note
                </button>
              )}
            </div>

            {standaloneNotes.length === 0 && !showNewNote ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="text-ui-xs font-body text-muted-foreground">
                  No standalone notes yet.
                </p>
              </div>
            ) : (
              standaloneNotes.map((note) => (
                <div
                  key={note.id}
                  className="group px-4 py-2.5 border-b border-border/50"
                >
                  <div className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <p className="flex-1 text-ui-xs font-body text-foreground leading-relaxed">
                      {note.content}
                    </p>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded opacity-60 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      title="Delete note"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 ml-5">
                      {note.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-body bg-accent text-muted-foreground rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-border text-ui-xs font-body text-muted-foreground shrink-0">
        {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} · {notes.length} note{notes.length !== 1 ? 's' : ''}
      </div>
      {/* Safe area padding for iOS */}
      <div className="pb-[env(safe-area-inset-bottom)] lg:hidden" />
    </div>
    </>
  )
}
