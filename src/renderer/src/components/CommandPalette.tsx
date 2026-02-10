import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  FileText,
  Highlighter,
  StickyNote,
  Moon,
  Sun,
  Maximize,
  Minimize,
  TimerOff,
  Settings,
  LayoutDashboard,
  Library,
  Clock,
  Search
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command'
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { useTheme } from '@/components/ThemeProvider'
import type { Book, Highlight, NoteWithContext } from '@/types'
import type { NavPage } from '@/components/layout/Sidebar'

// ─── Types ───────────────────────────────────────────

interface CommandPaletteProps {
  books: Book[]
  onOpenBook: (book: Book) => void
  onNavigate: (page: NavPage) => void
  onImportDialog: () => void
}

interface RecentCommand {
  id: string
  label: string
  category: string
  timestamp: number
}

const RECENT_COMMANDS_KEY = 'flareread-recent-commands'
const MAX_RECENT = 5

// ─── Component ───────────────────────────────────────

export function CommandPalette({
  books,
  onOpenBook,
  onNavigate,
  onImportDialog
}: CommandPaletteProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlights, setHighlights] = useState<(Highlight & { book_title?: string })[]>([])
  const [notes, setNotes] = useState<NoteWithContext[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>([])
  const { theme, toggleTheme } = useTheme()

  // ─── Load recent commands from localStorage ────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY)
      if (stored) setRecentCommands(JSON.parse(stored))
    } catch {
      // ignore parse errors
    }
  }, [])

  const saveRecent = useCallback((id: string, label: string, category: string) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((r) => r.id !== id)
      const updated = [{ id, label, category, timestamp: Date.now() }, ...filtered].slice(
        0,
        MAX_RECENT
      )
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // ─── Global keyboard shortcut ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ─── Menu event listener ─────────────────────────
  useEffect(() => {
    return window.appApi.onMenuCommandPalette(() => {
      setOpen(true)
    })
  }, [])

  // ─── Load data when palette opens ──────────────────
  useEffect(() => {
    if (!open) return

    setSearch('')

    // Load highlights across all books
    const loadHighlights = async (): Promise<void> => {
      try {
        const allHighlights = (await window.api.highlights.getAll()) as Highlight[]
        // Enrich with book titles
        const bookMap = new Map(books.map((b) => [b.id, b.title]))
        const enriched = allHighlights.map((h) => ({
          ...h,
          book_title: bookMap.get(h.book_id) || 'Unknown Book'
        }))
        setHighlights(enriched)
      } catch {
        setHighlights([])
      }
    }

    // Load notes across all books
    const loadNotes = async (): Promise<void> => {
      try {
        const allNotes = (await window.api.notes.getAll()) as NoteWithContext[]
        setNotes(allNotes)
      } catch {
        setNotes([])
      }
    }

    // Check fullscreen state
    const checkFullscreen = async (): Promise<void> => {
      try {
        const fs = await window.appApi.isFullscreen()
        setIsFullscreen(fs)
      } catch {
        // ignore
      }
    }

    // Check session state
    const checkSession = async (): Promise<void> => {
      try {
        const state = await window.sessionApi.getState()
        setHasActiveSession(!!state)
      } catch {
        setHasActiveSession(false)
      }
    }

    loadHighlights()
    loadNotes()
    checkFullscreen()
    checkSession()
  }, [open, books])

  // ─── Action handlers ───────────────────────────────

  const runAction = useCallback(
    (id: string, label: string, category: string, action: () => void) => {
      saveRecent(id, label, category)
      setOpen(false)
      action()
    },
    [saveRecent]
  )

  const handleOpenBook = useCallback(
    (book: Book) => {
      runAction(`book:${book.id}`, book.title, 'Books', () => onOpenBook(book))
    },
    [onOpenBook, runAction]
  )

  const handleNavigate = useCallback(
    (page: NavPage, label: string) => {
      runAction(`nav:${page}`, label, 'Navigation', () => onNavigate(page))
    },
    [onNavigate, runAction]
  )

  const handleToggleTheme = useCallback(() => {
    runAction('action:theme', 'Switch theme', 'Actions', toggleTheme)
  }, [toggleTheme, runAction])

  const handleToggleFullscreen = useCallback(() => {
    runAction('action:fullscreen', 'Toggle fullscreen', 'Actions', () => {
      window.appApi.toggleFullscreen()
    })
  }, [runAction])

  const handleSessionToggle = useCallback(() => {
    if (hasActiveSession) {
      runAction('action:session-stop', 'Stop session', 'Actions', () => {
        window.sessionApi.stop()
      })
    }
    // Starting a session requires a book context, so navigate to it
  }, [hasActiveSession, runAction])

  const handleImport = useCallback(() => {
    runAction('action:import', 'Import EPUB', 'Actions', onImportDialog)
  }, [onImportDialog, runAction])

  // ─── Show recent when search is empty ──────────────
  const showRecent = search.trim() === '' && recentCommands.length > 0

  // ─── Compute searchable highlights/notes (limit for perf) ─────
  const searchableHighlights = useMemo(() => highlights.slice(0, 100), [highlights])
  const searchableNotes = useMemo(() => notes.slice(0, 100), [notes])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border/40 bg-popover/95 backdrop-blur-xl text-popover-foreground shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
        <Command
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ui-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
          loop
        >
          <div className="border-b border-border/50">
            <CommandInput
              placeholder="Search books, notes, actions..."
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <CommandList className="max-h-[360px] py-2">
            <CommandEmpty className="py-8 text-center text-ui-sm text-muted-foreground">
              No results found.
            </CommandEmpty>

            {/* ─── Recent Commands ─────────────────── */}
            {showRecent && (
              <CommandGroup heading="Recent">
                {recentCommands.map((recent) => (
                  <CommandItem
                    key={`recent:${recent.id}`}
                    value={`recent ${recent.label}`}
                    onSelect={() => {
                      // Re-execute the recent command by finding it
                      const bookMatch = recent.id.match(/^book:(.+)$/)
                      if (bookMatch) {
                        const book = books.find((b) => b.id === bookMatch[1])
                        if (book) handleOpenBook(book)
                        return
                      }
                      const navMatch = recent.id.match(/^nav:(.+)$/)
                      if (navMatch) {
                        handleNavigate(navMatch[1] as NavPage, recent.label)
                        return
                      }
                      if (recent.id === 'action:theme') handleToggleTheme()
                      if (recent.id === 'action:fullscreen') handleToggleFullscreen()
                      if (recent.id === 'action:import') handleImport()
                      if (recent.id === 'action:session-stop') handleSessionToggle()
                    }}
                  >
                    <Clock className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                    <span className="text-ui-sm">{recent.label}</span>
                    <CommandShortcut className="text-ui-sm text-muted-foreground/50">{recent.category}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showRecent && <CommandSeparator className="mx-2 bg-border/50" />}

            {/* ─── Books ──────────────────────────── */}
            <CommandGroup heading="Books">
              {books.map((book) => (
                <CommandItem
                  key={`book:${book.id}`}
                  value={`book ${book.title} ${book.author || ''}`}
                  onSelect={() => handleOpenBook(book)}
                >
                  <BookOpen className="mr-2.5 h-4 w-4 text-primary/70" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-ui-sm">{book.title}</span>
                    {book.author && (
                      <span className="text-ui-sm text-muted-foreground/70 truncate">
                        {book.author}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="mx-2 bg-border/50" />

            {/* ─── Highlights ─────────────────────── */}
            {searchableHighlights.length > 0 && (
              <CommandGroup heading="Highlights">
                {searchableHighlights.map((highlight) => (
                  <CommandItem
                    key={`hl:${highlight.id}`}
                    value={`highlight ${highlight.text} ${highlight.book_title || ''} ${highlight.chapter || ''}`}
                    onSelect={() => {
                      const book = books.find((b) => b.id === highlight.book_id)
                      if (book) handleOpenBook(book)
                    }}
                  >
                    <Highlighter
                      className="mr-2.5 h-4 w-4 shrink-0"
                      style={{ color: highlight.color }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-ui-sm">
                        {highlight.text.length > 80
                          ? highlight.text.slice(0, 80) + '...'
                          : highlight.text}
                      </span>
                      <span className="text-ui-sm text-muted-foreground/70 truncate">
                        {highlight.book_title}
                        {highlight.chapter && ` · ${highlight.chapter}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* ─── Notes ──────────────────────────── */}
            {searchableNotes.length > 0 && (
              <>
                <CommandSeparator className="mx-2 bg-border/50" />
                <CommandGroup heading="Notes">
                  {searchableNotes.map((note) => (
                    <CommandItem
                      key={`note:${note.id}`}
                      value={`note ${note.content} ${note.book_title || ''} ${note.highlight_text || ''}`}
                      onSelect={() => {
                        const book = books.find((b) => b.id === note.book_id)
                        if (book) handleOpenBook(book)
                      }}
                    >
                      <StickyNote className="mr-2.5 h-4 w-4 shrink-0 text-gold" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-ui-sm">
                          {note.content.length > 80
                            ? note.content.slice(0, 80) + '...'
                            : note.content}
                        </span>
                        <span className="text-ui-sm text-muted-foreground/70 truncate">
                          {note.book_title || 'Unknown Book'}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator className="mx-2 bg-border/50" />

            {/* ─── Navigation ─────────────────────── */}
            <CommandGroup heading="Navigation">
              <CommandItem
                value="navigate dashboard"
                onSelect={() => handleNavigate('dashboard', 'Dashboard')}
              >
                <LayoutDashboard className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                <span className="text-ui-sm">Go to Dashboard</span>
                <CommandShortcut className="text-ui-sm text-muted-foreground/50">Navigation</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="navigate library"
                onSelect={() => handleNavigate('library', 'Library')}
              >
                <Library className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                <span className="text-ui-sm">Go to Library</span>
                <CommandShortcut className="text-ui-sm text-muted-foreground/50">Navigation</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="navigate sessions"
                onSelect={() => handleNavigate('sessions', 'Sessions')}
              >
                <Clock className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                <span className="text-ui-sm">Go to Sessions</span>
                <CommandShortcut className="text-ui-sm text-muted-foreground/50">Navigation</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="navigate notes highlights"
                onSelect={() => handleNavigate('notes', 'Notes')}
              >
                <StickyNote className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                <span className="text-ui-sm">Go to Notes & Highlights</span>
                <CommandShortcut className="text-ui-sm text-muted-foreground/50">Navigation</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="mx-2 bg-border/50" />

            {/* ─── Actions ────────────────────────── */}
            <CommandGroup heading="Actions">
              <CommandItem value="switch toggle theme dark light" onSelect={handleToggleTheme}>
                {theme === 'light' ? (
                  <Moon className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                ) : (
                  <Sun className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                )}
                <span className="text-ui-sm">{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</span>
              </CommandItem>

              <CommandItem
                value="toggle fullscreen maximize"
                onSelect={handleToggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                ) : (
                  <Maximize className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                )}
                <span className="text-ui-sm">{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
              </CommandItem>

              {hasActiveSession && (
                <CommandItem
                  value="stop pomodoro session timer"
                  onSelect={handleSessionToggle}
                >
                  <TimerOff className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                  <span className="text-ui-sm">Stop Current Session</span>
                </CommandItem>
              )}

              <CommandItem
                value="import epub add book"
                onSelect={handleImport}
              >
                <FileText className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                <span className="text-ui-sm">Import EPUB</span>
                <CommandShortcut className="text-ui-sm text-muted-foreground/50">Ctrl+O</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="search find"
                onSelect={() => {
                  runAction('nav:notes', 'Notes & Highlights', 'Navigation', () =>
                    onNavigate('notes')
                  )
                }}
              >
                <Search className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                <span className="text-ui-sm">Search Notes & Highlights</span>
              </CommandItem>

              <CommandItem
                value="settings preferences"
                onSelect={() => {
                  runAction('nav:settings', 'Settings', 'Navigation', () =>
                    onNavigate('settings')
                  )
                }}
              >
                <Settings className="mr-2.5 h-4 w-4 text-muted-foreground/60" />
                <span className="text-ui-sm">Open Settings</span>
                <CommandShortcut className="text-ui-sm text-muted-foreground/50">Ctrl+,</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>

          {/* Footer hint */}
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5 bg-muted/20">
            <div className="flex items-center gap-2 text-ui-sm text-muted-foreground/60">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-1.5 font-mono text-xs font-medium text-muted-foreground/70">
                ↑↓
              </kbd>
              <span>Navigate</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-1.5 font-mono text-xs font-medium text-muted-foreground/70 ml-1">
                ↵
              </kbd>
              <span>Select</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-1.5 font-mono text-xs font-medium text-muted-foreground/70 ml-1">
                Esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
        </Command>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  )
}
