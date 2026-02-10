import { useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Grid3X3,
  List,
  ChevronDown,
  Trash2,
  Upload,
  FilePlus,
  Pencil
} from 'lucide-react'
import { Book, Category, ReadingMode } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { CategorySelect } from '@/components/categories/CategorySelect'
import { ReadingModeSelect } from '@/components/categories/ReadingModeSelect'
import { cn, fileUrl } from '@/lib/utils'

type ViewMode = 'grid' | 'list'
type SortKey = 'title' | 'author' | 'created_at' | 'updated_at'
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'created_at', label: 'Date Added' },
  { key: 'updated_at', label: 'Last Read' }
]

interface LibraryViewProps {
  books: Book[]
  loading: boolean
  categories: Category[]
  onOpenBook: (book: Book) => void
  onDeleteBook: (bookId: string) => void
  onUpdateBook: (bookId: string, data: { category_id?: string | null; reading_mode?: ReadingMode }) => Promise<void>
  onCreateCategory: (data: { name: string; color?: string }) => Promise<Category>
  onImportFile: (filePath: string) => Promise<unknown>
  onImportDialog: () => void
}

export function LibraryView({
  books,
  loading,
  categories,
  onOpenBook,
  onDeleteBook,
  onUpdateBook,
  onCreateCategory,
  onImportFile,
  onImportDialog
}: LibraryViewProps): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [isDragging, setIsDragging] = useState(false)
  const [rejectedDrop, setRejectedDrop] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      let cmp = 0
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) cmp = 0
      else if (av == null) cmp = 1
      else if (bv == null) cmp = -1
      else if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [books, sortKey, sortDir])

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir(key === 'title' || key === 'author' ? 'asc' : 'desc')
      }
    },
    [sortKey]
  )

  const handleDelete = useCallback(
    (bookId: string) => {
      if (confirmDelete === bookId) {
        onDeleteBook(bookId)
        setConfirmDelete(null)
      } else {
        setConfirmDelete(bookId)
        // Auto-dismiss confirmation after 3 seconds
        setTimeout(() => setConfirmDelete((prev) => (prev === bookId ? null : prev)), 3000)
      }
    },
    [confirmDelete, onDeleteBook]
  )

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if we're leaving the drop zone entirely
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const epubFiles = files.filter((f) => f.name.toLowerCase().endsWith('.epub'))

      if (files.length > 0 && epubFiles.length === 0) {
        setRejectedDrop(true)
        setTimeout(() => setRejectedDrop(false), 3000)
        return
      }

      for (const file of epubFiles) {
        const filePath = (file as unknown as { path: string }).path
        if (filePath) {
          await onImportFile(filePath)
        }
      }
    },
    [onImportFile]
  )

  // Get category for a book
  const getCategoryForBook = useCallback(
    (book: Book): Category | undefined => {
      if (!book.category_id) return undefined
      return categories.find((c) => c.id === book.category_id)
    },
    [categories]
  )

  return (
    <div
      ref={dropRef}
      className="flex-1 overflow-y-auto relative scroll-fade"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Premium drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsla(var(--gold), 0.08) 0%, hsla(var(--primary), 0.06) 100%)',
              backdropFilter: 'blur(8px) saturate(1.4)'
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl glass border border-sidebar-gold/30 flex items-center justify-center mx-auto mb-4"
              >
                <Upload className="h-7 w-7 text-sidebar-gold" />
              </motion.div>
              <p className="font-display text-xl italic text-foreground">Drop to add to your library</p>
              <p className="text-ui-xs text-muted-foreground mt-1">EPUB files only</p>
            </motion.div>
            <div className="absolute inset-3 rounded-xl border-2 border-dashed border-sidebar-gold/40 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejected file type notification */}
      <AnimatePresence>
        {rejectedDrop && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg bg-red-500/95 text-white text-ui-sm font-medium shadow-lg backdrop-blur-sm"
          >
            Only .epub files are supported
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* Toolbar */}
        {books.length > 0 && (
          <div className="flex items-center justify-between mb-8">
            <p className="font-body italic text-ui-sm text-muted-foreground">
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </p>

            <div className="flex items-center gap-3">
              {/* Sort dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-ui-sm text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted/50">
                    {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
                    <ChevronDown className={cn(
                      'h-3 w-3 transition-transform duration-200',
                      sortDir === 'asc' && 'rotate-180'
                    )} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuItem key={opt.key} onClick={() => handleSort(opt.key)}>
                      {opt.label}
                      {sortKey === opt.key && (
                        <span className="ml-auto text-ui-sm text-primary font-medium">
                          {sortDir === 'asc' ? '\u2191' : '\u2193'}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View mode toggle — pill with sliding indicator */}
              <div className="view-toggle">
                <div
                  className="view-toggle-indicator"
                  style={{
                    left: viewMode === 'grid' ? '2px' : '50%',
                    right: viewMode === 'list' ? '2px' : '50%'
                  }}
                />
                <button
                  className="view-toggle-btn"
                  data-active={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button
                  className="view-toggle-btn"
                  data-active={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-40"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
              />
            </motion.div>
          ) : books.length === 0 ? (
            <LibraryEmptyState onImportDialog={onImportDialog} />
          ) : viewMode === 'grid' ? (
            <GridView
              key="grid"
              books={sortedBooks}
              onOpenBook={onOpenBook}
              onDeleteBook={handleDelete}
              onEditBook={setEditingBook}
              confirmDelete={confirmDelete}
              getCategoryForBook={getCategoryForBook}
            />
          ) : (
            <ListView
              key="list"
              books={sortedBooks}
              onOpenBook={onOpenBook}
              onDeleteBook={handleDelete}
              onEditBook={setEditingBook}
              confirmDelete={confirmDelete}
              getCategoryForBook={getCategoryForBook}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Book Edit Dialog */}
      {editingBook && (
        <BookEditDialog
          book={editingBook}
          categories={categories}
          onCreateCategory={onCreateCategory}
          onSave={async (data) => {
            await onUpdateBook(editingBook.id, data)
            setEditingBook(null)
          }}
          onClose={() => setEditingBook(null)}
        />
      )}
    </div>
  )
}

// ─── Grid View ───────────────────────────────────────────

function GridView({
  books,
  onOpenBook,
  onDeleteBook,
  onEditBook,
  confirmDelete,
  getCategoryForBook
}: {
  books: Book[]
  onOpenBook: (book: Book) => void
  onDeleteBook: (bookId: string) => void
  onEditBook: (book: Book) => void
  confirmDelete: string | null
  getCategoryForBook: (book: Book) => Category | undefined
}): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6"
    >
      {books.map((book, i) => {
        const category = getCategoryForBook(book)
        return (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
            className="group relative"
          >
            <button
              onClick={() => onOpenBook(book)}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              {/* Book cover with 3D effect */}
              <div className="book-cover aspect-[2/3] bg-gradient-to-br from-primary/10 to-primary/20 mb-3 flex items-center justify-center relative">
                {book.cover_path ? (
                  <img
                    src={fileUrl(book.cover_path!)}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-8 w-8 text-primary/40" />
                )}
                {/* Category badge */}
                {category && category.id !== 'uncategorized' && (
                  <span
                    className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-xs font-medium text-white backdrop-blur-sm"
                    style={{ backgroundColor: (category.color || '#6b7280') + 'bb' }}
                  >
                    {category.name}
                  </span>
                )}
                {/* Hover info overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <div className="text-white/90">
                    <p className="text-xs font-mono">
                      {new Date(book.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <p className="font-body font-medium text-ui-sm text-foreground truncate group-hover:text-primary transition-colors duration-300">
                {book.title}
              </p>
              {book.author && (
                <p className="text-ui-sm italic text-muted-foreground truncate">{book.author}</p>
              )}
            </button>

            {/* Action buttons — frosted glass */}
            <div className="absolute top-2 left-2 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditBook(book)
                }}
                className="p-1.5 rounded-md transition-all duration-200 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 backdrop-blur-md bg-background/80 border border-border/50 text-muted-foreground hover:text-primary"
                title="Edit category"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteBook(book.id)
                }}
                className={cn(
                  'p-1.5 rounded-md transition-all duration-200',
                  confirmDelete === book.id
                    ? 'bg-red-500 text-white opacity-100 scale-100'
                    : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 backdrop-blur-md bg-background/80 border border-border/50 text-muted-foreground hover:text-destructive'
                )}
                title={confirmDelete === book.id ? 'Click again to confirm' : 'Delete'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ─── List View ───────────────────────────────────────────

function ListView({
  books,
  onOpenBook,
  onDeleteBook,
  onEditBook,
  confirmDelete,
  getCategoryForBook
}: {
  books: Book[]
  onOpenBook: (book: Book) => void
  onDeleteBook: (bookId: string) => void
  onEditBook: (book: Book) => void
  confirmDelete: string | null
  getCategoryForBook: (book: Book) => Category | undefined
}): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-0"
    >
      {books.map((book, i) => {
        const category = getCategoryForBook(book)
        return (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }}
            className={cn(
              'group flex items-center gap-4 p-3 rounded-lg transition-all duration-200',
              'border-l-2 border-transparent hover:border-l-primary',
              'hover:bg-primary/[0.02]'
            )}
          >
            {/* Cover thumbnail */}
            <button
              onClick={() => onOpenBook(book)}
              className="flex items-center gap-4 flex-1 min-w-0 text-left focus:outline-none"
            >
              <div className="w-10 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-sm flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {book.cover_path ? (
                  <img
                    src={fileUrl(book.cover_path!)}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-4 w-4 text-primary/40" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-ui-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200">
                  {book.title}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-ui-sm italic text-muted-foreground truncate">
                    {book.author || 'Unknown author'}
                  </p>
                  {/* Category tag */}
                  {category && category.id !== 'uncategorized' && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
                      style={{ backgroundColor: (category.color || '#6b7280') + 'cc' }}
                    >
                      {category.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <span className="text-xs font-mono text-muted-foreground shrink-0 hidden sm:block tabular-nums">
                {new Date(book.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </button>

            {/* Edit button */}
            <button
              onClick={() => onEditBook(book)}
              className="p-1.5 rounded-md transition-all shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10"
              title="Edit category"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            {/* Delete button */}
            <button
              onClick={() => onDeleteBook(book.id)}
              className={cn(
                'p-1.5 rounded-md transition-all shrink-0',
                confirmDelete === book.id
                  ? 'bg-red-500 text-white'
                  : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10'
              )}
              title={confirmDelete === book.id ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ─── Book Edit Dialog ──────────────────────────────────────

function BookEditDialog({
  book,
  categories,
  onCreateCategory,
  onSave,
  onClose
}: {
  book: Book
  categories: Category[]
  onCreateCategory: (data: { name: string; color?: string }) => Promise<Category>
  onSave: (data: { category_id?: string | null; reading_mode?: ReadingMode }) => Promise<void>
  onClose: () => void
}): JSX.Element {
  const [categoryId, setCategoryId] = useState<string | null>(book.category_id)
  const [readingMode, setReadingMode] = useState<ReadingMode>(book.reading_mode)

  const handleSave = async (): Promise<void> => {
    await onSave({ category_id: categoryId, reading_mode: readingMode })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit book details</DialogTitle>
          <DialogDescription className="truncate">
            {book.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category selection */}
          <div className="space-y-2">
            <label className="text-ui-sm font-medium">Category</label>
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCreateCategory={onCreateCategory}
              className="w-full"
            />
          </div>

          {/* Reading mode */}
          <div className="space-y-2">
            <label className="text-ui-sm font-medium">Reading mode</label>
            <ReadingModeSelect value={readingMode} onChange={setReadingMode} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empty State ─────────────────────────────────────────

function LibraryEmptyState({ onImportDialog }: { onImportDialog: () => void }): JSX.Element {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/[0.06] border border-primary/10 flex items-center justify-center mb-5">
        <BookOpen className="h-7 w-7 text-primary/30" />
      </div>
      <h2 className="font-display text-2xl text-foreground mb-2">Your library is empty</h2>
      <p className="text-ui-sm text-muted-foreground mb-8 max-w-xs">
        Import an EPUB file or drag and drop to get started
      </p>
      {/* Import zone */}
      <button
        onClick={onImportDialog}
        className={cn(
          'flex flex-col items-center gap-3 px-12 py-8 rounded-xl',
          'border-2 border-dashed border-sidebar-gold/30',
          'hover:border-sidebar-gold/60 hover:bg-sidebar-gold/[0.04]',
          'hover:shadow-[0_4px_20px_-4px_hsla(var(--gold),0.10)]',
          'transition-all duration-300 group'
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-sidebar-gold/10 flex items-center justify-center group-hover:bg-sidebar-gold/15 transition-colors">
          <FilePlus className="h-5 w-5 text-sidebar-gold group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span className="font-body text-ui-sm font-medium text-sidebar-gold">Import EPUB</span>
      </button>
    </motion.div>
  )
}
