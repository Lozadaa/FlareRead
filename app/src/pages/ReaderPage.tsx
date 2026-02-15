import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { booksService } from '@/services'
import { useReader, type SelectionInfo } from '@/hooks/useReader'
import { useReadingSettings } from '@/hooks/useReadingSettings'
import { useHighlights } from '@/hooks/useHighlights'
import { useStudySession, type SessionConfig } from '@/hooks/useStudySession'
import {
  TableOfContents,
  ReadingSettingsPanel,
  ProgressBar,
  ImageLightbox,
  HighlightToolbar,
  HighlightPopover,
  AnnotationsSidebar,
  StartSessionDialog,
  SessionTimer,
  BreakOverlay,
  AfkModal,
  MicrobreakReminder,
  SessionWrapUp,
  TtsBar,
} from '@/components/reader'
import { useTts } from '@/hooks/useTts'
import type { BookDoc, HighlightColor, HighlightDoc } from '@/types'

export function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const uid = user?.uid

  // Book data
  const [book, setBook] = useState<BookDoc | null>(null)
  const [epubUrl, setEpubUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // UI state
  const [tocOpen, setTocOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [annotationsOpen, setAnnotationsOpen] = useState(false)

  // Session dialog
  const [showSessionDialog, setShowSessionDialog] = useState(false)

  // TTS state
  const [ttsOpen, setTtsOpen] = useState(false)

  // Highlight UI state
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null)
  const [activeHighlight, setActiveHighlight] = useState<{
    highlight: HighlightDoc
    rect: { x: number; y: number; width: number; height: number }
  } | null>(null)

  // Reader container
  const containerRef = useRef<HTMLDivElement>(null)

  // Reading settings
  const { settings, updateSettings, loaded: settingsLoaded } = useReadingSettings()

  // Highlights & notes
  const highlightManager = useHighlights({ bookId: bookId ?? null })

  // Study session
  const session = useStudySession()

  // TTS hook
  const tts = useTts({
    onParagraphStart: (index) => {
      reader.highlightTtsParagraph(index)
    },
    onParagraphEnd: () => {
      // highlight will move to next paragraph on its onParagraphStart
    },
    onEnd: () => {
      reader.highlightTtsParagraph(null)
    },
  })

  // Auto-save debounce ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load book data and EPUB URL
  useEffect(() => {
    if (!uid || !bookId) return
    let cancelled = false

    async function loadBook() {
      try {
        const bookDoc = await booksService.getById(uid!, bookId!)
        if (cancelled) return
        if (!bookDoc) {
          setLoadError('Book not found')
          return
        }
        setBook(bookDoc)

        // Get download URL for the EPUB
        const epubRef = ref(storage, bookDoc.epubStoragePath)
        const url = await getDownloadURL(epubRef)
        if (!cancelled) setEpubUrl(url)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load book')
        }
      }
    }

    loadBook()
    return () => { cancelled = true }
  }, [uid, bookId])

  // Save progress to Firestore (debounced)
  const handleLocationChange = useCallback(
    (cfi: string, percent: number, chapter: string | null) => {
      if (!uid || !bookId) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        booksService.updateProgress(uid, bookId, {
          percentComplete: percent,
          cfiPosition: cfi,
          currentChapter: chapter,
        })
      }, 2000)
    },
    [uid, bookId]
  )

  // Cleanup save timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // Handle text selection in EPUB
  const handleTextSelected = useCallback((info: SelectionInfo) => {
    setActiveHighlight(null)
    setSelectionInfo(info)
  }, [])

  // Handle highlight click in EPUB
  const handleHighlightClicked = useCallback(
    (highlightId: string, cfiRange: string, rect: { x: number; y: number; width: number; height: number }) => {
      setSelectionInfo(null)
      // Find highlight by cfiRange (more reliable than ID from annotations data)
      const highlight = highlightManager.highlights.find(
        (h) => h.cfiRange === cfiRange || h.id === highlightId
      )
      if (highlight) {
        setActiveHighlight({ highlight, rect })
      }
    },
    [highlightManager.highlights]
  )

  // epub.js reader hook
  const reader = useReader({
    containerRef,
    epubUrl,
    initialCfi: book?.cfiPosition ?? null,
    settings,
    viewMode: settings.viewMode,
    onLocationChange: handleLocationChange,
    onImageClick: setLightboxSrc,
    onTextSelected: handleTextSelected,
    onHighlightClicked: handleHighlightClicked,
  })

  // Render highlights when they change or reader loads
  useEffect(() => {
    if (!reader.loading && highlightManager.highlights.length >= 0) {
      reader.renderHighlights(highlightManager.highlights)
    }
  }, [reader.loading, highlightManager.highlights, reader.renderHighlights])

  // Handle color selection from toolbar (create highlight)
  const handleCreateHighlight = useCallback(
    async (color: HighlightColor) => {
      if (!selectionInfo) return
      await highlightManager.createHighlight({
        cfiRange: selectionInfo.cfiRange,
        text: selectionInfo.text,
        color,
        chapter: reader.currentChapter,
      })
      session.recordHighlight()
      reader.clearSelection()
      setSelectionInfo(null)
    },
    [selectionInfo, highlightManager, reader, session]
  )

  // Handle color change on existing highlight
  const handleChangeHighlightColor = useCallback(
    async (color: string) => {
      if (!activeHighlight) return
      await highlightManager.updateHighlightColor(activeHighlight.highlight.id, color)
      setActiveHighlight((prev) =>
        prev ? { ...prev, highlight: { ...prev.highlight, color } } : null
      )
    },
    [activeHighlight, highlightManager]
  )

  // Handle delete existing highlight
  const handleDeleteHighlight = useCallback(
    async () => {
      if (!activeHighlight) return
      await highlightManager.deleteHighlight(activeHighlight.highlight.id)
      setActiveHighlight(null)
    },
    [activeHighlight, highlightManager]
  )

  // Handle add note to active highlight
  const handleAddNoteToHighlight = useCallback(
    async (content: string) => {
      if (!activeHighlight) return
      await highlightManager.createNote({
        highlightId: activeHighlight.highlight.id,
        content,
      })
      session.recordNote()
    },
    [activeHighlight, highlightManager, session]
  )

  // Session handlers
  const handleStartSession = useCallback(
    (config: SessionConfig) => {
      if (!bookId) return
      session.startSession(bookId, config)
      setShowSessionDialog(false)
    },
    [bookId, session]
  )

  // TTS: play from beginning of current chapter
  const handleTtsPlay = useCallback(() => {
    const paragraphs = reader.getChapterParagraphs()
    if (paragraphs.length > 0) {
      tts.speak(paragraphs, 0)
    }
  }, [reader, tts])

  // TTS: play from specific paragraph index
  const handleTtsPlayFromIndex = useCallback((index: number) => {
    const paragraphs = reader.getChapterParagraphs()
    if (paragraphs.length > 0) {
      tts.speakFromIndex(paragraphs, index)
    }
  }, [reader, tts])

  // TTS: inject/remove play buttons when TTS bar is opened/closed
  useEffect(() => {
    if (ttsOpen && !reader.loading) {
      reader.injectTtsPlayButtons(handleTtsPlayFromIndex)
    } else {
      reader.removeTtsPlayButtons()
    }
    return () => {
      reader.removeTtsPlayButtons()
    }
  }, [ttsOpen, reader.loading, reader.injectTtsPlayButtons, reader.removeTtsPlayButtons, handleTtsPlayFromIndex])

  // TTS: clean up on unmount or when closing
  const handleTtsClose = useCallback(() => {
    tts.stop()
    reader.highlightTtsParagraph(null)
    reader.removeTtsPlayButtons()
    setTtsOpen(false)
  }, [tts, reader])

  // Touch swipe navigation for paginated mode
  useEffect(() => {
    if (settings.viewMode !== 'paginated') return
    const container = containerRef.current
    if (!container) return

    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      if (!t) return
      startX = t.clientX
      startY = t.clientY
      tracking = true
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const touch = e.changedTouches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // Must be primarily horizontal and exceed 50px threshold
      if (absDx > 50 && absDx > absDy * 1.5) {
        if (dx < 0) {
          reader.goNext()
        } else {
          reader.goPrev()
        }
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [settings.viewMode, reader.goNext, reader.goPrev])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture if user is in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          reader.goNext()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          reader.goPrev()
          break
        case 'Escape':
          if (selectionInfo) {
            setSelectionInfo(null)
            reader.clearSelection()
          } else if (activeHighlight) {
            setActiveHighlight(null)
          } else if (focusMode) {
            setFocusMode(false)
          } else if (annotationsOpen) {
            setAnnotationsOpen(false)
          } else if (tocOpen) {
            setTocOpen(false)
          } else if (settingsOpen) {
            setSettingsOpen(false)
          }
          break
        case 'f':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            setFocusMode((v) => !v)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reader.goNext, reader.goPrev, reader.clearSelection, focusMode, tocOpen, settingsOpen, selectionInfo, activeHighlight, annotationsOpen])

  // Close panels when entering focus mode
  useEffect(() => {
    if (focusMode) {
      setTocOpen(false)
      setSettingsOpen(false)
      setAnnotationsOpen(false)
      if (ttsOpen) {
        handleTtsClose()
      }
    }
  }, [focusMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Loading states
  if (loadError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-ui-sm font-body text-muted-foreground">{loadError}</p>
        <button
          onClick={() => navigate('/library')}
          className="px-4 py-2 text-ui-sm font-body font-medium text-primary hover:underline"
        >
          Back to Library
        </button>
      </div>
    )
  }

  if (!book || !epubUrl || !settingsLoaded) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-ui-sm font-body text-muted-foreground">Loading book...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top toolbar - hidden in focus mode */}
      {!focusMode && (
        <header className="flex items-center justify-between px-2 sm:px-3 h-12 bg-card border-b border-border shrink-0 animate-fade-in">
          {/* Left: Back + TOC */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => navigate('/library')}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Back to Library"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>

            <div className="w-px h-5 bg-border mx-0.5 sm:mx-1" />

            <button
              onClick={() => { setTocOpen(!tocOpen); setSettingsOpen(false) }}
              className={`
                w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-colors
                ${tocOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
              `}
              title="Table of Contents"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </button>
          </div>

          {/* Center: Book title or session timer */}
          <div className="flex-1 flex items-center justify-center gap-3 px-4 min-w-0">
            {session.active ? (
              <SessionTimer
                elapsedMs={session.elapsedMs}
                phase={session.phase}
                phaseRemainingMs={session.phaseRemainingMs}
                mode={session.config.mode}
                completedPomodoros={session.stats.completedPomodoros}
                onEnd={session.endSession}
              />
            ) : (
              <div className="text-center min-w-0">
                <h1 className="text-ui-sm font-body font-medium text-foreground truncate">
                  {book.title}
                </h1>
                {book.author && (
                  <p className="text-ui-xs font-body text-muted-foreground truncate">
                    {book.author}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Session start + Annotations + Focus mode + Settings */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Start session button (only when no active session) */}
            {!session.active && (
              <button
                onClick={() => setShowSessionDialog(true)}
                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Start study session"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </button>
            )}

            {/* Annotations toggle */}
            <button
              onClick={() => {
                setAnnotationsOpen(!annotationsOpen)
                setTocOpen(false)
                setSettingsOpen(false)
              }}
              className={`
                w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-colors
                ${annotationsOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
              `}
              title="Annotations"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>

            {/* Read aloud toggle */}
            <button
              onClick={() => setTtsOpen(!ttsOpen)}
              className={`
                w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-colors
                ${ttsOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
              `}
              title="Read aloud"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            </button>

            {/* Focus mode — hide on very small screens to save space */}
            <button
              onClick={() => setFocusMode(true)}
              className="hidden sm:flex w-10 h-10 sm:w-8 sm:h-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Focus mode (F)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>

            <div className="w-px h-5 bg-border mx-0.5 sm:mx-1" />

            <div className="relative">
              <button
                onClick={() => { setSettingsOpen(!settingsOpen); setTocOpen(false) }}
                className={`
                  w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-colors
                  ${settingsOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
                `}
                title="Reading Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
              </button>

              {/* Settings dropdown — mobile renders its own bottom sheet overlay */}
              {settingsOpen && (
                <>
                  <div className="hidden sm:block fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                  <div className="hidden sm:block absolute right-0 top-10 z-50">
                    <ReadingSettingsPanel
                      settings={settings}
                      onUpdate={updateSettings}
                      onClose={() => setSettingsOpen(false)}
                    />
                  </div>
                  {/* Mobile: rendered at root level by the component itself */}
                  <div className="sm:hidden">
                    <ReadingSettingsPanel
                      settings={settings}
                      onUpdate={updateSettings}
                      onClose={() => setSettingsOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main reading area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TOC sidebar */}
        {tocOpen && !focusMode && (
          <>
            <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setTocOpen(false)} />
            <div className="fixed left-0 top-12 bottom-0 w-72 z-30 lg:relative lg:top-0 lg:z-auto animate-fade-in">
              <TableOfContents
                toc={reader.toc}
                currentChapter={reader.currentChapter}
                onNavigate={(href) => {
                  reader.goToChapter(href)
                  // Close on mobile
                  if (window.innerWidth < 1024) setTocOpen(false)
                }}
                onClose={() => setTocOpen(false)}
              />
            </div>
          </>
        )}

        {/* EPUB container */}
        <div className="flex-1 relative">
          {/* Loading overlay */}
          {reader.loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-ui-sm font-body text-muted-foreground">Rendering book...</p>
            </div>
          )}

          {/* Error state */}
          {reader.error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
              <p className="text-ui-sm font-body text-destructive">{reader.error}</p>
            </div>
          )}

          {/* Epub render target */}
          <div ref={containerRef} className="w-full h-full" />

          {/* Navigation arrows (paginated mode only) — semi-transparent always on touch, hover-reveal on desktop */}
          {settings.viewMode === 'paginated' && !reader.loading && (
            <>
              <button
                onClick={reader.goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-all opacity-40 sm:opacity-0 sm:hover:opacity-100 sm:focus:opacity-100"
                title="Previous page"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={reader.goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-all opacity-40 sm:opacity-0 sm:hover:opacity-100 sm:focus:opacity-100"
                title="Next page"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}

          {/* Focus mode exit hint */}
          {focusMode && (
            <button
              onClick={() => setFocusMode(false)}
              className="absolute top-3 right-3 px-3 py-2 sm:py-1.5 rounded-full bg-background/60 border border-border text-ui-xs font-body text-muted-foreground hover:text-foreground hover:bg-background/90 transition-all opacity-60 sm:opacity-0 sm:hover:opacity-100 backdrop-blur-sm"
            >
              <span className="hidden sm:inline">Press F or click to exit focus mode</span>
              <span className="sm:hidden">Tap to exit focus mode</span>
            </button>
          )}
        </div>

        {/* Annotations sidebar */}
        {annotationsOpen && !focusMode && (
          <AnnotationsSidebar
            highlights={highlightManager.highlights}
            notes={highlightManager.notes}
            bookTitle={book.title}
            bookAuthor={book.author}
            onHighlightClick={(cfiRange) => {
              reader.goToCfi(cfiRange)
            }}
            onDeleteHighlight={(id) => highlightManager.deleteHighlight(id)}
            onAddNote={(data) => highlightManager.createNote(data)}
            onDeleteNote={(id) => highlightManager.deleteNote(id)}
            onExport={() => highlightManager.exportToMarkdown(book.title, book.author)}
            onClose={() => setAnnotationsOpen(false)}
          />
        )}
      </div>

      {/* TTS bar */}
      {ttsOpen && !focusMode && (
        <TtsBar
          supported={tts.supported}
          playing={tts.playing}
          paused={tts.paused}
          voices={tts.voices}
          selectedVoice={tts.selectedVoice}
          rate={tts.rate}
          onPlay={handleTtsPlay}
          onPause={tts.pause}
          onResume={tts.resume}
          onStop={tts.stop}
          onVoiceChange={tts.setVoice}
          onRateChange={tts.setRate}
          onClose={handleTtsClose}
        />
      )}

      {/* Bottom progress bar - hidden in focus mode */}
      {!focusMode && (
        <ProgressBar
          percent={reader.percentComplete}
          chapter={reader.currentChapter}
        />
      )}

      {/* Highlight toolbar (appears on text selection) */}
      {selectionInfo && (
        <HighlightToolbar
          position={{ x: selectionInfo.rect.x + selectionInfo.rect.width / 2, y: selectionInfo.rect.y }}
          onSelectColor={handleCreateHighlight}
          onDismiss={() => {
            setSelectionInfo(null)
            reader.clearSelection()
          }}
        />
      )}

      {/* Highlight popover (appears when clicking existing highlight) */}
      {activeHighlight && (
        <HighlightPopover
          position={{
            x: activeHighlight.rect.x + activeHighlight.rect.width / 2,
            y: activeHighlight.rect.y + activeHighlight.rect.height,
          }}
          highlight={activeHighlight.highlight}
          notes={highlightManager.getNotesForHighlight(activeHighlight.highlight.id)}
          onChangeColor={handleChangeHighlightColor}
          onDelete={handleDeleteHighlight}
          onAddNote={handleAddNoteToHighlight}
          onUpdateNote={(noteId, content) => highlightManager.updateNote(noteId, { content })}
          onDeleteNote={(noteId) => highlightManager.deleteNote(noteId)}
          onDismiss={() => setActiveHighlight(null)}
        />
      )}

      {/* Image lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {/* ─── Session overlays ──────────────────────────── */}

      {/* Start session dialog */}
      {showSessionDialog && (
        <StartSessionDialog
          onStart={handleStartSession}
          onDismiss={() => setShowSessionDialog(false)}
        />
      )}

      {/* AFK modal */}
      {session.showAfkModal && (
        <AfkModal
          onConfirm={session.dismissAfk}
          onEndSession={session.endSession}
        />
      )}

      {/* Break overlay (Pomodoro) */}
      {session.active && session.phase === 'break' && (
        <BreakOverlay
          remainingMs={session.phaseRemainingMs}
          completedPomodoros={session.stats.completedPomodoros}
          onSkip={session.skipBreak}
        />
      )}

      {/* Microbreak reminder */}
      {session.showMicrobreak && (
        <MicrobreakReminder onDismiss={session.dismissMicrobreak} />
      )}

      {/* Session wrap-up screen */}
      {session.showWrapUp && (
        <SessionWrapUp
          stats={session.stats}
          bookTitle={book.title}
          onClose={session.closeWrapUp}
        />
      )}
    </div>
  )
}
