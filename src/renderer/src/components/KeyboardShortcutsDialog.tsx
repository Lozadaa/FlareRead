import { useEffect } from 'react'

interface KeyboardShortcutsDialogProps {
  onClose: () => void
}

const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: 'Ctrl+O', description: 'Import EPUB' },
      { keys: 'Ctrl+K', description: 'Command Palette' },
      { keys: 'Ctrl+,', description: 'Open Settings' },
      { keys: 'Ctrl+W', description: 'Close Book' },
      { keys: 'F11', description: 'Toggle Fullscreen' },
      { keys: 'Ctrl+/', description: 'Keyboard Shortcuts' }
    ]
  },
  {
    title: 'Reader',
    shortcuts: [
      { keys: 'Esc', description: 'Toggle Focus Mode' },
      { keys: 'F', description: 'Toggle Fullscreen' },
      { keys: '← / →', description: 'Previous / Next Page' },
      { keys: 'PgUp / PgDn', description: 'Previous / Next Page' },
      { keys: 'Ctrl+B', description: 'Toggle Sidebar' },
      { keys: 'Ctrl+=', description: 'Zoom In' },
      { keys: 'Ctrl+-', description: 'Zoom Out' },
      { keys: 'Ctrl+0', description: 'Reset Zoom' }
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-popover p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{group.title}</h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{shortcut.description}</span>
                    <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {shortcut.keys}
                    </kbd>
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
