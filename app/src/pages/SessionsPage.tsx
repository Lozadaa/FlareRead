import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { sessionsService, booksService } from '@/services'
import type { SessionDoc, BookDoc } from '@/types'
import { Timestamp } from 'firebase/firestore'

// ─── Helpers ────────────────────────────────────────────

function formatActiveTime(ms: number): string {
  if (ms < 60_000) return '<1m'
  const totalMin = Math.round(ms / 60_000)
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${totalMin}m`
}

function formatDate(ts: Timestamp): string {
  const d = ts.toDate()
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(ts: Timestamp): string {
  const d = ts.toDate()
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── SVG Icons ──────────────────────────────────────────

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function HighlightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function ChevronIcon({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      className={`${className} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

// ─── Types ──────────────────────────────────────────────

interface BookGroup {
  book: BookDoc
  sessions: SessionDoc[]
  totalActiveMs: number
  totalHighlights: number
  totalNotes: number
  latestSession: Timestamp
}

// ─── Main Component ─────────────────────────────────────

export function SessionsPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const navigate = useNavigate()

  const [sessions, setSessions] = useState<SessionDoc[]>([])
  const [books, setBooks] = useState<BookDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set())
  const [filterBookId, setFilterBookId] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    if (!uid) return
    let cancelled = false

    async function loadData() {
      try {
        const [allSessions, allBooks] = await Promise.all([
          sessionsService.getAll(uid!),
          booksService.getAll(uid!),
        ])
        if (cancelled) return
        setSessions(allSessions)
        setBooks(allBooks)
        setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [uid])

  // Group sessions by book
  const bookGroups = useMemo(() => {
    const bookMap = new Map(books.map((b) => [b.id, b]))
    const groups = new Map<string, BookGroup>()

    const filteredSessions = filterBookId
      ? sessions.filter((s) => s.bookId === filterBookId)
      : sessions

    for (const session of filteredSessions) {
      if (session.status === 'active') continue // skip in-progress sessions

      const book = bookMap.get(session.bookId)
      if (!book) continue

      if (!groups.has(session.bookId)) {
        groups.set(session.bookId, {
          book,
          sessions: [],
          totalActiveMs: 0,
          totalHighlights: 0,
          totalNotes: 0,
          latestSession: session.startTime,
        })
      }

      const group = groups.get(session.bookId)!
      group.sessions.push(session)
      group.totalActiveMs += session.activeMs
      group.totalHighlights += session.highlightsDuring
      group.totalNotes += session.notesDuring

      if (session.startTime.toMillis() > group.latestSession.toMillis()) {
        group.latestSession = session.startTime
      }
    }

    // Sort by most recent session first
    return Array.from(groups.values()).sort(
      (a, b) => b.latestSession.toMillis() - a.latestSession.toMillis()
    )
  }, [sessions, books, filterBookId])

  // Books that have sessions (for filter dropdown)
  const booksWithSessions = useMemo(() => {
    const bookIds = new Set(sessions.map((s) => s.bookId))
    return books.filter((b) => bookIds.has(b.id))
  }, [sessions, books])

  // Totals
  const totals = useMemo(() => {
    const completedSessions = sessions.filter((s) => s.status !== 'active')
    return {
      sessions: completedSessions.length,
      totalMs: completedSessions.reduce((sum, s) => sum + s.activeMs, 0),
      totalHighlights: completedSessions.reduce((sum, s) => sum + s.highlightsDuring, 0),
      totalNotes: completedSessions.reduce((sum, s) => sum + s.notesDuring, 0),
    }
  }, [sessions])

  const toggleBook = (bookId: string) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev)
      if (next.has(bookId)) next.delete(bookId)
      else next.add(bookId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
            Sessions
          </h2>
          <p className="text-ui-sm text-muted-foreground font-body">
            {totals.sessions === 0
              ? 'Start a reading session to track your progress.'
              : `${totals.sessions} session${totals.sessions !== 1 ? 's' : ''} across ${booksWithSessions.length} book${booksWithSessions.length !== 1 ? 's' : ''} \u00B7 ${formatActiveTime(totals.totalMs)} total`
            }
          </p>
        </div>
      </div>

      {totals.sessions === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-16 h-16 text-muted-foreground/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <h3 className="text-ui-base font-body font-medium text-foreground mb-1">No sessions yet</h3>
          <p className="text-ui-sm font-body text-muted-foreground max-w-sm">
            Open a book and start a reading session to track your time, highlights, and notes.
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
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl p-3 bg-primary/[0.06] border border-primary/20">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/15 text-primary">
                  <ClockIcon className="h-3 w-3" />
                </div>
              </div>
              <span className="font-mono text-ui-lg font-bold tabular-nums text-primary">
                {formatActiveTime(totals.totalMs)}
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5 block">
                Total Time
              </span>
            </div>
            <div className="rounded-xl p-3 bg-card border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                  <BookOpenIcon className="h-3 w-3" />
                </div>
              </div>
              <span className="font-mono text-ui-lg font-bold tabular-nums text-foreground">
                {totals.sessions}
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5 block">
                Sessions
              </span>
            </div>
            <div className="rounded-xl p-3 bg-card border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                  <HighlightIcon className="h-3 w-3" />
                </div>
              </div>
              <span className="font-mono text-ui-lg font-bold tabular-nums text-foreground">
                {totals.totalHighlights}
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5 block">
                Highlights
              </span>
            </div>
            <div className="rounded-xl p-3 bg-card border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                  <NoteIcon className="h-3 w-3" />
                </div>
              </div>
              <span className="font-mono text-ui-lg font-bold tabular-nums text-foreground">
                {totals.totalNotes}
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5 block">
                Notes
              </span>
            </div>
          </div>

          {/* Filter */}
          {booksWithSessions.length > 1 && (
            <div className="mb-4">
              <select
                value={filterBookId || ''}
                onChange={(e) => setFilterBookId(e.target.value || null)}
                className="px-3 py-2 text-ui-sm font-body bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All books</option>
                {booksWithSessions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Book groups */}
          <div className="space-y-3">
            {bookGroups.map((group) => {
              const isExpanded = expandedBooks.has(group.book.id)

              return (
                <div
                  key={group.book.id}
                  className="bg-card border border-border rounded-xl overflow-hidden transition-colors"
                >
                  {/* Book header */}
                  <button
                    onClick={() => toggleBook(group.book.id)}
                    className="w-full text-left flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-ui-base text-foreground truncate">
                          {group.book.title}
                        </h3>
                        <span className="shrink-0 px-2 py-0.5 text-[11px] font-mono font-medium bg-primary/10 text-primary rounded-full">
                          {group.sessions.length}
                        </span>
                      </div>
                      {group.book.author && (
                        <p className="text-ui-sm italic text-muted-foreground truncate mt-0.5">
                          {group.book.author}
                        </p>
                      )}
                    </div>

                    {/* Summary stats */}
                    <div className="hidden sm:flex items-center gap-4 text-ui-sm text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {formatActiveTime(group.totalActiveMs)}
                      </span>
                      {group.totalHighlights > 0 && (
                        <span className="flex items-center gap-1.5">
                          <HighlightIcon className="h-3.5 w-3.5" />
                          {group.totalHighlights}
                        </span>
                      )}
                      {group.totalNotes > 0 && (
                        <span className="flex items-center gap-1.5">
                          <NoteIcon className="h-3.5 w-3.5" />
                          {group.totalNotes}
                        </span>
                      )}
                    </div>

                    <ChevronIcon className="w-4 h-4 text-muted-foreground shrink-0" open={isExpanded} />
                  </button>

                  {/* Sessions list */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {group.sessions.map((session, idx) => (
                        <div
                          key={session.id}
                          className={`flex items-center gap-4 px-4 py-3 ${
                            idx !== group.sessions.length - 1 ? 'border-b border-border/50' : ''
                          }`}
                        >
                          {/* Date & time */}
                          <div className="w-32 sm:w-40 shrink-0">
                            <p className="text-ui-sm font-body text-foreground">
                              {formatDate(session.startTime)}
                            </p>
                            <p className="text-ui-xs font-body text-muted-foreground">
                              {formatTime(session.startTime)}
                              {session.endTime && ` - ${formatTime(session.endTime)}`}
                            </p>
                          </div>

                          {/* Active time */}
                          <div className="flex items-center gap-1.5 min-w-[70px]">
                            <ClockIcon className="h-3.5 w-3.5 text-primary" />
                            <span className="font-mono text-ui-sm font-medium text-foreground tabular-nums">
                              {formatActiveTime(session.activeMs)}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-3 text-ui-xs text-muted-foreground">
                            {session.highlightsDuring > 0 && (
                              <span className="flex items-center gap-1" title="Highlights">
                                <HighlightIcon className="h-3 w-3" />
                                {session.highlightsDuring}
                              </span>
                            )}
                            {session.notesDuring > 0 && (
                              <span className="flex items-center gap-1" title="Notes">
                                <NoteIcon className="h-3 w-3" />
                                {session.notesDuring}
                              </span>
                            )}
                            {session.pomodoroEnabled && session.completedPomodoros > 0 && (
                              <span className="flex items-center gap-1" title="Pomodoros completed">
                                <span className="text-[11px]">P</span>
                                {session.completedPomodoros}
                              </span>
                            )}
                          </div>

                          {/* Status badge */}
                          <div className="ml-auto">
                            {session.status === 'completed' ? (
                              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                                Completed
                              </span>
                            ) : session.status === 'abandoned' ? (
                              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground rounded-full">
                                Abandoned
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
