import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { booksService } from '@/services'
import type { BookDoc } from '@/types'

// ─── Types ──────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  subtitle?: string
  section: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Constants ──────────────────────────────────────

const RECENT_COMMANDS_KEY = 'flareread-recent-commands'
const MAX_RECENT = 5
const MAX_BOOK_RESULTS = 5

// ─── Fuzzy search ───────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // Direct substring match (highest priority)
  if (lowerText.includes(lowerQuery)) return true

  // Token-based: every query token must appear somewhere in the text
  const tokens = lowerQuery.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) {
    return tokens.every((token) => lowerText.includes(token))
  }

  // Character-by-character fuzzy: all chars appear in order
  let qi = 0
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) qi++
  }
  return qi === lowerQuery.length
}

function fuzzyScore(text: string, query: string): number {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // Exact match
  if (lowerText === lowerQuery) return 100
  // Starts with
  if (lowerText.startsWith(lowerQuery)) return 90
  // Contains as substring
  if (lowerText.includes(lowerQuery)) return 70
  // Token match
  const tokens = lowerQuery.split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && tokens.every((t) => lowerText.includes(t))) return 50
  // Fuzzy char match
  return 30
}

// ─── Recent commands ────────────────────────────────

function getRecentCommands(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentCommand(commandId: string): void {
  try {
    const recent = getRecentCommands().filter((id) => id !== commandId)
    recent.unshift(commandId)
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // localStorage unavailable
  }
}

// ─── Icons ──────────────────────────────────────────

const icons = {
  search: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  library: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21" />
    </svg>
  ),
  sessions: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  notes: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
  goals: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
  upload: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  ),
  book: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  recent: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
}

// ─── Component ──────────────────────────────────────

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [books, setBooks] = useState<BookDoc[]>([])
  const [booksLoaded, setBooksLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const close = useCallback(() => {
    onOpenChange(false)
    setQuery('')
    setSelectedIndex(0)
  }, [onOpenChange])

  // Track command execution for recent commands
  const executeCommand = useCallback(
    (commandId: string, action: () => void) => {
      saveRecentCommand(commandId)
      action()
    },
    []
  )

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Fetch books when palette opens
  useEffect(() => {
    if (!open || !user?.uid || booksLoaded) return

    let cancelled = false
    booksService.getAll(user.uid).then((allBooks) => {
      if (!cancelled) {
        setBooks(allBooks)
        setBooksLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, user?.uid, booksLoaded])

  // Reset books cache when palette closes (so it refetches next time)
  useEffect(() => {
    if (!open) {
      setBooksLoaded(false)
    }
  }, [open])

  // ─── Build command list ─────────────────────────

  const navigationCommands: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        section: 'Navigation',
        icon: icons.dashboard,
        keywords: ['home', 'main', 'overview', 'stats'],
        action: () => executeCommand('nav-dashboard', () => { navigate('/'); close() }),
      },
      {
        id: 'nav-library',
        label: 'Go to Library',
        section: 'Navigation',
        icon: icons.library,
        keywords: ['books', 'collection', 'shelf'],
        action: () => executeCommand('nav-library', () => { navigate('/library'); close() }),
      },
      {
        id: 'nav-sessions',
        label: 'Go to Sessions',
        section: 'Navigation',
        icon: icons.sessions,
        keywords: ['reading', 'timer', 'pomodoro', 'history'],
        action: () => executeCommand('nav-sessions', () => { navigate('/sessions'); close() }),
      },
      {
        id: 'nav-notes',
        label: 'Go to Notes',
        section: 'Navigation',
        icon: icons.notes,
        keywords: ['highlights', 'annotations', 'writing'],
        action: () => executeCommand('nav-notes', () => { navigate('/notes'); close() }),
      },
      {
        id: 'nav-goals',
        label: 'Go to Goals',
        section: 'Navigation',
        icon: icons.goals,
        keywords: ['tracks', 'targets', 'progress', 'learning'],
        action: () => executeCommand('nav-goals', () => { navigate('/goals'); close() }),
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        section: 'Navigation',
        icon: icons.settings,
        keywords: ['preferences', 'config', 'theme', 'account'],
        action: () => executeCommand('nav-settings', () => { navigate('/settings'); close() }),
      },
      {
        id: 'action-import',
        label: 'Import EPUB',
        section: 'Actions',
        icon: icons.upload,
        keywords: ['upload', 'add', 'book', 'file'],
        action: () => executeCommand('action-import', () => { navigate('/library'); close() }),
      },
    ],
    [navigate, close, executeCommand]
  )

  // Book commands (dynamic, based on search)
  const bookCommands: CommandItem[] = useMemo(() => {
    if (!query.trim()) return []

    return books
      .filter((book) => {
        const searchText = `${book.title} ${book.author || ''}`
        return fuzzyMatch(searchText, query)
      })
      .sort((a, b) => {
        const searchTextA = `${a.title} ${a.author || ''}`
        const searchTextB = `${b.title} ${b.author || ''}`
        return fuzzyScore(searchTextB, query) - fuzzyScore(searchTextA, query)
      })
      .slice(0, MAX_BOOK_RESULTS)
      .map((book) => ({
        id: `book-${book.id}`,
        label: book.title,
        subtitle: book.author || undefined,
        section: 'Books',
        icon: icons.book,
        action: () =>
          executeCommand(`book-${book.id}`, () => {
            navigate(`/read/${book.id}`)
            close()
          }),
      }))
  }, [books, query, navigate, close, executeCommand])

  // Recent commands section
  const recentCommands: CommandItem[] = useMemo(() => {
    if (query.trim()) return [] // Don't show recent when searching

    const recentIds = getRecentCommands()
    const allCommands = [...navigationCommands]

    // Also include recently opened books
    const recentBookCommands = recentIds
      .filter((id) => id.startsWith('book-'))
      .map((id) => {
        const bookId = id.replace('book-', '')
        const book = books.find((b) => b.id === bookId)
        if (!book) return null
        return {
          id,
          label: book.title,
          subtitle: book.author || undefined,
          section: 'Recent',
          icon: icons.book,
          action: () =>
            executeCommand(id, () => {
              navigate(`/read/${bookId}`)
              close()
            }),
        } satisfies CommandItem
      })
      .filter(Boolean) as CommandItem[]

    const recentItems = recentIds
      .map((id) => {
        // Check nav/action commands
        const navCmd = allCommands.find((c) => c.id === id)
        if (navCmd) return { ...navCmd, section: 'Recent' }
        // Check book commands
        const bookCmd = recentBookCommands.find((c) => c.id === id)
        if (bookCmd) return bookCmd
        return null
      })
      .filter(Boolean) as CommandItem[]

    return recentItems
  }, [query, navigationCommands, books, navigate, close, executeCommand])

  // ─── Filter and combine ─────────────────────────

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // No query: show Recent (if any) + Navigation + Actions
      return [...recentCommands, ...navigationCommands]
    }

    // With query: fuzzy filter navigation/action commands + book results
    const filteredNav = navigationCommands.filter((cmd) => {
      const searchText = `${cmd.label} ${(cmd.keywords || []).join(' ')}`
      return fuzzyMatch(searchText, query)
    }).sort((a, b) => {
      const scoreA = fuzzyScore(a.label, query)
      const scoreB = fuzzyScore(b.label, query)
      return scoreB - scoreA
    })

    return [...bookCommands, ...filteredNav]
  }, [query, navigationCommands, bookCommands, recentCommands])

  // Group by section
  const sections = useMemo(() => {
    return filteredCommands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
      if (!acc[cmd.section]) acc[cmd.section] = []
      acc[cmd.section]!.push(cmd)
      return acc
    }, {})
  }, [filteredCommands])

  // Flatten for index-based navigation
  const flatItems = useMemo(() => Object.values(sections).flat(), [sections])

  // ─── Keyboard navigation ────────────────────────

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % flatItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + flatItems.length) % flatItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        flatItems[selectedIndex]?.action()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, flatItems, close])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  let itemIndex = 0

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={close}
      />

      {/* Dialog */}
      <div className="relative flex justify-center" style={{ paddingTop: '18vh' }}>
        <div className="w-full max-w-lg mx-4 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <span className="text-muted-foreground shrink-0">{icons.search}</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books, commands, or pages..."
              className="flex-1 py-3 bg-transparent text-ui-sm font-body text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-72 overflow-y-auto py-2">
            {flatItems.length === 0 ? (
              <p className="px-4 py-6 text-center text-ui-sm text-muted-foreground font-body">
                No results found.
              </p>
            ) : (
              Object.entries(sections).map(([section, items]) => (
                <div key={section}>
                  <p className="px-4 py-1.5 text-[11px] font-body font-medium text-muted-foreground uppercase tracking-wider">
                    {section}
                  </p>
                  {items.map((cmd) => {
                    const currentIndex = itemIndex++
                    const isSelected = currentIndex === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        data-selected={isSelected}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`
                          flex items-center gap-3 w-full px-4 py-2 text-left
                          text-ui-sm font-body transition-colors
                          ${isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-accent/50'
                          }
                        `}
                      >
                        <span className="text-muted-foreground">{cmd.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{cmd.label}</span>
                          {cmd.subtitle && (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {cmd.subtitle}
                            </span>
                          )}
                        </span>
                        {cmd.id.startsWith('book-') && (
                          <span className="text-[10px] text-muted-foreground shrink-0">Open</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground font-body">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
