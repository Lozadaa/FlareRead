import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useEpubReader } from '@/hooks/useEpubReader'
import { useReadingSettings } from '@/hooks/useReadingSettings'
import { useAnnotations } from '@/hooks/useAnnotations'
import { useStudySession } from '@/hooks/useStudySession'
import { useTheme } from '@/components/ThemeProvider'
import { TocSidebar } from './TocSidebar'
import { SettingsPanel } from './SettingsPanel'
import { TopBar } from './TopBar'
import { HighlightToolbar } from './HighlightToolbar'
import { AnnotationsSidebar } from './AnnotationsSidebar'
import { ImageLightbox } from './ImageLightbox'
import { SessionTimer, AfkModal, BreakOverlay, MicrobreakReminder, WrapUpScreen, StartSessionDialog } from '@/components/session'
import { SessionStartConfig, Highlight } from '@/types'

interface ReaderViewProps {
  bookId: string
  filePath: string
  onBack: () => void
}

export function ReaderView({ bookId, filePath, onBack }: ReaderViewProps) {
  const { settings, updateSettings, loaded: settingsLoaded } = useReadingSettings()
  const { resolvedTheme } = useTheme()
  const [tocOpen, setTocOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [annotationsOpen, setAnnotationsOpen] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [existingHighlight, setExistingHighlight] = useState<{ id: string; color: string } | null>(null)
  const [showResumeToast, setShowResumeToast] = useState(false)
  const [exitConfirmation, setExitConfirmation] = useState<{ action: () => void } | null>(null)
  const [bookmark, setBookmark] = useState<{ cfi: string; percent: number; chapter: string } | null>(null)
  const resumeToastShown = useRef(false)
  const selectionCfiRef = useRef<string | null>(null)
  const selectionTextRef = useRef<string>('')
  const highlightsRef = useRef<Highlight[]>([])
  const wasFullscreenBeforeFocus = useRef(false)

  const {
    viewerRef,
    renditionRef,
    onHighlightClickRef,
    toc,
    currentChapter,
    bookTitle,
    percent,
    currentCfi,
    isLoading,
    atStart,
    atEnd,
    didResume,
    initBook,
    goNext,
    goPrev,
    goToHref,
    goToCfi,
    savePosition,
    applyHighlights,
    removeHighlightAnnotation
  } = useEpubReader({ bookId, filePath, settings, resolvedTheme, onImageClick: setLightboxSrc })

  const {
    highlights,
    notes,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    createNote,
    updateNote,
    deleteNote,
    getNotesForHighlight
  } = useAnnotations({ bookId })

  // Keep highlights ref in sync for use in event handlers
  highlightsRef.current = highlights

  // Load bookmark from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`flareread-bookmark-${bookId}`)
    if (stored) {
      try {
        setBookmark(JSON.parse(stored))
      } catch { /* ignore */ }
    }
  }, [bookId])

  // Save/toggle bookmark
  const toggleBookmark = useCallback(() => {
    if (bookmark && bookmark.cfi === currentCfi) {
      // Remove bookmark if we're at the bookmarked position
      localStorage.removeItem(`flareread-bookmark-${bookId}`)
      setBookmark(null)
    } else {
      // Set new bookmark at current position
      const newBookmark = { cfi: currentCfi, percent, chapter: currentChapter }
      localStorage.setItem(`flareread-bookmark-${bookId}`, JSON.stringify(newBookmark))
      setBookmark(newBookmark)
    }
  }, [bookmark, currentCfi, percent, currentChapter, bookId])

  const goToBookmark = useCallback(() => {
    if (bookmark) {
      goToCfi(bookmark.cfi)
    }
  }, [bookmark, goToCfi])

  // Handle clicks on existing highlight annotations in the epub
  onHighlightClickRef.current = (highlight, e) => {
    setExistingHighlight({ id: highlight.id, color: highlight.color })
    selectionCfiRef.current = highlight.cfi_range
    selectionTextRef.current = ''
    if (e) {
      const iframe = viewerRef.current?.querySelector('iframe')
      if (iframe) {
        const iframeRect = iframe.getBoundingClientRect()
        setToolbarPosition({
          x: iframeRect.left + e.clientX,
          y: iframeRect.top + e.clientY
        })
        return
      }
    }
    // Fallback: position at center-top of reader
    const viewer = viewerRef.current
    if (viewer) {
      const rect = viewer.getBoundingClientRect()
      setToolbarPosition({ x: rect.left + rect.width / 2, y: rect.top + 60 })
    }
  }

  // ─── Study Session ─────────────────────────────────
  const {
    session,
    isActive: sessionActive,
    startSession,
    stopSession,
    confirmPresence,
    handleAfkTimeout,
    skipBreak,
    getWrapUp,
    reportActivity,
    onHighlightCreated,
    onNoteCreated,
    microbreakTake,
    microbreakEnd,
    microbreakPostpone,
    microbreakDisableToday
  } = useStudySession()

  const [showStartDialog, setShowStartDialog] = useState(false)
  const [showWrapUp, setShowWrapUp] = useState(false)
  const wrapUpDismissedRef = useRef(false)

  // Sync focus mode with fullscreen — enter fullscreen on focus, restore on exit
  useEffect(() => {
    ;(async () => {
      if (focusMode) {
        wasFullscreenBeforeFocus.current = await window.appApi.isFullscreen()
        if (!wasFullscreenBeforeFocus.current) {
          window.appApi.toggleFullscreen()
        }
      } else {
        const isFs = await window.appApi.isFullscreen()
        if (isFs && !wasFullscreenBeforeFocus.current) {
          window.appApi.toggleFullscreen()
        }
      }
    })()
  }, [focusMode])

  // Track mouse/keyboard activity for AFK detection
  useEffect(() => {
    if (!sessionActive) return

    const handleActivity = () => reportActivity()
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('scroll', handleActivity, true)

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('scroll', handleActivity, true)
    }
  }, [sessionActive, reportActivity])

  // Show wrap-up screen when session completes (but not if user already dismissed it)
  useEffect(() => {
    if (session?.state === 'completed' && session.activeMs > 0 && !wrapUpDismissedRef.current) {
      setShowWrapUp(true)
    }
    // Reset dismissed flag when a new session starts
    if (session?.state === 'running') {
      wrapUpDismissedRef.current = false
    }
  }, [session?.state, session?.activeMs])

  const handleStartSession = useCallback(
    (config: SessionStartConfig) => {
      startSession(config)
      setShowStartDialog(false)
    },
    [startSession]
  )

  const handleStopSession = useCallback(async () => {
    await stopSession()
    // Wrap-up will show via the effect above
  }, [stopSession])

  const handleWrapUpContinue = useCallback(() => {
    wrapUpDismissedRef.current = true
    setShowWrapUp(false)
    // Start a new session for continued reading
    setShowStartDialog(true)
  }, [])

  const handleWrapUpFinish = useCallback(() => {
    wrapUpDismissedRef.current = true
    setShowWrapUp(false)
  }, [])

  // ─── Exit Book with Focus Mode Confirmation ───────
  const doExitBook = useCallback(() => {
    if (sessionActive) stopSession()
    onBack()
  }, [sessionActive, stopSession, onBack])

  const tryExitBook = useCallback(() => {
    saveCurrentPosition()
    if (focusMode || sessionActive) {
      setExitConfirmation({ action: doExitBook })
    } else {
      doExitBook()
    }
  }, [focusMode, sessionActive, saveCurrentPosition, doExitBook])

  const confirmExit = useCallback(() => {
    if (exitConfirmation) {
      exitConfirmation.action()
      setExitConfirmation(null)
    }
  }, [exitConfirmation])

  const cancelExit = useCallback(() => {
    setExitConfirmation(null)
  }, [])

  // Track last saved CFI to avoid redundant saves
  const lastSavedCfi = useRef('')
  const autoSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Save position (deduplicated)
  const saveCurrentPosition = useCallback(() => {
    if (currentCfi && currentCfi !== lastSavedCfi.current) {
      savePosition(currentCfi, percent, currentChapter)
      lastSavedCfi.current = currentCfi
    }
  }, [currentCfi, percent, currentChapter, savePosition])

  // Save on navigation (when currentCfi changes)
  useEffect(() => {
    if (currentCfi) {
      saveCurrentPosition()
    }
  }, [currentCfi, saveCurrentPosition])

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveInterval.current = setInterval(() => {
      saveCurrentPosition()
    }, 30000)

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current)
      }
    }
  }, [saveCurrentPosition])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (currentCfi) {
        savePosition(currentCfi, percent, currentChapter)
      }
    }
  }, [currentCfi, percent, currentChapter, savePosition])

  // Initialize book once settings are loaded
  useEffect(() => {
    if (settingsLoaded) {
      initBook()
    }
  }, [settingsLoaded, initBook])

  // Apply highlights when rendition is ready and highlights are loaded
  useEffect(() => {
    if (!isLoading && highlights.length > 0) {
      applyHighlights(highlights)
    }
  }, [isLoading, highlights, applyHighlights])

  // Show "continued reading" toast when book resumes from saved position
  useEffect(() => {
    if (!isLoading && didResume && !resumeToastShown.current) {
      resumeToastShown.current = true
      setShowResumeToast(true)
      const timer = setTimeout(() => setShowResumeToast(false), 3500)
      return () => clearTimeout(timer)
    }
  }, [isLoading, didResume])

  // Set up text selection listener on the epub iframe
  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition || isLoading) return

    const handleSelected = (cfiRange: string, contents: { window: Window }) => {
      const selection = contents.window.getSelection()
      if (!selection || selection.isCollapsed) return

      const text = selection.toString().trim()
      if (!text) return

      selectionCfiRef.current = cfiRange
      selectionTextRef.current = text

      // Check if this selection matches an existing highlight (by CFI or by identical text in same chapter)
      const existing = highlightsRef.current.find(h =>
        h.cfi_range === cfiRange || h.text === text
      )
      if (existing) {
        // Use the existing highlight's CFI so remove/update works correctly
        selectionCfiRef.current = existing.cfi_range
      }
      setExistingHighlight(existing ? { id: existing.id, color: existing.color } : null)

      // Get position for toolbar - use the range's bounding rect
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // The epub content is inside an iframe, so we need to offset by iframe position
      const iframe = viewerRef.current?.querySelector('iframe')
      if (iframe) {
        const iframeRect = iframe.getBoundingClientRect()
        setToolbarPosition({
          x: iframeRect.left + rect.left + rect.width / 2,
          y: iframeRect.top + rect.top
        })
      }
    }

    rendition.on('selected', handleSelected)
    return () => {
      rendition.off('selected', handleSelected)
    }
  }, [isLoading, renditionRef, viewerRef])

  // Handle highlighting (create or update)
  const handleHighlight = useCallback(
    async (color: string) => {
      if (existingHighlight) {
        // Update existing highlight color
        if (existingHighlight.color !== color) {
          await updateHighlight(existingHighlight.id, { color })
        }
      } else {
        if (!selectionCfiRef.current || !selectionTextRef.current) return

        // Check for duplicate CFI range
        const duplicate = highlightsRef.current.find(h => h.cfi_range === selectionCfiRef.current)
        if (duplicate) {
          if (duplicate.color !== color) {
            await updateHighlight(duplicate.id, { color })
          }
        } else {
          await createHighlight({
            cfi_range: selectionCfiRef.current,
            text: selectionTextRef.current,
            color,
            chapter: currentChapter || undefined
          })
          onHighlightCreated()
        }
      }

      // Clear selection in the iframe
      const iframe = viewerRef.current?.querySelector('iframe')
      if (iframe?.contentWindow) {
        iframe.contentWindow.getSelection()?.removeAllRanges()
      }

      setToolbarPosition(null)
      setExistingHighlight(null)
      selectionCfiRef.current = null
      selectionTextRef.current = ''
    },
    [existingHighlight, createHighlight, updateHighlight, currentChapter, viewerRef, onHighlightCreated]
  )

  // Remove highlight directly from the toolbar
  const handleRemoveHighlightFromToolbar = useCallback(async () => {
    if (!existingHighlight) return
    const highlight = highlightsRef.current.find(h => h.id === existingHighlight.id)
    if (highlight) {
      removeHighlightAnnotation(highlight.cfi_range)
    }
    await deleteHighlight(existingHighlight.id)

    const iframe = viewerRef.current?.querySelector('iframe')
    if (iframe?.contentWindow) {
      iframe.contentWindow.getSelection()?.removeAllRanges()
    }

    setToolbarPosition(null)
    setExistingHighlight(null)
    selectionCfiRef.current = null
    selectionTextRef.current = ''
  }, [existingHighlight, removeHighlightAnnotation, deleteHighlight, viewerRef])

  const handleDismissToolbar = useCallback(() => {
    setToolbarPosition(null)
    setExistingHighlight(null)
    selectionCfiRef.current = null
    selectionTextRef.current = ''
  }, [])

  const handleDeleteHighlight = useCallback(
    async (id: string) => {
      const highlight = highlights.find((h) => h.id === id)
      if (highlight) {
        removeHighlightAnnotation(highlight.cfi_range)
      }
      await deleteHighlight(id)
    },
    [highlights, removeHighlightAnnotation, deleteHighlight]
  )

  const handleUpdateHighlight = useCallback(
    async (id: string, data: { color?: string }) => {
      await updateHighlight(id, data)
      // Re-apply all highlights to refresh colors
    },
    [updateHighlight]
  )

  const handleNavigateToCfi = useCallback(
    (cfi: string) => {
      goToCfi(cfi)
      setAnnotationsOpen(false)
    },
    [goToCfi]
  )

  const handleExport = useCallback(async () => {
    await window.appApi.exportMarkdown(bookId)
  }, [bookId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          if (!settings.scrollMode) {
            e.preventDefault()
            goNext()
          }
          break
        case 'ArrowLeft':
        case 'PageUp':
          if (!settings.scrollMode) {
            e.preventDefault()
            goPrev()
          }
          break
        case 'Escape':
          e.preventDefault()
          if (lightboxSrc) {
            setLightboxSrc(null)
          } else {
            setFocusMode((prev) => !prev)
            setTocOpen(false)
            setSettingsOpen(false)
            setAnnotationsOpen(false)
          }
          break
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            window.appApi.toggleFullscreen()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, settings.scrollMode, lightboxSrc])

  // ─── Window close confirmation (focus mode / session) ──
  useEffect(() => {
    const cleanup = window.appApi.onCloseRequested(() => {
      if (focusMode || sessionActive) {
        setExitConfirmation({
          action: () => {
            if (sessionActive) stopSession()
            saveCurrentPosition()
            window.appApi.confirmClose()
          }
        })
      } else {
        saveCurrentPosition()
        window.appApi.confirmClose()
      }
    })
    return cleanup
  }, [focusMode, sessionActive, stopSession, saveCurrentPosition])

  // ─── Menu event handlers ──────────────────────────
  useEffect(() => {
    const cleanups = [
      window.appApi.onMenuToggleFocusMode(() => {
        setFocusMode((prev) => !prev)
      }),
      window.appApi.onMenuToggleSidebar(() => {
        setTocOpen((prev) => !prev)
      }),
      window.appApi.onMenuCloseBook(() => {
        tryExitBook()
      }),
      window.appApi.onMenuZoomIn(() => {
        updateSettings({ fontSize: Math.min(settings.fontSize + 2, 32) })
      }),
      window.appApi.onMenuZoomOut(() => {
        updateSettings({ fontSize: Math.max(settings.fontSize - 2, 10) })
      }),
      window.appApi.onMenuZoomReset(() => {
        updateSettings({ fontSize: 16 })
      }),
      window.appApi.onMenuStartPomodoro(() => {
        if (!sessionActive) setShowStartDialog(true)
      }),
      window.appApi.onMenuEndSession(() => {
        if (sessionActive) stopSession()
      })
    ]
    return () => cleanups.forEach((fn) => fn())
  }, [sessionActive, stopSession, onBack, saveCurrentPosition, tryExitBook, updateSettings, settings.fontSize])

  return (
    <div className="h-screen flex flex-col bg-reading-bg overflow-hidden">
      {/* Top Bar */}
      <TopBar
        bookTitle={bookTitle}
        currentChapter={currentChapter}
        percent={percent}
        focusMode={focusMode}
        onOpenToc={() => {
          setTocOpen(true)
          setSettingsOpen(false)
          setAnnotationsOpen(false)
        }}
        onOpenSettings={() => {
          setSettingsOpen(!settingsOpen)
          setTocOpen(false)
          setAnnotationsOpen(false)
        }}
        onOpenAnnotations={() => {
          setAnnotationsOpen(!annotationsOpen)
          setTocOpen(false)
          setSettingsOpen(false)
        }}
        onBack={tryExitBook}
        highlightCount={highlights.length}
        sessionSlot={
          session && session.state !== 'completed' ? (
            <SessionTimer session={session} compact onStop={handleStopSession} />
          ) : (
            <button
              onClick={() => setShowStartDialog(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
              title="Start study session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Focus
            </button>
          )
        }
      />

      {/* Settings Panel (anchored to top bar) */}
      <div className="relative">
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onUpdate={updateSettings}
        />
      </div>

      {/* Main Reader Area */}
      <div className={`flex-1 relative ${settings.scrollMode ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-reading-bg z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-pulse">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <p className="font-body italic text-sm text-muted-foreground">Opening your book...</p>
            </div>
          </div>
        )}

        {/* EPUB Viewer Container */}
        <div className="h-full w-full mx-auto" style={{ maxWidth: `${settings.contentWidth}%`, padding: `0 ${settings.margin}px` }}>
          <div ref={viewerRef} className="h-full w-full" />
        </div>

        {/* Navigation Overlays (click zones) - hidden in scroll mode */}
        {!isLoading && !settings.scrollMode && (
          <>
            {/* Left click zone - Previous */}
            <button
              onClick={goPrev}
              disabled={atStart}
              className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-start pl-2 cursor-pointer opacity-0 hover:opacity-100 transition-opacity disabled:cursor-default group z-10"
              aria-label="Previous page"
            >
              <div className={`p-2 rounded-full bg-reading-bg/90 shadow-md transition-transform group-hover:scale-110 ${atStart ? 'invisible' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </div>
            </button>

            {/* Right click zone - Next */}
            <button
              onClick={goNext}
              disabled={atEnd}
              className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-end pr-2 cursor-pointer opacity-0 hover:opacity-100 transition-opacity disabled:cursor-default group z-10"
              aria-label="Next page"
            >
              <div className={`p-2 rounded-full bg-reading-bg/90 shadow-md transition-transform group-hover:scale-110 ${atEnd ? 'invisible' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Bottom Navigation Bar - hidden in scroll mode */}
      {!isLoading && !settings.scrollMode && (
        <div className="shrink-0 bg-topbar shadow-[0_-1px_3px_rgba(0,0,0,0.05)] px-4 py-1.5 flex items-center gap-3 select-none">
          <button
            onClick={goPrev}
            disabled={atStart}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground disabled:opacity-20 disabled:pointer-events-none transition-all hover:scale-110"
            aria-label="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 h-1 bg-border rounded-full overflow-visible">
              {/* Progress fill */}
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-sidebar-gold"
                style={{ width: `${percent}%` }}
              />
              {/* Bookmark flag on progress bar */}
              {bookmark && (
                <button
                  onClick={goToBookmark}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
                  style={{ left: `${bookmark.percent}%` }}
                  title={`Ir a marcador: ${bookmark.chapter || `${bookmark.percent}%`}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-primary drop-shadow-sm group-hover:scale-125 transition-transform"
                  >
                    <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              )}
            </div>
            <span className="font-mono text-ui-xs text-muted-foreground tabular-nums shrink-0 w-10 text-right">
              {percent}%
            </span>
          </div>

          {/* Bookmark toggle button */}
          <button
            onClick={toggleBookmark}
            className={`p-1 rounded-md transition-all hover:scale-110 ${
              bookmark
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground hover:bg-accent'
            }`}
            title={bookmark ? 'Quitar marcador' : 'Marcar posicion actual'}
            aria-label={bookmark ? 'Quitar marcador' : 'Marcar posicion actual'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={bookmark ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <button
            onClick={goNext}
            disabled={atEnd}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground disabled:opacity-20 disabled:pointer-events-none transition-all hover:scale-110"
            aria-label="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Highlight Toolbar (floating) */}
      <HighlightToolbar
        position={toolbarPosition}
        onHighlight={handleHighlight}
        onDismiss={handleDismissToolbar}
        existingHighlight={existingHighlight}
        onRemoveHighlight={handleRemoveHighlightFromToolbar}
      />

      {/* TOC Sidebar */}
      <TocSidebar
        toc={toc}
        isOpen={tocOpen}
        onClose={() => setTocOpen(false)}
        onNavigate={goToHref}
        currentChapter={currentChapter}
      />

      {/* Annotations Sidebar */}
      <AnnotationsSidebar
        isOpen={annotationsOpen}
        onClose={() => setAnnotationsOpen(false)}
        highlights={highlights}
        notes={notes}
        onNavigateToCfi={handleNavigateToCfi}
        onCreateNote={(data) => {
          const result = createNote(data)
          onNoteCreated()
          return result
        }}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        onUpdateHighlight={handleUpdateHighlight}
        onDeleteHighlight={handleDeleteHighlight}
        onExport={handleExport}
        getNotesForHighlight={getNotesForHighlight}
      />

      {/* ─── Session Overlays ─────────────────────────── */}

      {/* Start Session Dialog */}
      <StartSessionDialog
        bookId={bookId}
        visible={showStartDialog}
        onStart={handleStartSession}
        onCancel={() => setShowStartDialog(false)}
      />

      {/* AFK Modal */}
      <AfkModal
        visible={session?.state === 'paused_afk'}
        onConfirm={confirmPresence}
        onTimeout={handleAfkTimeout}
      />

      {/* Break Overlay (Focus Wall) */}
      {session && <BreakOverlay session={session} onSkipBreak={skipBreak} />}

      {/* Microbreak Reminder (non-modal toast) */}
      {session && session.state === 'running' && (session.microbreakDue || session.microbreakActive) && (
        <MicrobreakReminder
          session={session}
          onTakeBreak={microbreakTake}
          onPostpone={microbreakPostpone}
          onDisableToday={microbreakDisableToday}
          onEndBreak={microbreakEnd}
        />
      )}

      {/* Wrap-Up Screen */}
      {showWrapUp && (
        <WrapUpScreen
          getWrapUp={getWrapUp}
          onContinue={handleWrapUpContinue}
          onFinish={handleWrapUpFinish}
          onNavigateToHighlight={(cfi) => {
            setShowWrapUp(false)
            goToCfi(cfi)
          }}
        />
      )}

      {/* Exit Focus Mode Confirmation */}
      {exitConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-popover rounded-xl shadow-2xl border border-border p-6 max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">
                {sessionActive ? 'Sesion activa' : 'Modo enfoque activo'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5 ml-[52px]">
              {sessionActive
                ? 'Tu sesion de estudio se detendra si sales ahora. ¿Quieres continuar?'
                : 'Estas en modo enfoque. ¿Seguro que quieres salir?'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelExit}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                Seguir leyendo
              </button>
              <button
                onClick={confirmExit}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Toast */}
      {showResumeToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-popover/95 backdrop-blur-xl rounded-xl shadow-lg border border-border animate-in fade-in slide-in-from-bottom-4 duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary shrink-0">
            <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <div>
            <p className="text-[11px] text-muted-foreground leading-tight">Continuando donde lo dejaste</p>
            <p className="text-sm font-medium leading-tight">
              {currentChapter}{currentChapter && percent > 0 ? ` \u00b7 ${percent}%` : percent > 0 ? `${percent}%` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
