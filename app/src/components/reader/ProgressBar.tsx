interface ProgressBarProps {
  percent: number
  chapter: string | null
}

export function ProgressBar({ percent, chapter }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 h-10 sm:h-8 bg-card border-t border-border select-none">
      {/* Chapter name */}
      {chapter && (
        <span className="text-ui-xs font-body text-muted-foreground truncate max-w-[200px]">
          {chapter}
        </span>
      )}

      {/* Progress bar */}
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/60 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      {/* Percentage */}
      <span className="text-ui-xs font-body text-muted-foreground tabular-nums shrink-0">
        {percent}%
      </span>
    </div>
  )
}
