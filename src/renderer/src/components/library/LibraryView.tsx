import { useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Grid3X3,
  List,
  ArrowUpDown,
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
      className="flex-1 overflow-y-auto relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-[2px]"
          >
            <div className="text-center">
              <Upload className="h-10 w-10 text-primary mx-auto mb-3" />
              <p className="text-ui-base font-medium text-primary">Drop EPUB files to import</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejected file type notification */}
      <AnimatePresence>
        {rejectedDrop && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-500 text-white text-ui-sm font-medium shadow-lg"
          >
            Only .epub files are supported
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* Toolbar */}
        {books.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-ui-sm text-muted-foreground">
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </p>

            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-ui-xs">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuItem key={opt.key} onClick={() => handleSort(opt.key)}>
                      {opt.label}
                      {sortKey === opt.key && (
                        <span className="ml-auto text-ui-xs text-muted-foreground">
                          {sortDir === 'asc' ? '\u2191' : '\u2193'}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View mode toggle */}
              <div className="flex border border-border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-2 rounded-r-none',
                    viewMode === 'grid' && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-2 rounded-l-none',
                    viewMode === 'list' && 'bg-accent text-accent-foreground'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
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
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
      transition={{ duration: 0.15 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
    >
      {books.map((book, i) => {
        const category = getCategoryForBook(book)
        return (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.03 }}
            className="group relative"
          >
            <button
              onClick={() => onOpenBook(book)}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <div className="aspect-[2/3] bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg mb-2 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow relative">
                {book.cover_path ? (
                  <img
                    src={fileUrl(book.cover_path!)}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-8 w-8 text-primary/40" />
                )}
                {/* Uncategorized badge */}
                {!book.category_id && (
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/80 text-white">
                    Uncategorized
                  </span>
                )}
                {/* Category badge */}
                {category && category.id !== 'uncategorized' && (
                  <span
                    className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: (category.color || '#6b7280') + 'cc' }}
                  >
                    {category.name}
                  </span>
                )}
              </div>
              <p className="text-ui-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {book.title}
              </p>
              {book.author && (
                <p className="text-ui-xs text-muted-foreground truncate">{book.author}</p>
              )}
            </button>

            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditBook(book)
                }}
                className="p-1.5 rounded-md transition-all bg-black/50 text-white opacity-0 group-hover:opacity-100"
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
                  'p-1.5 rounded-md transition-all',
                  confirmDelete === book.id
                    ? 'bg-red-500 text-white opacity-100'
                    : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
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
      transition={{ duration: 0.15 }}
      className="space-y-1"
    >
      {books.map((book, i) => {
        const category = getCategoryForBook(book)
        return (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: i * 0.02 }}
            className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
          >
            {/* Cover thumbnail */}
            <button
              onClick={() => onOpenBook(book)}
              className="flex items-center gap-4 flex-1 min-w-0 text-left focus:outline-none"
            >
              <div className="w-10 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
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
                <p className="text-ui-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {book.title}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-ui-xs text-muted-foreground truncate">
                    {book.author || 'Unknown author'}
                  </p>
                  {/* Category tag */}
                  {!book.category_id && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0">
                      Uncategorized
                    </span>
                  )}
                  {category && category.id !== 'uncategorized' && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white shrink-0"
                      style={{ backgroundColor: category.color || '#6b7280' }}
                    >
                      {category.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <span className="text-ui-xs text-muted-foreground shrink-0 hidden sm:block">
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <p className="text-ui-lg text-foreground mb-2">Your library is empty</p>
      <p className="text-ui-sm text-muted-foreground mb-6">
        Import an EPUB file or drag and drop to get started
      </p>
      <Button onClick={onImportDialog} className="gap-2">
        <FilePlus className="h-4 w-4" />
        Import EPUB
      </Button>
    </motion.div>
  )
}
