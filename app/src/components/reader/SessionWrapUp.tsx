import type { SessionStats } from '@/hooks/useStudySession'

interface SessionWrapUpProps {
  stats: SessionStats
  bookTitle: string
  onClose: () => void
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return '<1 min'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

export function SessionWrapUp({ stats, bookTitle, onClose }: SessionWrapUpProps) {
  const metrics = [
    {
      label: 'Active reading',
      value: formatDuration(stats.activeMs),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'Highlights',
      value: String(stats.highlightsDuring),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      ),
    },
    {
      label: 'Notes',
      value: String(stats.notesDuring),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
  ]

  // Add pomodoro stats if applicable
  if (stats.completedPomodoros > 0) {
    metrics.push({
      label: 'Pomodoros',
      value: String(stats.completedPomodoros),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      ),
    })
  }

  // Add break/AFK time if present
  if (stats.totalBreakMs > 0) {
    metrics.push({
      label: 'Break time',
      value: formatDuration(stats.totalBreakMs),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
        </svg>
      ),
    })
  }

  if (stats.totalAfkMs > 60000) {
    metrics.push({
      label: 'AFK time',
      value: formatDuration(stats.totalAfkMs),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            Session Complete
          </h2>
          <p className="text-ui-sm font-body text-muted-foreground mt-1 truncate">
            {bookTitle}
          </p>
        </div>

        {/* Metrics grid */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50"
              >
                <div className="text-muted-foreground shrink-0">{m.icon}</div>
                <div className="min-w-0">
                  <p className="text-ui-base font-body font-semibold text-foreground leading-tight">
                    {m.value}
                  </p>
                  <p className="text-ui-xs font-body text-muted-foreground truncate">
                    {m.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close button */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
