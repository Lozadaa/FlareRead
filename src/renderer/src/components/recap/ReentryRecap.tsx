import { useState, useEffect } from 'react'
import { fileUrl } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Clock,
  Highlighter,
  StickyNote,
  ArrowRight,
  BookText,
  BarChart3,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Book, RecapData } from '@/types'

interface ReentryRecapProps {
  book: Book
  getRecapData: (bookId: string) => Promise<RecapData | null>
  onContinue: () => void
  onDismiss: () => void
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ReentryRecap({
  book,
  getRecapData,
  onContinue,
  onDismiss
}: ReentryRecapProps) {
  const [data, setData] = useState<RecapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecapData(book.id).then((result) => {
      setData(result)
      setLoading(false)
    })
  }, [book.id, getRecapData])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    // No recap data found, just continue
    onContinue()
    return null
  }

  const percent = Math.round(data.progress?.percent_complete ?? 0)
  const chapter = data.progress?.current_chapter ?? 'Unknown chapter'
  const lastRead = data.stats.last_session_date
    ? formatRelativeDate(data.stats.last_session_date)
    : 'Unknown'

  return (
    <div className="h-screen flex flex-col bg-background overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              {/* Book cover */}
              <div className="w-20 h-28 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center overflow-hidden shadow-md shrink-0">
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
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Welcome back
                </p>
                <h1 className="text-xl font-bold text-foreground mb-1">
                  {book.title}
                </h1>
                {book.author && (
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Last read {lastRead}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Skip recap"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <Progress value={percent} className="h-2 flex-1" />
            <span className="text-sm font-semibold text-foreground shrink-0">
              {percent}%
            </span>
          </div>
        </motion.div>

        {/* Where you left off */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <BookText className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Where you left off</span>
          </div>
          <p className="text-sm font-medium text-foreground">{chapter}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <StatCard
            icon={Clock}
            label="Total Time"
            value={formatDuration(data.stats.total_time_ms)}
            color="text-blue-500"
            bg="bg-blue-50 dark:bg-blue-950/30"
          />
          <StatCard
            icon={BarChart3}
            label="Sessions"
            value={String(data.stats.total_sessions)}
            color="text-emerald-500"
            bg="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <StatCard
            icon={BookOpen}
            label="Progress"
            value={`${percent}%`}
            color="text-violet-500"
            bg="bg-violet-50 dark:bg-violet-950/30"
          />
        </motion.div>

        {/* Highlights */}
        {data.highlights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Highlighter className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-medium text-foreground">Recent Highlights</h3>
            </div>
            <div className="space-y-2">
              {data.highlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="p-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: highlight.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">
                        {highlight.text}
                      </p>
                      {highlight.chapter && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {highlight.chapter}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Notes */}
        {data.notes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-medium text-foreground">Recent Notes</h3>
            </div>
            <div className="space-y-2">
              {data.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border border-border bg-card"
                >
                  <p className="text-sm text-foreground line-clamp-2">
                    {note.content}
                  </p>
                  {note.highlight_text && (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                      on: &quot;{note.highlight_text}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="flex gap-3"
        >
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1"
          >
            Skip Recap
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1 gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Continue Reading
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg
}: {
  icon: typeof Clock
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className={`p-4 rounded-lg ${bg} text-center`}>
      <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
