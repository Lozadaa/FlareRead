import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AfkModalProps {
  visible: boolean
  onConfirm: () => void
  onTimeout: () => void
  /** Timeout duration in ms (default 60000 = 1 minute) */
  timeoutMs?: number
}

export function AfkModal({ visible, onConfirm, onTimeout, timeoutMs = 60000 }: AfkModalProps) {
  const [countdown, setCountdown] = useState(Math.ceil(timeoutMs / 1000))

  useEffect(() => {
    if (!visible) {
      setCountdown(Math.ceil(timeoutMs / 1000))
      return
    }

    setCountdown(Math.ceil(timeoutMs / 1000))

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [visible, timeoutMs, onTimeout])

  const handleConfirm = useCallback(() => {
    onConfirm()
  }, [onConfirm])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Pulsing icon */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Are you still reading?
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your session has been paused due to inactivity. All metrics are frozen until you confirm.
        </p>

        {/* Countdown ring */}
        <div className="mb-6">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-amber-500 transition-all duration-1000"
                strokeDasharray={`${2 * Math.PI * 35}`}
                strokeDashoffset={`${2 * Math.PI * 35 * (1 - countdown / Math.ceil(timeoutMs / 1000))}`}
              />
            </svg>
            <span className="absolute text-2xl font-bold tabular-nums text-foreground">
              {countdown}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Session ends in {countdown}s
          </p>
        </div>

        <Button
          onClick={handleConfirm}
          className="w-full"
          size="lg"
        >
          Yes, I&apos;m here!
        </Button>
      </div>
    </div>
  )
}
