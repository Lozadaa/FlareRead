import { useState } from 'react'
import { HIGHLIGHT_COLORS, type HighlightDoc, type NoteDoc } from '@/types'

interface HighlightPopoverProps {
  position: { x: number; y: number }
  highlight: HighlightDoc
  notes: NoteDoc[]
  onChangeColor: (color: string) => void
  onDelete: () => void
  onAddNote: (content: string) => void
  onUpdateNote: (noteId: string, content: string) => void
  onDeleteNote: (noteId: string) => void
  onDismiss: () => void
}

export function HighlightPopover({
  position,
  highlight,
  notes,
  onChangeColor,
  onDelete,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDismiss,
}: HighlightPopoverProps) {
  const [noteText, setNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)

  const popoverWidth = 320
  const left = Math.max(8, Math.min(position.x - popoverWidth / 2, window.innerWidth - popoverWidth - 8))
  const top = Math.max(8, position.y + 12)

  const handleAddNote = () => {
    if (!noteText.trim()) return
    onAddNote(noteText.trim())
    setNoteText('')
    setShowNoteInput(false)
  }

  const handleSaveEdit = (noteId: string) => {
    if (!editingNoteText.trim()) return
    onUpdateNote(noteId, editingNoteText.trim())
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onDismiss} />

      <div
        className="fixed z-50 w-80 rounded-xl bg-card border border-border shadow-xl animate-fade-in overflow-hidden"
        style={{ left, top, maxHeight: 'calc(100vh - 100px)' }}
      >
        {/* Selected text preview */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-ui-xs font-body text-muted-foreground line-clamp-2 italic">
            "{highlight.text}"
          </p>
        </div>

        {/* Color picker row */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onChangeColor(color.value)}
              className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
                highlight.color === color.value
                  ? 'ring-2 ring-foreground/40 ring-offset-2 ring-offset-card'
                  : 'border border-transparent hover:border-foreground/20'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}

          <div className="flex-1" />

          {/* Delete highlight */}
          <button
            onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
            title="Remove highlight"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Existing notes */}
        {notes.length > 0 && (
          <div className="px-4 py-2 space-y-2 border-b border-border max-h-40 overflow-y-auto">
            {notes.map((note) => (
              <div key={note.id} className="group">
                {editingNoteId === note.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-ui-xs font-body bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSaveEdit(note.id)
                        }
                        if (e.key === 'Escape') {
                          setEditingNoteId(null)
                        }
                      }}
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-0.5 text-ui-xs font-body text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-2 py-0.5 text-ui-xs font-body font-medium text-primary hover:underline"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-ui-xs font-body text-foreground leading-relaxed">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => {
                          setEditingNoteId(note.id)
                          setEditingNoteText(note.content)
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                        title="Edit note"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                        title="Delete note"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add note area */}
        <div className="px-4 py-2.5">
          {showNoteInput ? (
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a note..."
                className="w-full px-2.5 py-2 text-ui-xs font-body bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddNote()
                  }
                  if (e.key === 'Escape') {
                    setShowNoteInput(false)
                    setNoteText('')
                  }
                }}
              />
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={() => { setShowNoteInput(false); setNoteText('') }}
                  className="px-2.5 py-1 text-ui-xs font-body text-muted-foreground hover:text-foreground rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="px-2.5 py-1 text-ui-xs font-body font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Add Note
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNoteInput(true)}
              className="flex items-center gap-1.5 text-ui-xs font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add a note
            </button>
          )}
        </div>
      </div>
    </>
  )
}
