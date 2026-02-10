import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Timer, Highlighter, StickyNote, BookOpen } from 'lucide-react'

interface SessionRecord {
  id: string
  book_id: string
  start_time: string
  end_time: string | null
  active_ms: number
  pages_viewed: number
  words_read_estimate: number
  session_type: string
  status: string
  pomodoro_enabled: number
  pomodoro_work_min: number
  pomodoro_break_min: number
  completed_pomodoros: number
  highlights_during: number
  notes_during: number
  book_title?: string
  book_author?: string
}

interface SessionsViewProps {
  onOpenBook?: (bookId: string) => void
}

function formatDuration(ms: number): string {
  if (!ms) return '0min'
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}min`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function SessionsView({ onOpenBook }: SessionsViewProps): JSX.Element {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      // Get all books, then get sessions for each
      const books = (await window.api.books.getAll()) as Array<{
        id: string
        title: string
        author: string | null
      }>
      const allSessions: SessionRecord[] = []

      for (const book of books) {
        const bookSessions = (await window.api.sessions.getByBook(
          book.id
        )) as SessionRecord[]
        for (const s of bookSessions) {
          allSessions.push({ ...s, book_title: book.title, book_author: book.author ?? undefined })
        }
      }

      // Sort by most recent first
      allSessions.sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      )
      setSessions(allSessions)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, hsla(var(--primary), 0.06) 0%, hsla(var(--gold), 0.04) 100%)' }}
        >
          <Clock className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="font-display text-ui-lg italic text-foreground mb-2">No Sessions Yet</p>
        <p className="text-ui-sm text-muted-foreground max-w-sm">
          Start a focus session while reading to track your study time, highlights, and notes.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-fade">
      <div className="p-6 space-y-6 max-w-[900px]">
        {/* Header */}
        <div>
          <h1 className="font-display text-ui-xl italic text-foreground">Sessions</h1>
          <p className="text-ui-sm text-muted-foreground mt-1">
            Your reading session history
          </p>
        </div>

        {/* Session cards */}
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 hover:shadow-[0_8px_30px_-6px_hsla(var(--primary),0.08)] hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {session.book_title && (
                      <button
                        onClick={() => onOpenBook?.(session.book_id)}
                        className="text-ui-sm font-medium text-foreground hover:text-primary transition-colors duration-200 truncate"
                      >
                        {session.book_title}
                      </button>
                    )}
                    {session.session_type === 'study' && (
                      <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-md bg-primary/[0.06] text-primary border border-primary/15">
                        Focus
                      </span>
                    )}
                    <span className="shrink-0 text-ui-xs text-muted-foreground font-mono">
                      {formatDate(session.start_time)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-ui-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3 h-3 text-primary/60" />
                      {formatDuration(session.active_ms)}
                    </span>

                    {session.pomodoro_enabled ? (
                      <span className="flex items-center gap-1 font-mono tabular-nums">
                        <Timer className="w-3 h-3 text-gold/60" />
                        {session.completed_pomodoros || 0} pomodoro{(session.completed_pomodoros || 0) !== 1 ? 's' : ''}
                      </span>
                    ) : null}

                    {(session.highlights_during || 0) > 0 && (
                      <span className="flex items-center gap-1 font-mono tabular-nums">
                        <Highlighter className="w-3 h-3 text-gold/60" />
                        {session.highlights_during}
                      </span>
                    )}

                    {(session.notes_during || 0) > 0 && (
                      <span className="flex items-center gap-1 font-mono tabular-nums">
                        <StickyNote className="w-3 h-3 text-gold/60" />
                        {session.notes_during}
                      </span>
                    )}
                  </div>
                </div>

                {onOpenBook && (
                  <button
                    onClick={() => onOpenBook(session.book_id)}
                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/[0.04] opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Open book"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
