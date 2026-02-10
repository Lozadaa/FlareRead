import { useCallback, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Clock,
  Flame,
  Gauge,
  Activity,
  BookText,
  FilePlus,
  Upload,
  RotateCcw
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

  // Re-fetch dashboard data when a book is imported
  useEffect(() => {
    if (refreshTrigger > 0) refresh()
  }, [refreshTrigger, refresh])
  const hasBooks = currentlyReading.length > 0 || recent.length > 0
  const [isDragging, setIsDragging] = useState(false)
  const [rejectedDrop, setRejectedDrop] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const handleImport = useCallback(() => {
    onImportEpub()
    // Refresh after a short delay to catch the new import
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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!hasBooks) {
    return <EmptyState onImport={handleImport} />
  }

  return (
    <div
      ref={dropRef}
      className="flex-1 overflow-y-auto relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-[2px]">
          <div className="text-center">
            <Upload className="h-10 w-10 text-primary mx-auto mb-3" />
            <p className="text-ui-base font-medium text-primary">Drop EPUB files to import</p>
          </div>
        </div>
      )}

      {/* Rejected file type notification */}
      {rejectedDrop && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-500 text-white text-ui-sm font-medium shadow-lg">
          Only .epub files are supported
        </div>
      )}
      <div className="p-6 space-y-8 max-w-[1400px]">
        {/* Greeting */}
        <div>
          <h1 className="text-ui-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-ui-sm text-muted-foreground mt-1">
            Pick up where you left off
          </p>
        </div>

        {/* Metrics Panel */}
        <MetricsPanel
          minutesToday={metrics.minutesToday}
          minutesThisWeek={metrics.minutesThisWeek}
          streak={metrics.streak}
          avgWpm={metrics.avgWpm}
          totalSessions={metrics.totalSessions}
          pagesPerHour={metrics.pagesPerHour}
        />

        {/* Re-entry Cards - Stale books */}
        {!staleBooksLoading && staleBooks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ui-base font-semibold text-foreground">
                Pick Up Again
              </h2>
              {onUpdateInactivityDays && (
                <div className="flex items-center gap-2 text-ui-xs text-muted-foreground">
                  <span>After</span>
                  <select
                    value={inactivityDays}
                    onChange={(e) => onUpdateInactivityDays(Number(e.target.value))}
                    className="bg-card border border-border rounded px-2 py-0.5 text-ui-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        {/* Currently Reading */}
        {currentlyReading.length > 0 && (
          <section>
            <h2 className="text-ui-base font-semibold text-foreground mb-4">
              Currently Reading
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentlyReading.map((book, i) => (
                <CurrentlyReadingCard
                  key={book.id}
                  book={book}
                  index={i}
                  onClick={() => onOpenBook(book)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Goals */}
        <DashboardGoalsCard onNavigateGoals={onNavigateGoals} />

        {/* Recent */}
        {recent.length > 0 && (
          <section>
            <h2 className="text-ui-base font-semibold text-foreground mb-4">
              Recent
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
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

// ─── Metrics Panel ──────────────────────────────────────

interface MetricsPanelProps {
  minutesToday: number
  minutesThisWeek: number
  streak: number
  avgWpm: number
  totalSessions: number
  pagesPerHour: number
}

function MetricsPanel(props: MetricsPanelProps): JSX.Element {
  const items = [
    {
      label: 'Today',
      value: `${props.minutesToday}`,
      unit: 'min',
      icon: Clock,
      color: 'text-blue-500'
    },
    {
      label: 'This Week',
      value: `${props.minutesThisWeek}`,
      unit: 'min',
      icon: Activity,
      color: 'text-emerald-500'
    },
    {
      label: 'Streak',
      value: `${props.streak}`,
      unit: props.streak === 1 ? 'day' : 'days',
      icon: Flame,
      color: 'text-orange-500'
    },
    {
      label: 'Avg Speed',
      value: `${props.avgWpm}`,
      unit: 'wpm',
      icon: Gauge,
      color: 'text-violet-500'
    },
    {
      label: 'Sessions',
      value: `${props.totalSessions}`,
      unit: 'total',
      icon: BookText,
      color: 'text-pink-500'
    },
    {
      label: 'Pace',
      value: `${props.pagesPerHour}`,
      unit: 'pg/hr',
      icon: BookOpen,
      color: 'text-amber-500'
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.04 }}
          className="bg-card border border-border rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <item.icon className={cn('h-4 w-4', item.color)} />
            <span className="text-ui-xs text-muted-foreground">{item.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-ui-xl font-bold text-foreground">{item.value}</span>
            <span className="text-ui-xs text-muted-foreground">{item.unit}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Currently Reading Card ─────────────────────────────

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
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onClick}
      className="group text-left flex gap-4 bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className="w-16 h-24 bg-gradient-to-br from-primary/10 to-primary/20 rounded-md flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
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

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-ui-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {book.title}
          </p>
          {book.author && (
            <p className="text-ui-xs text-muted-foreground truncate">{book.author}</p>
          )}
        </div>

        <div className="space-y-2 mt-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <Progress value={percent} className="h-1.5 flex-1" />
            <span className="text-ui-xs font-medium text-muted-foreground shrink-0">
              {percent}%
            </span>
          </div>

          {/* Time & last session */}
          <div className="flex items-center gap-3 text-ui-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeDisplay}
            </span>
            <span>{lastSession}</span>
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
      transition={{ duration: 0.15, delay: index * 0.04 }}
      onClick={onClick}
      className="group text-left flex-shrink-0 w-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <div className="aspect-[2/3] bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg mb-2 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow relative">
        {book.cover_path ? (
          <img
            src={fileUrl(book.cover_path!)}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="h-7 w-7 text-primary/40" />
        )}
        {/* Progress overlay at bottom */}
        {percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
      <p className="text-ui-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
        {book.title}
      </p>
      {book.author && (
        <p className="text-[10px] text-muted-foreground truncate">{book.author}</p>
      )}
    </motion.button>
  )
}

// ─── Stale Book Card (Re-entry) ─────────────────────────

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

  const lastSession = book.last_session_date
    ? formatRelativeDate(book.last_session_date)
    : 'Never'

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onClick}
      className="group text-left flex gap-4 bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-lg p-4 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className="w-16 h-24 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 rounded-md flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
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

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <RotateCcw className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pick up again
            </span>
          </div>
          <p className="text-ui-sm font-medium text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {book.title}
          </p>
          {book.author && (
            <p className="text-ui-xs text-muted-foreground truncate">{book.author}</p>
          )}
        </div>

        <div className="space-y-2 mt-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <Progress value={percent} className="h-1.5 flex-1" />
            <span className="text-ui-xs font-medium text-muted-foreground shrink-0">
              {percent}%
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-ui-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeDisplay}
            </span>
            <span>{lastSession}</span>
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
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-lg w-full text-center"
      >
        {/* Geometric SVG Illustration */}
        <div className="mb-8 flex justify-center">
          <GeometricBookIllustration />
        </div>

        {/* Text */}
        <h2 className="text-ui-xl font-semibold text-foreground mb-2">
          Welcome to JustRead
        </h2>
        <p className="text-ui-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
          Your personal reading companion. Import an EPUB to start tracking your
          reading progress, sessions, and highlights.
        </p>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 mb-4 transition-all duration-200',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary/40'
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 mx-auto mb-3 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground/50'
            )}
          />
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
          <span className="text-ui-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Import button */}
        <Button onClick={onImport} size="lg" className="gap-2">
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
    <svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
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
    </svg>
  )
}

// ─── Helpers ────────────────────────────────────────────

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
