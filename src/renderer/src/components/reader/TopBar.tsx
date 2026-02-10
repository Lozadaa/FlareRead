interface TopBarProps {
  bookTitle: string
  currentChapter: string
  percent: number
  focusMode: boolean
  onOpenToc: () => void
  onOpenSettings: () => void
  onOpenAnnotations: () => void
  onBack: () => void
  highlightCount?: number
  sessionSlot?: React.ReactNode
}

export function TopBar({
  bookTitle,
  currentChapter,
  percent,
  focusMode,
  onOpenToc,
  onOpenSettings,
  onOpenAnnotations,
  onBack,
  highlightCount = 0,
  sessionSlot
}: TopBarProps) {
  return (
    <header
      className={`transition-all duration-300 bg-topbar border-b border-topbar-border shrink-0 select-none ${
        focusMode ? 'h-8 opacity-40 hover:opacity-100' : 'h-12'
      }`}
    >
      <div className={`flex items-center h-full px-3 gap-2 ${focusMode ? 'text-xs' : 'text-sm'}`}>
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
          aria-label="Go back to library"
          title="Back to library"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={focusMode ? 14 : 18} height={focusMode ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* TOC button */}
        <button
          onClick={onOpenToc}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
          aria-label="Open table of contents"
          title="Table of Contents"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={focusMode ? 14 : 18} height={focusMode ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="9" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb: Title > Chapter */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-foreground font-medium truncate max-w-[200px]" title={bookTitle}>
            {bookTitle}
          </span>
          {currentChapter && (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="text-muted-foreground truncate" title={currentChapter}>
                {currentChapter}
              </span>
            </>
          )}
        </div>

        {/* Session timer slot */}
        {sessionSlot && <div className="shrink-0">{sessionSlot}</div>}

        {/* Progress */}
        <span className="text-muted-foreground tabular-nums shrink-0">
          {percent}%
        </span>

        {/* Annotations button */}
        <button
          onClick={onOpenAnnotations}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0 relative"
          aria-label="Annotations"
          title="Highlights & Notes"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={focusMode ? 14 : 18} height={focusMode ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {highlightCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {highlightCount > 9 ? '9+' : highlightCount}
            </span>
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
          aria-label="Reading settings"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={focusMode ? 14 : 18} height={focusMode ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border relative -mt-0.5">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </header>
  )
}
