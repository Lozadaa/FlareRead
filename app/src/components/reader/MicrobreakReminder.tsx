import { useEffect, useState } from 'react'

interface MicrobreakReminderProps {
  onDismiss: () => void
}

export function MicrobreakReminder({ onDismiss }: MicrobreakReminderProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true))

    // Auto-dismiss after 10 seconds
    const timeout = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 10000)

    return () => clearTimeout(timeout)
  }, [onDismiss])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className={`
        fixed top-16 right-4 z-40 max-w-xs
        transition-all duration-300 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ui-sm font-body font-medium text-foreground">
              Time for a microbreak
            </p>
            <p className="text-ui-xs font-body text-muted-foreground mt-0.5">
              Look away from the screen for 20 seconds.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
