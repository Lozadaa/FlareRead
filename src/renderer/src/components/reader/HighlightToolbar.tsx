import { HIGHLIGHT_COLORS } from '@/types'

interface HighlightToolbarProps {
  position: { x: number; y: number } | null
  onHighlight: (color: string) => void
  onDismiss: () => void
  existingHighlight?: { id: string; color: string } | null
  onRemoveHighlight?: () => void
}

export function HighlightToolbar({
  position,
  onHighlight,
  onDismiss,
  existingHighlight,
  onRemoveHighlight
}: HighlightToolbarProps) {
  if (!position) return null

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div className="fixed inset-0 z-[9998]" onClick={onDismiss} />

      <div
        className="fixed z-[9999] flex items-center gap-1.5 px-2.5 py-2 bg-popover/90 backdrop-blur-xl rounded-xl shadow-lg border border-border animate-in fade-in zoom-in-95 duration-150"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%) translateY(-8px)'
        }}
      >
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onHighlight(color.value)}
            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
              existingHighlight?.color === color.value
                ? 'border-foreground/60 scale-110'
                : 'border-transparent hover:border-foreground/40'
            }`}
            style={{ backgroundColor: color.value }}
            title={existingHighlight ? `Cambiar a ${color.name}` : `Resaltar ${color.name}`}
            aria-label={existingHighlight ? `Cambiar a ${color.name}` : `Resaltar ${color.name}`}
          />
        ))}

        {/* Remove highlight button */}
        {existingHighlight && onRemoveHighlight && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={onRemoveHighlight}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110 active:scale-95"
              title="Quitar resaltado"
              aria-label="Quitar resaltado"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </>
        )}
      </div>
    </>
  )
}
