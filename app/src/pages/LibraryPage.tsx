import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLibrary } from '@/hooks/useLibrary'
import { ImportDialog, BookCard } from '@/components/library'
import type { ReadingMode } from '@/types'

export function LibraryPage() {
  const {
    books,
    allBooks,
    categories,
    loading,
    error,
    filters,
    setFilters,
    upload,
    uploading,
    uploadProgress,
    deleteBook,
  } = useLibrary()

  const [searchParams, setSearchParams] = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  // Open import dialog from URL param (e.g. navigated from TopBar)
  useEffect(() => {
    if (searchParams.get('import') === 'true') {
      setImportOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Listen for custom event from TopBar Import button
  useEffect(() => {
    const handler = () => setImportOpen(true)
    window.addEventListener('flareread:open-import', handler)
    return () => window.removeEventListener('flareread:open-import', handler)
  }, [])

  const handleImport = useCallback(
    async (file: File, categoryId: string | null, readingMode: ReadingMode) => {
      const result = await upload({ file, categoryId, readingMode })
      if (result.isDuplicate) {
        setDuplicateWarning(`"${result.book.title}" is already in your library.`)
        setTimeout(() => setDuplicateWarning(null), 4000)
      }
    },
    [upload]
  )

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Library
          </h2>
          <p className="text-ui-sm text-muted-foreground font-body mt-0.5">
            {allBooks.length === 0
              ? 'No books yet. Import your first EPUB to get started.'
              : `${allBooks.length} book${allBooks.length !== 1 ? 's' : ''} in your library`}
          </p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Import Book
        </button>
      </div>

      {/* Filters bar */}
      {allBooks.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or author..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category filter */}
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value || null }))}
            className="rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Reading mode filter */}
          <select
            value={filters.readingMode ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                readingMode: (e.target.value || null) as ReadingMode,
              }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All modes</option>
            <option value="study">Study</option>
            <option value="leisure">Leisure</option>
          </select>
        </div>
      )}

      {/* Duplicate warning toast */}
      {duplicateWarning && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-gold/10 border border-gold/20 text-ui-sm font-body text-foreground animate-fade-in">
          <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {duplicateWarning}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive text-ui-sm font-body">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-ui-sm font-body">Loading library...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && allBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h3 className="text-ui-lg font-body font-medium text-foreground mb-1">
            Your library is empty
          </h3>
          <p className="text-ui-sm text-muted-foreground font-body mb-4 max-w-sm">
            Import an EPUB to start reading. You can drag and drop files or use the import button.
          </p>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Import your first book
          </button>
        </div>
      )}

      {/* No results for filters */}
      {!loading && allBooks.length > 0 && books.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-ui-sm text-muted-foreground font-body">
            No books match your current filters.
          </p>
          <button
            onClick={() => setFilters({ categoryId: null, readingMode: null, search: '' })}
            className="mt-2 text-ui-sm font-body text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Book grid */}
      {!loading && books.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onDelete={() => deleteBook(book)}
            />
          ))}
        </div>
      )}

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        categories={categories}
        uploading={uploading}
        uploadProgress={uploadProgress}
        onImport={handleImport}
      />
    </div>
  )
}
