import { HIGHLIGHT_COLORS, type HighlightColor } from '@/types'

interface HighlightToolbarProps {
  position: { x: number; y: number }
  onSelectColor: (color: HighlightColor) => void
  onDismiss: () => void
}

export function HighlightToolbar({ position, onSelectColor, onDismiss }: HighlightToolbarProps) {
  // Position the toolbar above the selection, centered
  const toolbarWidth = 200
  const toolbarHeight = 44
  const gap = 8

  const left = Math.max(8, Math.min(position.x - toolbarWidth / 2, window.innerWidth - toolbarWidth - 8))
  const top = Math.max(8, position.y - toolbarHeight - gap)

  return (
    <>
      {/* Backdrop to dismiss */}
      <div className="fixed inset-0 z-50" onClick={onDismiss} />

      {/* Toolbar */}
      <div
        className="fixed z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border shadow-lg animate-fade-in"
        style={{ left, top }}
      >
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onSelectColor(color.value as HighlightColor)}
            className="w-7 h-7 rounded-full border-2 border-transparent hover:border-foreground/40 transition-all hover:scale-110 focus:outline-none focus:border-foreground/60"
            style={{ backgroundColor: color.value }}
            title={`Highlight ${color.name}`}
          />
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Add note without highlight */}
        <button
          onClick={() => onSelectColor(HIGHLIGHT_COLORS[0].value as HighlightColor)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Highlight with default color"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>
    </>
  )
}
