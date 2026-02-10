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
              'flex-1 flex items-center gap-2 p-3 rounded-lg border transition-all text-left',
              isSelected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-ui-sm font-medium">{mode.label}</p>
              <p className="text-ui-xs opacity-70">{mode.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
