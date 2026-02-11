import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { ReaderView } from '@/components/reader/ReaderView'
import { AppShell, TopBar } from '@/components/layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { LibraryView } from '@/components/library/LibraryView'
import { NotesView } from '@/components/notes/NotesView'
import { SessionsView } from '@/components/session'
import { CommandPalette } from '@/components/CommandPalette'
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog'
import { ReentryRecap } from '@/components/recap/ReentryRecap'
import { SettingsView, FirstRunWizard } from '@/components/settings'
import { SoundscapeMiniPlayer } from '@/components/soundscape'
import { GoalsView } from '@/components/goals/GoalsView'
import { AnimatePresence, motion } from 'framer-motion'
import { Book, ImportResponse, ParsedEpubMeta, ReadingMode } from '@/types'
import { useRecap } from '@/hooks/useRecap'
import { useSettings, type AppSettings } from '@/hooks/useSettings'
import { useStudySession } from '@/hooks/useStudySession'
import { useAmbientSounds } from '@/hooks/useAmbientSounds'
import { useCategories } from '@/hooks/useCategories'
import { ImportCategoryDialog } from '@/components/import/ImportCategoryDialog'
import type { NavPage } from '@/components/layout/Sidebar'

type View =
  | { type: 'home'; page: NavPage }
  | { type: 'reader'; book: Book }
  | { type: 'recap'; book: Book }

const PAGE_TITLES: Record<NavPage, string> = {
  dashboard: 'Dashboard',
  library: 'Library',
  sessions: 'Sessions',
  notes: 'Notes',
  goals: 'Learning Goals',
  settings: 'Settings'
}

// Toast notification state
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

function App(): JSX.Element {
  const [view, setView] = useState<View>({ type: 'home', page: 'dashboard' })
  const [books, setBooks] = useState<Book[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [importCount, setImportCount] = useState(0)
  const { settings, setSetting, setMultiple, loaded: settingsLoaded } = useSettings()
  const {
    isBookStale,
    getRecapForBook,
    staleBooks,
    staleBooksLoading,
    refreshStaleBooks,
    inactivityDays,
    updateInactivityDays
  } = useRecap()

  // Categories
  const { categories, createCategory } = useCategories()

  // Pending import (shown in category dialog between parse and save)
  const [pendingImport, setPendingImport] = useState<ParsedEpubMeta | null>(null)

  // Study session (for soundscape AFK integration)
  const { session } = useStudySession()

  // Ambient soundscapes
  const ambientSounds = useAmbientSounds(session, settings['soundscape:autoPauseOnAfk'])

  // ─── TTS Install Prompt ─────────────────────────────
  const [showTtsSetup, setShowTtsSetup] = useState(false)
  const [ttsInstalled, setTtsInstalled] = useState<boolean | null>(null)
  const [ttsInstalling, setTtsInstalling] = useState(false)
  const [ttsProgress, setTtsProgress] = useState<{ percent: number; label: string } | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    window.ttsApi
      .isInstalled()
      .then((installed) => {
        setTtsInstalled(installed)
        if (!installed && !localStorage.getItem('flareread-tts-dismissed')) {
          timer = setTimeout(() => setShowTtsSetup(true), 1500)
        }
      })
      .catch(() => {
        // If check fails, still offer install
        setTtsInstalled(false)
        timer = setTimeout(() => setShowTtsSetup(true), 1500)
      })

    const cleanupProgress = window.ttsApi.onDownloadProgress((data) => {
      setTtsProgress(data)
      if (data.percent >= 100) {
        setTimeout(() => {
          setTtsProgress(null)
          setTtsInstalling(false)
          setTtsInstalled(true)
          setShowTtsSetup(false)
        }, 1500)
      }
    })

    return () => {
      if (timer) clearTimeout(timer)
      cleanupProgress()
    }
  }, [])

  const handleTtsInstall = useCallback(async () => {
    setTtsInstalling(true)
    try {
      await window.ttsApi.install()
      setTtsInstalled(true)
      setShowTtsSetup(false)
    } catch {
      setTtsInstalling(false)
    }
  }, [])

  const handleTtsDismiss = useCallback(() => {
    localStorage.setItem('flareread-tts-dismissed', '1')
    setShowTtsSetup(false)
  }, [])

  // Show first-run wizard if not completed
  useEffect(() => {
    if (settingsLoaded && !settings['wizard:completed']) {
      setShowWizard(true)
    }
  }, [settingsLoaded, settings])

  // Auto-confirm window close when not in reader (no protected mode)
  useEffect(() => {
    if (view.type !== 'reader') {
      const cleanup = window.appApi.onCloseRequested(() => {
        window.appApi.confirmClose()
      })
      return cleanup
    }
  }, [view.type])

  // Ctrl+, keyboard shortcut for settings
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setView({ type: 'home', page: 'settings' })
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // M key to toggle mute (when not focused on an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'm' || e.key === 'M') {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
        if (e.metaKey || e.ctrlKey || e.altKey) return
        ambientSounds.toggleMute()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [ambientSounds])

  const handleWizardComplete = useCallback((choices: Partial<AppSettings>) => {
    setMultiple(choices)
    setShowWizard(false)
  }, [setMultiple])

  const handleWizardSkip = useCallback(() => {
    setSetting('wizard:completed', true)
    setShowWizard(false)
  }, [setSetting])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true)
    const result = (await window.api.books.getAll()) as Book[]
    setBooks(result)
    setLoadingBooks(false)
  }, [])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  // Handle import result (shared across all import methods)
  const handleImportResult = useCallback(
    (result: ImportResponse) => {
      if (!result) return // User cancelled
      if (result.success) {
        setBooks((prev) => [result.book, ...prev])
        setImportCount((c) => c + 1)
        addToast(`"${result.book.title}" imported successfully`)
        return result.book
      } else {
        if (result.code === 'DUPLICATE') {
          addToast(result.error, 'warning')
        } else {
          addToast(result.error, 'error')
        }
        return null
      }
    },
    [addToast]
  )

  // Handle parse result - show dialog or report error
  const handleParseResult = useCallback(
    (result: unknown): void => {
      if (!result) return // User cancelled
      const parsed = result as { success: boolean; meta?: ParsedEpubMeta; error?: string; code?: string }
      if (parsed.success && parsed.meta) {
        setPendingImport(parsed.meta)
      } else if (!parsed.success) {
        if (parsed.code === 'DUPLICATE') {
          addToast(parsed.error || 'Duplicate book', 'warning')
        } else {
          addToast(parsed.error || 'Failed to parse EPUB', 'error')
        }
      }
    },
    [addToast]
  )

  // Import via file dialog (Ctrl+O / menu / button) - two-step: parse → dialog → save
  const handleImportDialog = useCallback(async () => {
    const result = await window.appApi.parseEpubDialog()
    handleParseResult(result)
  }, [handleParseResult])

  // Import a specific file path (from drag-and-drop) - two-step: parse → dialog → save
  const handleImportFile = useCallback(
    async (filePath: string) => {
      const result = await window.appApi.parseEpub(filePath)
      handleParseResult(result)
      return undefined // drag-drop doesn't need the book returned
    },
    [handleParseResult]
  )

  // Confirm import with category and reading mode
  const handleImportConfirm = useCallback(
    async (options: { categoryId: string | null; readingMode: ReadingMode }) => {
      if (!pendingImport) return
      const result = (await window.appApi.importEpub(pendingImport.filePath, {
        categoryId: options.categoryId ?? undefined,
        readingMode: options.readingMode
      })) as ImportResponse
      setPendingImport(null)
      handleImportResult(result)
    },
    [pendingImport, handleImportResult]
  )

  // Skip category selection - import without category
  const handleImportSkip = useCallback(async () => {
    if (!pendingImport) return
    const result = (await window.appApi.importEpub(pendingImport.filePath)) as ImportResponse
    setPendingImport(null)
    handleImportResult(result)
  }, [pendingImport, handleImportResult])

  const handleBack = useCallback(() => {
    setView({ type: 'home', page: 'dashboard' })
    loadBooks()
    refreshStaleBooks()
  }, [loadBooks, refreshStaleBooks])

  const handleNavigate = useCallback((page: NavPage) => {
    setView({ type: 'home', page })
  }, [])

  // Listen for menu events from main process
  useEffect(() => {
    const cleanups = [
      window.appApi.onMenuImportEpub(() => {
        handleImportDialog()
      }),
      window.appApi.onMenuCloseBook(() => {
        if (view.type === 'reader' || view.type === 'recap') {
          handleBack()
        }
      }),
      window.appApi.onMenuAbout(() => {
        addToast('FlareRead — A focused e-book reader', 'success')
      }),
      window.appApi.onMenuKeyboardShortcuts(() => {
        setShowShortcutsDialog(true)
      }),
      window.appApi.onMenuToggleSoundscapes(() => {
        ambientSounds.toggleOpen()
      })
    ]
    return () => cleanups.forEach((fn) => fn())
  }, [handleImportDialog, view.type, handleBack, addToast, ambientSounds])

  const handleOpenBook = useCallback(
    async (book: Book) => {
      const stale = await isBookStale(book.id)
      if (stale) {
        setView({ type: 'recap', book })
      } else {
        setView({ type: 'reader', book })
      }
    },
    [isBookStale]
  )

  const handleOpenBookById = useCallback(
    async (bookId: string) => {
      const book = (await window.api.books.getById(bookId)) as Book | null
      if (book) {
        const stale = await isBookStale(book.id)
        if (stale) {
          setView({ type: 'recap', book })
        } else {
          setView({ type: 'reader', book })
        }
      }
    },
    [isBookStale]
  )

  const handleDeleteBook = useCallback(
    async (bookId: string) => {
      await window.appApi.deleteBook(bookId)
      setBooks((prev) => prev.filter((b) => b.id !== bookId))
      addToast('Book removed from library')
    },
    [addToast]
  )

  const handleUpdateBook = useCallback(
    async (bookId: string, data: { category_id?: string | null; reading_mode?: ReadingMode }) => {
      const updated = (await window.api.books.update(bookId, data)) as Book
      setBooks((prev) => prev.map((b) => (b.id === bookId ? updated : b)))
    },
    []
  )

  const currentPage = view.type === 'home' ? view.page : 'dashboard'

  return (
    <>
      {/* First-run wizard overlay */}
      {showWizard && (
        <FirstRunWizard
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
        />
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showShortcutsDialog && (
        <KeyboardShortcutsDialog onClose={() => setShowShortcutsDialog(false)} />
      )}

      {/* Command Palette - always available via Ctrl+K */}
      <CommandPalette
        books={books}
        onOpenBook={handleOpenBook}
        onNavigate={handleNavigate}
        onImportDialog={handleImportDialog}
      />

      {/* Ambient Soundscapes Mini-Player - always available */}
      <SoundscapeMiniPlayer sounds={ambientSounds} />

      {/* Import Category Dialog - shown after EPUB parse, before save */}
      {pendingImport && (
        <ImportCategoryDialog
          open={!!pendingImport}
          meta={pendingImport}
          categories={categories}
          onCreateCategory={createCategory}
          onConfirm={handleImportConfirm}
          onSkip={handleImportSkip}
        />
      )}

      {/* Recap view - shown before reader for stale books */}
      {view.type === 'recap' ? (
        <ReentryRecap
          book={view.book}
          getRecapData={getRecapForBook}
          onContinue={() => setView({ type: 'reader', book: view.book })}
          onDismiss={() => setView({ type: 'reader', book: view.book })}
        />
      ) : /* Reader view - full screen, no shell */
      view.type === 'reader' ? (
        <ReaderView bookId={view.book.id} filePath={view.book.file_path} onBack={handleBack} />
      ) : (
        <AppShell activePage={currentPage} onNavigate={handleNavigate}>
          {currentPage !== 'settings' && (
            <TopBar
              breadcrumbs={[{ label: PAGE_TITLES[currentPage] }]}
              actions={
                <button
                  onClick={handleImportDialog}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-ui-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 import-btn"
                >
                  <Plus className="h-4 w-4 text-primary transition-transform duration-200 group-hover:rotate-90" />
                  <span className="relative">
                    Import
                    <span className="absolute left-0 -bottom-0.5 w-0 h-[1px] bg-primary/50 transition-all duration-300 group-hover:w-full" />
                  </span>
                </button>
              }
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex-1 flex flex-col min-h-0"
            >
              {currentPage === 'settings' && (
                <>
                  <TopBar
                    breadcrumbs={[{ label: 'Settings' }]}
                  />
                  <SettingsView
                    settings={settings}
                    onSetSetting={setSetting}
                  />
                </>
              )}

              {currentPage === 'dashboard' && (
                <Dashboard
                  onOpenBook={handleOpenBook}
                  onImportEpub={handleImportDialog}
                  onImportFile={handleImportFile}
                  staleBooks={staleBooks}
                  staleBooksLoading={staleBooksLoading}
                  inactivityDays={inactivityDays}
                  onUpdateInactivityDays={updateInactivityDays}
                  onNavigateGoals={() => handleNavigate('goals')}
                  refreshTrigger={importCount}
                />
              )}

              {currentPage === 'library' && (
                <LibraryView
                  books={books}
                  loading={loadingBooks}
                  categories={categories}
                  onOpenBook={handleOpenBook}
                  onDeleteBook={handleDeleteBook}
                  onUpdateBook={handleUpdateBook}
                  onCreateCategory={createCategory}
                  onImportFile={handleImportFile}
                  onImportDialog={handleImportDialog}
                />
              )}

              {currentPage === 'sessions' && (
                <SessionsView onOpenBook={handleOpenBookById} />
              )}

              {currentPage === 'notes' && (
                <NotesView onOpenBook={handleOpenBookById} />
              )}

              {currentPage === 'goals' && (
                <GoalsView />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Toast notifications */}
          <div className="fixed bottom-16 right-4 z-50 flex flex-col gap-2">
            <AnimatePresence>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`px-4 py-3 rounded-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)] backdrop-blur-lg text-ui-sm font-medium border ${
                    toast.type === 'success'
                      ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/20'
                      : toast.type === 'warning'
                        ? 'bg-amber-950/90 text-amber-100 border-amber-500/20'
                        : 'bg-red-950/90 text-red-100 border-red-500/20'
                  }`}
                >
                  {toast.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </AppShell>
      )}

      {/* TTS Install Prompt (one-time, app-level) */}
      {showTtsSetup && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-popover/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5">Lectura en voz alta</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {ttsInstalling
                  ? ttsProgress?.label || 'Instalando Kokoro TTS...'
                  : 'Escucha tus libros con voz natural, totalmente offline. Se descargara Kokoro TTS (~90 MB).'}
              </p>
              {ttsInstalling && ttsProgress && (
                <div className="mb-3 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${ttsProgress.percent}%` }}
                  />
                </div>
              )}
              {!ttsInstalling && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTtsInstall}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Instalar ahora
                  </button>
                  <button
                    onClick={handleTtsDismiss}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    No mostrar mas
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowTtsSetup(false)}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
