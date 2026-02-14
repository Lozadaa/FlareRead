import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BookWithCover } from '@/hooks/useLibrary'

interface BookCardProps {
  book: BookWithCover
  onDelete: () => void
}

export function BookCard({ book, onDelete }: BookCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const modeLabel =
    book.readingMode === 'study' ? 'Study' : book.readingMode === 'leisure' ? 'Leisure' : null

  return (
    <div
      className="group relative flex flex-col rounded-lg border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-border/80 cursor-pointer"
      onClick={() => navigate(`/read/${book.id}`)}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-primary/15 p-4">
            <svg
              className="w-10 h-10 text-primary/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span className="text-ui-xs text-primary/40 font-body text-center leading-tight line-clamp-2">
              {book.title}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {book.percentComplete > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${book.percentComplete}%` }}
            />
          </div>
        )}

        {/* Reading mode badge */}
        {modeLabel && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-body font-medium bg-background/80 backdrop-blur-sm text-foreground/80">
              {modeLabel}
            </span>
          </div>
        )}

        {/* Menu button */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm text-foreground/80 hover:bg-background transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-9 z-20 w-36 bg-popover border border-border rounded-md shadow-lg py-1 animate-fade-in">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setConfirmDelete(true)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-ui-sm font-body text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 p-3">
        <h4 className="text-ui-sm font-body font-medium text-foreground line-clamp-2 leading-snug">
          {book.title}
        </h4>
        {book.author && (
          <p className="text-ui-xs text-muted-foreground font-body mt-0.5 truncate">
            {book.author}
          </p>
        )}
        {book.percentComplete > 0 && (
          <p className="text-ui-xs text-primary font-body mt-1">
            {book.percentComplete}% complete
          </p>
        )}
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-card/95 backdrop-blur-sm p-4">
          <p className="text-ui-sm font-body text-foreground text-center">
            Delete <span className="font-medium">"{book.title}"</span>?
          </p>
          <p className="text-ui-xs text-muted-foreground text-center">
            This will remove the book and its files permanently.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-md text-ui-xs font-body font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
              className="px-3 py-1.5 rounded-md text-ui-xs font-body font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
