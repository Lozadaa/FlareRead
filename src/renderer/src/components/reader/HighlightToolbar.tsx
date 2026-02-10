import { HIGHLIGHT_COLORS } from '@/types'

interface HighlightToolbarProps {
  position: { x: number; y: number } | null
  onHighlight: (color: string) => void
  onDismiss: () => void
}

export function HighlightToolbar({ position, onHighlight, onDismiss }: HighlightToolbarProps) {
  if (!position) return null

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div className="fixed inset-0 z-[9998]" onClick={onDismiss} />

      <div
        className="fixed z-[9999] flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200 animate-in fade-in zoom-in-95 duration-150"
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
            className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-400 transition-all hover:scale-110"
            style={{ backgroundColor: color.value }}
            title={`Highlight ${color.name}`}
            aria-label={`Highlight ${color.name}`}
          />
        ))}
      </div>
    </>
  )
}
