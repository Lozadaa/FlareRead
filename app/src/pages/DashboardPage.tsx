import { useNavigate } from 'react-router-dom'
import { useDashboard } from '@/hooks/useDashboard'
import type { BookWithProgress, DashboardMetrics, TrackWithProgress } from '@/types'

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
    day: 'numeric',
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

function formatTime(ms: number | null): string {
  if (!ms) return '0m'
  const minutes = Math.round(ms / 60000)
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes}m`
}

// ─── SVG Icons (inline, matching project style) ─────────

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
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

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}

function AcademicCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  )
}

// ─── Main Dashboard Page ────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const { currentlyReading, recent, staleBooks, tracks, metrics, loading } = useDashboard()

  const openBook = (bookId: string) => navigate(`/read/${bookId}`)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasBooks = currentlyReading.length > 0 || recent.length > 0
  if (!hasBooks) return <EmptyState />

  const heroBook = currentlyReading[0]
  const remainingBooks = currentlyReading.slice(1)

  return (
    <div className="flex-1 overflow-y-auto scroll-fade">
      <div className="p-6 space-y-10 max-w-[1400px] animate-fade-in">
        {/* ─── Greeting Section ─────────────────────────── */}
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">
            {getFormattedDate()}
          </p>
          <h1 className="font-display text-3xl italic text-foreground">
            {getGreeting()}
          </h1>
          <p className="text-ui-sm text-muted-foreground mt-1">
            Pick up where you left off
          </p>
        </div>

        {/* ─── Metrics Strip ────────────────────────────── */}
        <MetricsStrip metrics={metrics} />

        {/* ─── Stale Books (Pick Up Again) ──────────────── */}
        {staleBooks.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-foreground mb-4">
              <span className="text-muted-foreground/40 mr-2">&mdash;</span>
              Pick Up Again
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {staleBooks.map((book) => (
                <StaleBookCard
                  key={book.id}
                  book={book}
                  onClick={() => openBook(book.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Currently Reading ────────────────────────── */}
        {currentlyReading.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-foreground mb-5">
              <span className="text-muted-foreground/40 mr-2">&mdash;</span>
              Currently Reading
            </h2>

            {heroBook && (
              <HeroBookCard book={heroBook} onClick={() => openBook(heroBook.id)} />
            )}

            {remainingBooks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
                {remainingBooks.map((book) => (
                  <CompactBookCard
                    key={book.id}
                    book={book}
                    onClick={() => openBook(book.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── Learning Tracks ──────────────────────────── */}
        {tracks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-foreground">
                <span className="text-muted-foreground/40 mr-2">&mdash;</span>
                Learning Tracks
              </h2>
              <button
                onClick={() => navigate('/goals')}
                className="text-ui-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Recent ───────────────────────────────────── */}
        {recent.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-foreground mb-5">
              <span className="text-muted-foreground/40 mr-2">&mdash;</span>
              Recent
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-3">
              {recent.map((book) => (
                <RecentBookCard
                  key={book.id}
                  book={book}
                  onClick={() => openBook(book.id)}
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

const METRIC_ITEMS: {
  key: keyof DashboardMetrics
  label: string
  unit: (v: number) => string
  primary?: boolean
  streak?: boolean
  Icon: (props: { className?: string }) => JSX.Element
}[] = [
  { key: 'minutesToday', label: 'Today', unit: () => 'min', primary: true, Icon: TimerIcon },
  { key: 'minutesThisWeek', label: 'This Week', unit: () => 'min', Icon: ActivityIcon },
  { key: 'streak', label: 'Streak', unit: (v) => (v === 1 ? 'day' : 'days'), streak: true, Icon: FlameIcon },
  { key: 'avgWpm', label: 'Avg Speed', unit: () => 'wpm', Icon: ZapIcon },
  { key: 'totalSessions', label: 'Sessions', unit: () => 'total', Icon: BookOpenIcon },
  { key: 'pagesPerHour', label: 'Pace', unit: () => 'pg/hr', Icon: TrendingUpIcon },
]

function MetricsStrip({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {METRIC_ITEMS.map((item) => {
        const value = metrics[item.key]
        return (
          <div
            key={item.label}
            className={[
              'relative group rounded-xl p-3 border transition-all duration-300',
              'hover:-translate-y-0.5',
              item.primary
                ? 'bg-primary/[0.06] border-primary/20 hover:border-primary/40 hover:shadow-[0_4px_20px_-4px_hsla(var(--primary),0.15)]'
                : 'bg-card border-border hover:border-primary/20 hover:shadow-[0_4px_16px_-4px_hsla(var(--primary),0.08)]',
            ].join(' ')}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={[
                  'w-6 h-6 rounded-md flex items-center justify-center',
                  item.primary
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors',
                ].join(' ')}
              >
                <item.Icon className="h-3 w-3" />
              </div>
              {item.streak && value > 0 && (
                <span className="text-xs" title="Active streak">🔥</span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={[
                  'font-mono font-bold tabular-nums',
                  item.primary ? 'text-ui-xl text-primary' : 'text-ui-lg text-foreground',
                ].join(' ')}
              >
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{item.unit(value)}</span>
            </div>
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5 block">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Hero Book Card ─────────────────────────────────────

function HeroBookCard({
  book,
  onClick,
}: {
  book: BookWithProgress & { coverUrl: string | null }
  onClick: () => void
}) {
  const percent = Math.round(book.percent_complete ?? 0)
  const timeDisplay = formatTime(book.total_time_ms)
  const lastSession = book.last_session_date
    ? formatRelativeDate(book.last_session_date)
    : 'Never'

  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex gap-6 rounded-xl p-5 bg-card border border-border hover:shadow-[0_8px_30px_-6px_hsla(var(--primary),0.12),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className="shrink-0">
        <div className="book-cover w-28 h-40 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center overflow-hidden rounded-md">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpenIcon className="h-8 w-8 text-primary/40" />
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
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="font-mono text-ui-sm font-semibold text-primary shrink-0">
              {percent}%
            </span>
          </div>

          {/* Time & last session */}
          <div className="flex items-center gap-4 text-ui-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ClockIcon className="h-3 w-3" />
              {timeDisplay} read
            </span>
            <span className="italic">{lastSession}</span>
          </div>
        </div>

        {/* Continue reading indicator */}
        <div className="flex items-center gap-1.5 mt-3 text-ui-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span>Continue reading</span>
          <ArrowRightIcon className="h-3 w-3" />
        </div>
      </div>
    </button>
  )
}

// ─── Compact Book Card ──────────────────────────────────

function CompactBookCard({
  book,
  onClick,
}: {
  book: BookWithProgress & { coverUrl: string | null }
  onClick: () => void
}) {
  const percent = Math.round(book.percent_complete ?? 0)
  const timeDisplay = formatTime(book.total_time_ms)
  const lastSession = book.last_session_date
    ? formatRelativeDate(book.last_session_date)
    : 'Never'

  return (
    <button
      onClick={onClick}
      className="group text-left flex gap-4 rounded-xl p-4 bg-card border border-border hover:shadow-[0_6px_24px_-4px_hsla(var(--primary),0.10),0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className="shrink-0">
        <div className="book-cover w-16 h-24 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center overflow-hidden rounded-md">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpenIcon className="h-6 w-6 text-primary/40" />
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
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="font-mono text-ui-sm font-semibold text-primary/80 shrink-0">
              {percent}%
            </span>
          </div>

          <div className="flex items-center gap-3 text-ui-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {timeDisplay}
            </span>
            <span className="italic">{lastSession}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Recent Book Card ───────────────────────────────────

function RecentBookCard({
  book,
  onClick,
}: {
  book: BookWithProgress & { coverUrl: string | null }
  onClick: () => void
}) {
  const percent = Math.round(book.percent_complete ?? 0)

  return (
    <button
      onClick={onClick}
      className="group text-left flex-shrink-0 w-36 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <div className="shrink-0 mb-2.5 relative">
        <div className="book-cover aspect-[2/3] w-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center overflow-hidden relative rounded-md">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpenIcon className="h-7 w-7 text-primary/40" />
          )}
          {/* Progress overlay */}
          {percent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
              <div
                className="h-full bg-gradient-to-r from-primary to-[hsl(var(--gold))] transition-all duration-500"
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
    </button>
  )
}

// ─── Stale Book Card ────────────────────────────────────

function StaleBookCard({
  book,
  onClick,
}: {
  book: BookWithProgress & { coverUrl: string | null }
  onClick: () => void
}) {
  const percent = Math.round(book.percent_complete ?? 0)
  const timeDisplay = formatTime(book.total_time_ms)
  const daysAgo = formatDaysAgo(book.last_session_date)

  return (
    <button
      onClick={onClick}
      className="group text-left flex gap-4 rounded-xl p-4 bg-card border border-border border-l-[3px] border-l-[hsl(var(--gold))]/50 hover:border-l-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/[0.02] hover:shadow-[0_6px_24px_-4px_hsla(var(--gold),0.12),0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className="shrink-0">
        <div className="book-cover w-16 h-24 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 flex items-center justify-center overflow-hidden rounded-md">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpenIcon className="h-6 w-6 text-amber-400/60" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <BookmarkIcon className="h-3 w-3 text-[hsl(var(--gold))]" />
            <span className="text-xs font-medium text-[hsl(var(--gold))] uppercase tracking-wider">
              Pick up again
            </span>
          </div>
          <p className="font-display text-ui-base text-foreground truncate group-hover:text-[hsl(var(--gold))] transition-colors duration-300">
            {book.title}
          </p>
          {book.author && (
            <p className="text-ui-sm italic text-muted-foreground truncate">{book.author}</p>
          )}
        </div>

        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--gold))] rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="font-mono text-ui-sm font-medium text-muted-foreground shrink-0">
              {percent}%
            </span>
          </div>

          <div className="flex items-center gap-3 text-ui-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {timeDisplay}
            </span>
            {daysAgo && <span className="italic">{daysAgo}</span>}
            {book.current_chapter && (
              <span className="truncate">{book.current_chapter}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Track Card ─────────────────────────────────────────

function TrackCard({ track }: { track: TrackWithProgress }) {
  const percent = track.progress.percentComplete
  const totalHours = track.progress.totalHours
  const targetHours = track.target_hours_total

  return (
    <div className="rounded-xl p-4 bg-card border border-border hover:border-primary/20 hover:shadow-[0_4px_16px_-4px_hsla(var(--primary),0.08)] transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: (track.category.color || '#6b7280') + '20' }}
        >
          <AcademicCapIcon
            className="h-4 w-4"
            // Use inline style for dynamic color
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ui-sm font-medium text-foreground truncate">
            {track.category.name}
          </p>
          {targetHours != null && targetHours > 0 && (
            <p className="text-xs text-muted-foreground">
              {totalHours}h / {targetHours}h
            </p>
          )}
        </div>
        <span className="font-mono text-ui-sm font-semibold text-primary shrink-0">
          {percent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden animate-fade-in">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, hsl(var(--gold)) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-lg w-full text-center relative z-10">
        {/* Geometric SVG */}
        <div className="mb-8 flex justify-center">
          <svg
            width="200"
            height="160"
            viewBox="0 0 200 160"
            fill="none"
            className="text-primary"
          >
            <circle cx="100" cy="80" r="70" className="fill-primary/5" />
            <path d="M60 40 L100 50 L100 130 L60 120Z" className="fill-primary/15 stroke-primary/30" strokeWidth="1.5" />
            <path d="M140 40 L100 50 L100 130 L140 120Z" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5" />
            <line x1="70" y1="60" x2="95" y2="65" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
            <line x1="70" y1="70" x2="92" y2="74" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
            <line x1="70" y1="80" x2="88" y2="83" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
            <line x1="70" y1="90" x2="94" y2="94" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
            <line x1="70" y1="100" x2="90" y2="103" className="stroke-primary/20" strokeWidth="2" strokeLinecap="round" />
            <line x1="105" y1="65" x2="130" y2="60" className="stroke-primary/15" strokeWidth="2" strokeLinecap="round" />
            <line x1="105" y1="74" x2="128" y2="70" className="stroke-primary/15" strokeWidth="2" strokeLinecap="round" />
            <line x1="105" y1="83" x2="125" y2="80" className="stroke-primary/15" strokeWidth="2" strokeLinecap="round" />
            <circle cx="45" cy="55" r="3" className="fill-primary/20" />
            <circle cx="155" cy="55" r="3" className="fill-primary/20" />
            <circle cx="40" cy="105" r="2" className="fill-primary/10" />
            <circle cx="160" cy="105" r="2" className="fill-primary/10" />
            <path d="M50 140 Q100 155 150 140" className="stroke-primary/25" strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="42" y="30" width="6" height="6" rx="1" className="fill-primary/15" transform="rotate(15 45 33)" />
            <rect x="150" y="28" width="5" height="5" rx="1" className="fill-primary/10" transform="rotate(-20 152 30)" />
            <polygon points="100,20 103,26 97,26" className="fill-primary/20" />
          </svg>
        </div>

        <h2 className="font-display text-3xl italic text-foreground mb-3">
          Your reading journey begins here
        </h2>
        <p className="text-ui-sm italic text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
          Import your first book and let the pages unfold.
          <br />
          Every great story starts with a single chapter.
        </p>

        <button
          onClick={() => navigate('/library')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-medium text-ui-sm hover:bg-primary/90 transition-colors"
        >
          <BookOpenIcon className="h-4 w-4" />
          Go to Library
        </button>
      </div>
    </div>
  )
}
