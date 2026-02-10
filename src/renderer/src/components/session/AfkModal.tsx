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

  const total = Math.ceil(timeoutMs / 1000)
  const progress = countdown / total
  const circumference = 2 * Math.PI * 44
  const isUrgent = countdown <= 10

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-card border border-border rounded-2xl shadow-[0_24px_80px_-12px_hsla(var(--primary),0.15)] p-8 max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Gradient ring countdown */}
        <div className="relative mx-auto mb-6 w-28 h-28">
          {/* Outer glow ring */}
          <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${
            isUrgent
              ? 'shadow-[0_0_20px_4px_hsla(0,72%,51%,0.2)]'
              : 'shadow-[0_0_16px_3px_hsla(38,80%,55%,0.12)]'
          }`} />

          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              strokeWidth="3"
              className="stroke-border"
            />
            {/* Progress ring with gradient */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-linear ${
                isUrgent ? 'stroke-destructive' : 'stroke-gold'
              }`}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-mono font-bold tabular-nums transition-colors duration-500 ${
              isUrgent ? 'text-destructive' : 'text-foreground'
            }`}>
              {countdown}
            </span>
            <span className="text-ui-xs text-muted-foreground">seconds</span>
          </div>
        </div>

        {/* Pulsing icon */}
        <div className={`mx-auto mb-4 w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-500 ${
          isUrgent
            ? 'bg-destructive/10'
            : 'bg-gold/10'
        }`}>
          <AlertTriangle className={`w-6 h-6 transition-colors duration-500 ${
            isUrgent
              ? 'text-destructive animate-pulse'
              : 'text-gold'
          }`} />
        </div>

        <h2 className="font-display text-xl italic text-foreground mb-1.5">
          Are you still reading?
        </h2>
        <p className="text-ui-sm text-muted-foreground mb-6 leading-relaxed">
          Your session has been paused due to inactivity. All metrics are frozen until you confirm.
        </p>

        <Button
          onClick={handleConfirm}
          className="w-full btn-press"
          size="lg"
        >
          Yes, I&apos;m here!
        </Button>
      </div>
    </div>
  )
}
