import { useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'

interface KeyboardShortcutsDialogProps {
  onClose: () => void
}

const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'O'], description: 'Import EPUB' },
      { keys: ['Ctrl', 'K'], description: 'Command Palette' },
      { keys: ['Ctrl', ','], description: 'Open Settings' },
      { keys: ['Ctrl', 'W'], description: 'Close Book' },
      { keys: ['F11'], description: 'Toggle Fullscreen' },
      { keys: ['Ctrl', '/'], description: 'Keyboard Shortcuts' }
    ]
  },
  {
    title: 'Reader',
    shortcuts: [
      { keys: ['Esc'], description: 'Toggle Focus Mode' },
      { keys: ['F'], description: 'Toggle Fullscreen' },
      { keys: ['←', '→'], description: 'Previous / Next Page' },
      { keys: ['PgUp', 'PgDn'], description: 'Previous / Next Page' },
      { keys: ['Ctrl', 'B'], description: 'Toggle Sidebar' },
      { keys: ['Ctrl', '='], description: 'Zoom In' },
      { keys: ['Ctrl', '-'], description: 'Zoom Out' },
      { keys: ['Ctrl', '0'], description: 'Reset Zoom' }
    ]
  }
]

export function KeyboardShortcutsDialog({ onClose }: KeyboardShortcutsDialogProps): JSX.Element {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border/40 bg-popover/95 backdrop-blur-xl p-0 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] animate-in fade-in-0 zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Keyboard className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-ui-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
            <p className="text-ui-xs text-muted-foreground">Quick actions to navigate FlareRead</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="px-6 pb-6 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-ui-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2.5">
                {group.title}
              </h3>
              <div className="rounded-lg border border-border/50 overflow-hidden divide-y divide-border/40">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-ui-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground/40 text-xs mx-0.5">+</span>}
                          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md border border-border/60 bg-gradient-to-b from-muted/80 to-muted/40 px-1.5 font-mono text-xs font-medium text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
