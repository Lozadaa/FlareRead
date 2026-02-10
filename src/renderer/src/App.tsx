import { useState, useCallback, useEffect } from 'react'
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

  // Show first-run wizard if not completed
  useEffect(() => {
    if (settingsLoaded && !settings['wizard:completed']) {
      setShowWizard(true)
    }
  }, [settingsLoaded, settings])

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
        addToast('JustRead — A focused e-book reader', 'success')
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
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
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
    </>
  )
}

export default App
