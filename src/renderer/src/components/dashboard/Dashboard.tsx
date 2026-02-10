import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Clock,
  Bookmark,
  FilePlus,
  Upload,
  Flame,
  Timer,
  Activity,
  Zap,
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { BookWithProgress, Book, StaleBook } from '@/types'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn, fileUrl } from '@/lib/utils'
import { DashboardGoalsCard } from './DashboardGoalsCard'

interface DashboardProps {
  onOpenBook: (book: Book) => void
  onImportEpub: () => void
  onImportFile?: (filePath: string) => Promise<unknown>
  staleBooks?: StaleBook[]
  staleBooksLoading?: boolean
  inactivityDays?: number
  onUpdateInactivityDays?: (days: number) => void
  onNavigateGoals?: () => void
  refreshTrigger?: number
}

// ─── Helpers ────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDaysAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

// ─── Main Dashboard ─────────────────────────────────────

export function Dashboard({
  onOpenBook,
  onImportEpub,
  onImportFile,
  staleBooks = [],
  staleBooksLoading = false,
  inactivityDays = 3,
  onUpdateInactivityDays,
  onNavigateGoals,
  refreshTrigger = 0
}: DashboardProps): JSX.Element {
  const { currentlyReading, recent, metrics, loading, refresh } = useDashboard()

  useEffect(() => {
    if (refreshTrigger > 0) refresh()
  }, [refreshTrigger, refresh])

  const hasBooks = currentlyReading.length > 0 || recent.length > 0
  const [isDragging, setIsDragging] = useState(false)
  const [rejectedDrop, setRejectedDrop] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const handleImport = useCallback(() => {
    onImportEpub()
    setTimeout(refresh, 500)
  }, [onImportEpub, refresh])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const epubFiles = files.filter((f) => f.name.toLowerCase().endsWith('.epub'))

      if (files.length > 0 && epubFiles.length === 0) {
        setRejectedDrop(true)
        setTimeout(() => setRejectedDrop(false), 3000)
        return
      }

      for (const file of epubFiles) {
        const filePath = (file as unknown as { path: string }).path
        if (filePath && onImportFile) {
          await onImportFile(filePath)
        }
      }
      setTimeout(refresh, 500)
    },
    [onImportFile, refresh]
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!hasBooks) {
    return <EmptyState onImport={handleImport} />
  }

  const heroBook = currentlyReading[0]
  const remainingBooks = currentlyReading.slice(1)

  return (
    <div
      ref={dropRef}
      className="flex-1 overflow-y-auto relative scroll-fade"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Premium drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsla(var(--gold), 0.08) 0%, hsla(var(--primary), 0.06) 100%)',
              backdropFilter: 'blur(8px) saturate(1.4)'
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl glass border border-gold/30 flex items-center justify-center mx-auto mb-4"
              >
                <Upload className="h-7 w-7 text-gold" />
              </motion.div>
              <p className="font-display text-xl italic text-foreground">Drop EPUB files to import</p>
              <p className="text-ui-xs text-muted-foreground mt-1">Your next adventure awaits</p>
            </motion.div>
            {/* Animated border */}
            <div className="absolute inset-3 rounded-xl border-2 border-dashed border-gold/40 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejected file type notification */}
      <AnimatePresence>
        {rejectedDrop && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg bg-red-500/95 text-white text-ui-sm font-medium shadow-lg backdrop-blur-sm"
          >
            Only .epub files are supported
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 space-y-10 max-w-[1400px]">
        {/* ─── Greeting Section ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">
            {getFormattedDate()}
          </p>
          <h1 className="font-display text-3xl italic text-foreground">
            {getGreeting()}
          </h1>
          <p className="text-ui-sm text-muted-foreground mt-1">
            Pick up where you left off
          </p>
        </motion.div>

        {/* ─── Metrics Strip ───────────────────────────── */}
        <MetricsStrip
          minutesToday={metrics.minutesToday}
          minutesThisWeek={metrics.minutesThisWeek}
          streak={metrics.streak}
          avgWpm={metrics.avgWpm}
          totalSessions={metrics.totalSessions}
          pagesPerHour={metrics.pagesPerHour}
        />

        {/* ─── Stale Books (Pick Up Again) ─────────────── */}
        {!staleBooksLoading && staleBooks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-foreground">
                <span className="text-muted-foreground/40 mr-2">&mdash;</span>
                Pick Up Again
              </h2>
              {onUpdateInactivityDays && (
                <div className="flex items-center gap-2 text-ui-sm text-muted-foreground">
                  <span>After</span>
                  <select
                    value={inactivityDays}
                    onChange={(e) => onUpdateInactivityDays(Number(e.target.value))}
                    className="bg-card border border-border rounded-md px-2 py-0.5 text-ui-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors hover:border-primary/30"
                  >
                    {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <span>days</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {staleBooks.map((book, i) => (
                <StaleBookCard
                  key={book.id}
                  book={book}
                  index={i}
                  onClick={() => onOpenBook(book)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Currently Reading ───────────────────────── */}
        {currentlyReading.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-foreground mb-5">
              <span className="text-muted-foreground/40 mr-2">&mdash;</span>
              Currently Reading
            </h2>

            {/* Hero card for primary book */}
            {heroBook && (
              <HeroBookCard book={heroBook} onClick={() => onOpenBook(heroBook)} />
            )}

            {/* Remaining books in compact grid */}
            {remainingBooks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
                {remainingBooks.map((book, i) => (
                  <CurrentlyReadingCard
                    key={book.id}
                    book={book}
                    index={i}
                    onClick={() => onOpenBook(book)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── Goals ───────────────────────────────────── */}
        <DashboardGoalsCard onNavigateGoals={onNavigateGoals} />

        {/* ─── Recent ──────────────────────────────────── */}
        {recent.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-foreground mb-5">
              <span className="text-muted-foreground/40 mr-2">&mdash;</span>
              Recent
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-thin">
              {recent.map((book, i) => (
                <RecentBookCard
                  key={book.id}
                  book={book}
                  index={i}
                  onClick={() => onOpenBook(book)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ─── Metrics Strip ──────────────────────────────────────

interface MetricsStripProps {
  minutesToday: number
  minutesThisWeek: number
  streak: number
  avgWpm: number
  totalSessions: number
  pagesPerHour: number
}

const METRIC_ICONS = [Timer, Activity, Flame, Zap, BookOpen, TrendingUp]

function MetricsStrip(props: MetricsStripProps): JSX.Element {
  const items = useMemo(
    () => [
      { label: 'Today', value: `${props.minutesToday}`, unit: 'min', primary: true },
      { label: 'This Week', value: `${props.minutesThisWeek}`, unit: 'min' },
      { label: 'Streak', value: `${props.streak}`, unit: props.streak === 1 ? 'day' : 'days', streak: true },
      { label: 'Avg Speed', value: `${props.avgWpm}`, unit: 'wpm' },
      { label: 'Sessions', value: `${props.totalSessions}`, unit: 'total' },
      { label: 'Pace', value: `${props.pagesPerHour}`, unit: 'pg/hr' }
    ],
    [props.minutesToday, props.minutesThisWeek, props.streak, props.avgWpm, props.totalSessions, props.pagesPerHour]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="grid grid-cols-3 md:grid-cols-6 gap-3"
    >
      {items.map((item, i) => {
        const Icon = METRIC_ICONS[i]
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
            className={cn(
              'relative group rounded-xl p-3 border transition-all duration-300',
              'hover:-translate-y-0.5',
              item.primary
                ? 'bg-primary/[0.06] border-primary/20 hover:border-primary/40 hover:shadow-[0_4px_20px_-4px_hsla(var(--primary),0.15)]'
                : 'bg-card border-border hover:border-primary/20 hover:shadow-[0_4px_16px_-4px_hsla(var(--primary),0.08)]'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center',
                item.primary
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors'
              )}>
                <Icon className="h-3 w-3" />
              </div>
              {item.streak && props.streak > 0 && (
                <span className="text-xs" title="Active streak">🔥</span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  'font-mono font-bold tabular-nums',
                  item.primary ? 'text-ui-xl text-primary' : 'text-ui-lg text-foreground'
                )}
              >
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground">{item.unit}</span>
            </div>
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5 block">
              {item.label}
            </span>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ─── Hero Book Card ─────────────────────────────────────

interface HeroBookCardProps {
  book: BookWithProgress
  onClick: () => void
}

function HeroBookCard({ book, onClick }: HeroBookCardProps): JSX.Element {
  const percent = Math.round(book.percent_complete ?? 0)
  const timeMs = book.total_time_ms ?? 0
  const timeMinutes = Math.round(timeMs / 60000)
  const timeDisplay =
    timeMinutes >= 60
      ? `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`
      : `${timeMinutes}m`

  const lastSession = book.last_session_date
    ? formatRelativeDate(book.last_session_date)
    : 'Never'

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      onClick={onClick}
      className={cn(
        'group w-full text-left flex gap-6 rounded-xl p-5',
        'bg-card border border-border',
        'hover:shadow-[0_8px_30px_-6px_hsla(var(--primary),0.12),0_4px_12px_-4px_rgba(0,0,0,0.06)]',
        'hover:-translate-y-0.5 transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {/* Cover with 3D effect */}
      <div className="shrink-0">
        <div className="book-cover w-28 h-40 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center overflow-hidden">
          {book.cover_path ? (
            <img
              src={fileUrl(book.cover_path!)}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="h-8 w-8 text-primary/40" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {book.title}
          </h3>
          {book.author && (
            <p className="text-ui-sm italic text-muted-foreground mt-0.5">{book.author}</p>
          )}
        </div>

        <div className="space-y-3 mt-3">
          {/* Progress bar with gradient */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Progress value={percent} className="h-1.5" />
            </div>
            <span className="font-mono text-ui-sm font-semibold text-primary shrink-0">
              {percent}%
            </span>
          </div>

          {/* Time & last session */}
          <div className="flex items-center gap-4 text-ui-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {timeDisplay} read
            </span>
            <span className="italic">{lastSession}</span>
          </div>
        </div>

        {/* Continue reading indicator */}
        <div className="flex items-center gap-1.5 mt-3 text-ui-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span>Continue reading</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </motion.button>
  )
}

// ─── Currently Reading Card (compact) ───────────────────

interface CurrentlyReadingCardProps {
  book: BookWithProgress
  index: number
  onClick: () => void
}

function CurrentlyReadingCard({ book, index, onClick }: CurrentlyReadingCardProps): JSX.Element {
  const percent = Math.round(book.percent_complete ?? 0)
  const timeMs = book.total_time_ms ?? 0
  const timeMinutes = Math.round(timeMs / 60000)
  const timeDisplay =
    timeMinutes >= 60
      ? `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`
      : `${timeMinutes}m`

  const lastSession = book.last_session_date
    ? formatRelativeDate(book.last_session_date)
    : 'Never'

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      onClick={onClick}
      className={cn(
        'group text-left flex gap-4 rounded-xl p-4',
        'bg-card border border-border',
        'hover:shadow-[0_6px_24px_-4px_hsla(var(--primary),0.10),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
        'hover:-translate-y-0.5 hover:border-primary/20',
        'transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {/* Cover */}
      <div className="shrink-0">
        <div className="book-cover w-16 h-24 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center overflow-hidden">
          {book.cover_path ? (
            <img
              src={fileUrl(book.cover_path!)}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="h-6 w-6 text-primary/40" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="font-display text-ui-base text-foreground truncate group-hover:text-primary transition-colors duration-300">
            {book.title}
          </p>
          {book.author && (
            <p className="text-ui-sm italic text-muted-foreground truncate">{book.author}</p>
          )}
        </div>

        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Progress value={percent} className="h-1 flex-1" />
            <span className="font-mono text-ui-sm font-semibold text-primary/80 shrink-0">
              {percent}%
            </span>
          </div>

          <div className="flex items-center gap-3 text-ui-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeDisplay}
            </span>
            <span className="italic">{lastSession}</span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Recent Book Card ───────────────────────────────────

interface RecentBookCardProps {
  book: BookWithProgress
  index: number
  onClick: () => void
}

function RecentBookCard({ book, index, onClick }: RecentBookCardProps): JSX.Element {
  const percent = Math.round(book.percent_complete ?? 0)

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onClick}
      className="group text-left flex-shrink-0 w-36 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <div className="shrink-0 mb-2.5 relative">
        <div className="book-cover aspect-[2/3] w-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center overflow-hidden relative">
          {book.cover_path ? (
            <img
              src={fileUrl(book.cover_path!)}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="h-7 w-7 text-primary/40" />
          )}
          {/* Progress overlay with gradient */}
          {percent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
              <div
                className="h-full bg-gradient-to-r from-primary to-gold transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
            <span className="text-xs font-mono font-medium text-white/90">{percent}%</span>
          </div>
        </div>
      </div>
      <p className="font-display text-ui-sm text-foreground truncate group-hover:text-primary transition-colors duration-300">
        {book.title}
      </p>
      {book.author && (
        <p className="text-xs italic text-muted-foreground truncate">{book.author}</p>
      )}
    </motion.button>
  )
}

// ─── Stale Book Card (Pick Up Again) ────────────────────

interface StaleBookCardProps {
  book: StaleBook
  index: number
  onClick: () => void
}

function StaleBookCard({ book, index, onClick }: StaleBookCardProps): JSX.Element {
  const percent = Math.round(book.percent_complete ?? 0)
  const timeMs = book.total_time_ms ?? 0
  const timeMinutes = Math.round(timeMs / 60000)
  const timeDisplay =
    timeMinutes >= 60
      ? `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`
      : `${timeMinutes}m`

  const daysAgo = formatDaysAgo(book.last_session_date)

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      onClick={onClick}
      className={cn(
        'group text-left flex gap-4 rounded-xl p-4',
        'bg-card border border-border',
        'border-l-[3px] border-l-gold/50',
        'hover:border-l-gold hover:bg-gold/[0.02]',
        'hover:shadow-[0_6px_24px_-4px_hsla(var(--gold),0.12),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
        'hover:-translate-y-0.5 transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {/* Cover */}
      <div className="shrink-0">
        <div className="book-cover w-16 h-24 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 flex items-center justify-center overflow-hidden">
          {book.cover_path ? (
            <img
              src={fileUrl(book.cover_path!)}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="h-6 w-6 text-amber-400/60" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="relative">
              <Bookmark className="h-3 w-3 text-gold" />
              <div className="absolute inset-0 animate-ping opacity-20">
                <Bookmark className="h-3 w-3 text-gold" />
              </div>
            </div>
            <span className="text-xs font-medium text-gold uppercase tracking-wider">
              Pick up again
            </span>
          </div>
          <p className="font-display text-ui-base text-foreground truncate group-hover:text-gold transition-colors duration-300">
            {book.title}
          </p>
          {book.author && (
            <p className="text-ui-sm italic text-muted-foreground truncate">{book.author}</p>
          )}
        </div>

        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Progress value={percent} className="h-1 flex-1" />
            <span className="font-mono text-ui-sm font-medium text-muted-foreground shrink-0">
              {percent}%
            </span>
          </div>

          <div className="flex items-center gap-3 text-ui-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeDisplay}
            </span>
            {daysAgo && <span className="italic">{daysAgo}</span>}
            {book.current_chapter && (
              <span className="truncate">{book.current_chapter}</span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Empty State ────────────────────────────────────────

interface EmptyStateProps {
  onImport: () => void
}

function EmptyState({ onImport }: EmptyStateProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const [rejectedDrop, setRejectedDrop] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const epubFile = files.find((f) => f.name.toLowerCase().endsWith('.epub'))
      if (epubFile) {
        const filePath = (epubFile as unknown as { path: string }).path
        if (filePath) {
          await window.appApi.importEpub(filePath)
          onImport()
        }
      } else if (files.length > 0) {
        setRejectedDrop(true)
        setTimeout(() => setRejectedDrop(false), 3000)
      }
    },
    [onImport]
  )

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, hsl(var(--gold)) 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="max-w-lg w-full text-center relative z-10"
      >
        {/* Geometric SVG Illustration */}
        <div className="mb-8 flex justify-center">
          <GeometricBookIllustration />
        </div>

        {/* Text */}
        <h2 className="font-display text-3xl italic text-foreground mb-3">
          Your reading journey begins here
        </h2>
        <p className="text-ui-sm italic text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
          Import your first book and let the pages unfold.
          <br />
          Every great story starts with a single chapter.
        </p>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 mb-4 transition-all duration-300 overflow-hidden',
            isDragging
              ? 'border-gold bg-gold/5 scale-[1.02] shadow-[0_0_24px_-4px_hsla(var(--gold),0.15)]'
              : 'border-gold/30 hover:border-gold/50 hover:bg-gold/[0.02]'
          )}
        >
          <motion.div
            animate={isDragging ? { y: [0, -4, 0] } : {}}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Upload
              className={cn(
                'h-8 w-8 mx-auto mb-3 transition-all duration-300',
                isDragging ? 'text-gold scale-110' : 'text-muted-foreground/40'
              )}
            />
          </motion.div>
          <p className="text-ui-sm text-muted-foreground">
            {isDragging ? 'Drop your EPUB here' : 'Drag & drop an EPUB file here'}
          </p>
          {rejectedDrop && (
            <p className="text-ui-xs text-red-500 font-medium mt-2">
              Only .epub files are supported
            </p>
          )}
        </div>

        {/* Or divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-ui-xs text-muted-foreground italic">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Import button */}
        <Button onClick={onImport} size="lg" className="gap-2 import-btn">
          <FilePlus className="h-4 w-4" />
          Import EPUB
        </Button>
      </motion.div>
    </div>
  )
}

// ─── Geometric Book SVG ─────────────────────────────────

function GeometricBookIllustration(): JSX.Element {
  return (
    <motion.svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* Background circle */}
      <circle cx="100" cy="80" r="70" className="fill-primary/5" />

      {/* Book spine (left page) */}
      <path
        d="M60 40 L100 50 L100 130 L60 120Z"
        className="fill-primary/15 stroke-primary/30"
        strokeWidth="1.5"
      />
      {/* Book spine (right page) */}
      <path
        d="M140 40 L100 50 L100 130 L140 120Z"
        className="fill-primary/10 stroke-primary/30"
        strokeWidth="1.5"
      />

      {/* Text lines on left page */}
      <line x1="70" y1="60" x2="95" y2="65" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="70" x2="92" y2="74" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="80" x2="88" y2="83" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="90" x2="94" y2="94" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="100" x2="90" y2="103" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />

      {/* Text lines on right page */}
      <line x1="105" y1="65" x2="130" y2="60" className="stroke-primary/15" strokeWidth="2" strokeLinecap="round" />
      <line x1="105" y1="74" x2="128" y2="70" className="stroke-primary/15" strokeWidth="2" strokeLinecap="round" />
      <line x1="105" y1="83" x2="125" y2="80" className="stroke-primary/15" strokeWidth="2" strokeLinecap="round" />

      {/* Decorative dots */}
      <circle cx="45" cy="55" r="3" className="fill-primary/20" />
      <circle cx="155" cy="55" r="3" className="fill-primary/20" />
      <circle cx="40" cy="105" r="2" className="fill-primary/10" />
      <circle cx="160" cy="105" r="2" className="fill-primary/10" />

      {/* Progress arc */}
      <path
        d="M50 140 Q100 155 150 140"
        className="stroke-primary/25"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Small floating geometric shapes */}
      <rect x="42" y="30" width="6" height="6" rx="1" className="fill-primary/15" transform="rotate(15 45 33)" />
      <rect x="150" y="28" width="5" height="5" rx="1" className="fill-primary/10" transform="rotate(-20 152 30)" />
      <polygon points="100,20 103,26 97,26" className="fill-primary/20" />
    </motion.svg>
  )
}
