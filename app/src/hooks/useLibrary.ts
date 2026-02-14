import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { booksService, categoriesService } from '@/services'
import { uploadBook, deleteBookWithStorage, getCoverUrl } from '@/services/upload'
import type { BookDoc, CategoryDoc, ReadingMode } from '@/types'
import type { UploadBookOptions } from '@/services/upload'

export interface LibraryFilters {
  categoryId: string | null // null = all
  readingMode: ReadingMode // null = all
  search: string
}

export interface BookWithCover extends BookDoc {
  coverUrl: string | null
}

export function useLibrary() {
  const { user } = useAuth()
  const uid = user?.uid

  const [books, setBooks] = useState<BookWithCover[]>([])
  const [categories, setCategories] = useState<CategoryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<LibraryFilters>({
    categoryId: null,
    readingMode: null,
    search: '',
  })

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  // Fetch books and resolve cover URLs
  const fetchBooks = useCallback(async () => {
    if (!uid) return
    try {
      setLoading(true)
      setError(null)
      const [allBooks, allCategories] = await Promise.all([
        booksService.getAll(uid),
        categoriesService.getAll(uid),
      ])

      // Resolve cover URLs in parallel
      const booksWithCovers = await Promise.all(
        allBooks.map(async (book) => {
          let coverUrl: string | null = null
          if (book.coverStoragePath) {
            try {
              coverUrl = await getCoverUrl(book.coverStoragePath)
            } catch {
              // Cover might not exist
            }
          }
          return { ...book, coverUrl }
        })
      )

      setBooks(booksWithCovers)
      setCategories(allCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Category filter
      if (filters.categoryId && book.categoryId !== filters.categoryId) return false
      // Reading mode filter
      if (filters.readingMode && book.readingMode !== filters.readingMode) return false
      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchTitle = book.title.toLowerCase().includes(q)
        const matchAuthor = book.author?.toLowerCase().includes(q)
        if (!matchTitle && !matchAuthor) return false
      }
      return true
    })
  }, [books, filters])

  // Upload a book
  const upload = useCallback(
    async (options: Omit<UploadBookOptions, 'onProgress'>) => {
      if (!uid) throw new Error('Not authenticated')
      setUploading(true)
      setUploadProgress(null)
      try {
        const result = await uploadBook(uid, {
          ...options,
          onProgress: setUploadProgress,
        })

        if (!result.isDuplicate) {
          // Resolve cover URL for the new book
          let coverUrl: string | null = null
          if (result.book.coverStoragePath) {
            try {
              coverUrl = await getCoverUrl(result.book.coverStoragePath)
            } catch {
              // OK
            }
          }
          setBooks((prev) => [{ ...result.book, coverUrl }, ...prev])
        }

        return result
      } finally {
        setUploading(false)
        setUploadProgress(null)
      }
    },
    [uid]
  )

  // Delete a book
  const deleteBook = useCallback(
    async (book: BookDoc) => {
      if (!uid) return
      await deleteBookWithStorage(uid, book)
      setBooks((prev) => prev.filter((b) => b.id !== book.id))
    },
    [uid]
  )

  return {
    books: filteredBooks,
    allBooks: books,
    categories,
    loading,
    error,
    filters,
    setFilters,
    upload,
    uploading,
    uploadProgress,
    deleteBook,
    refresh: fetchBooks,
  }
}
