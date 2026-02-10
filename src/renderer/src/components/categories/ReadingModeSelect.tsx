import { motion } from 'framer-motion'
import { BookOpen, GraduationCap } from 'lucide-react'
import { ReadingMode } from '@/types'
import { cn } from '@/lib/utils'

interface ReadingModeSelectProps {
  value: ReadingMode
  onChange: (mode: ReadingMode) => void
  className?: string
}

const MODES: { value: ReadingMode; label: string; description: string; icon: typeof BookOpen }[] = [
  {
    value: 'study',
    label: 'Study',
    description: 'Intensive reading',
    icon: GraduationCap
  },
  {
    value: 'leisure',
    label: 'Leisure',
    description: 'Extensive reading',
    icon: BookOpen
  }
]

export function ReadingModeSelect({
  value,
  onChange,
  className
}: ReadingModeSelectProps): JSX.Element {
  return (
    <div className={cn('flex gap-2', className)}>
      {MODES.map((mode) => {
        const Icon = mode.icon
        const isSelected = value === mode.value
        return (
          <button
            key={mode.value}
            onClick={() => onChange(isSelected ? null : mode.value)}
            className={cn(
              'relative flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden',
              isSelected
                ? 'border-primary/40 text-primary'
                : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
            )}
          >
            {/* Selected background glow */}
            {isSelected && (
              <motion.div
                layoutId="reading-mode-bg"
                className="absolute inset-0 bg-primary/[0.06]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}

            <div className={cn(
              'relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
              isSelected
                ? 'bg-primary/15'
                : 'bg-muted group-hover:bg-primary/10'
            )}>
              <Icon className="h-4 w-4 shrink-0" />
            </div>
            <div className="relative">
              <p className="text-ui-sm font-medium">{mode.label}</p>
              <p className="text-ui-xs opacity-60">{mode.description}</p>
            </div>

            {/* Selected indicator dot */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
