interface AfkModalProps {
  onConfirm: () => void
  onEndSession: () => void
}

export function AfkModal({ onConfirm, onEndSession }: AfkModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-4 text-center">
          {/* Icon */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-[hsl(var(--gold))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>

          <h2 className="text-lg font-display font-semibold text-foreground mb-2">
            Are you still reading?
          </h2>
          <p className="text-ui-sm font-body text-muted-foreground">
            No activity detected. The session timer is paused.
          </p>
        </div>

        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={onEndSession}
            className="flex-1 py-2.5 rounded-lg border border-border text-ui-sm font-body font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            End session
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors"
          >
            I'm here
          </button>
        </div>
      </div>
    </div>
  )
}
