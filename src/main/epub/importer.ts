import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync, writeFileSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import { parseEpub, EpubMetadata } from './parser'
import { getDatabase } from '../database'

export interface ImportResult {
  success: true
  book: {
    id: string
    title: string
    author: string | null
    cover_path: string | null
    file_path: string
    total_words_estimate: number | null
    description: string | null
    language: string | null
    category_id: string | null
    reading_mode: string | null
    created_at: string
    updated_at: string
  }
}

export interface ImportError {
  success: false
  error: string
  code: 'INVALID_EPUB' | 'DUPLICATE' | 'FILE_NOT_FOUND' | 'UNKNOWN'
}

export type ImportResponse = ImportResult | ImportError

export interface ParseResult {
  success: true
  meta: {
    filePath: string
    title: string
    author: string | null
    description: string | null
    language: string | null
    estimatedWordCount: number
    hasCover: boolean
  }
}

export type ParseResponse = ParseResult | ImportError

function getBooksDir(): string {
  const dir = join(app.getPath('userData'), 'books')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getCoversDir(): string {
  const dir = join(app.getPath('userData'), 'covers')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Parse an EPUB file without importing it.
 * Returns metadata for the import category dialog.
 */
export function parseEpubFile(sourcePath: string): ParseResponse {
  if (!existsSync(sourcePath)) {
    return { success: false, error: 'File not found', code: 'FILE_NOT_FOUND' }
  }

  const db = getDatabase()

  const existingByPath = db
    .prepare('SELECT * FROM books WHERE file_path LIKE ? OR original_path = ?')
    .get(`%${sourcePath.split(/[\\/]/).pop()}`, sourcePath)

  if (existingByPath) {
    return { success: false, error: 'This book has already been imported', code: 'DUPLICATE' }
  }

  let metadata: EpubMetadata
  try {
    metadata = parseEpub(sourcePath)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error parsing EPUB'
    return { success: false, error: msg, code: 'INVALID_EPUB' }
  }

  if (metadata.title && metadata.author) {
    const existingByMeta = db
      .prepare('SELECT id FROM books WHERE title = ? AND author = ?')
      .get(metadata.title, metadata.author)
    if (existingByMeta) {
      return {
        success: false,
        error: `"${metadata.title}" by ${metadata.author} is already in your library`,
        code: 'DUPLICATE'
      }
    }
  }

  return {
    success: true,
    meta: {
      filePath: sourcePath,
      title: metadata.title,
      author: metadata.author,
      description: metadata.description,
      language: metadata.language,
      estimatedWordCount: metadata.estimatedWordCount,
      hasCover: !!(metadata.coverImageData && metadata.coverImageExt)
    }
  }
}

/**
 * Import an EPUB file:
 * 1. Check for duplicates (by original file path hash or title+author)
 * 2. Parse metadata and cover
 * 3. Copy EPUB to app data directory
 * 4. Save cover image to covers directory
 * 5. Create database record
 */
export function importEpub(
  sourcePath: string,
  options?: { categoryId?: string; readingMode?: string | null }
): ImportResponse {
  // Check file exists
  if (!existsSync(sourcePath)) {
    return { success: false, error: 'File not found', code: 'FILE_NOT_FOUND' }
  }

  const db = getDatabase()

  // Check for duplicate by original source path or by stored file
  // We store the original path in a separate column for duplicate detection
  const existingByPath = db
    .prepare('SELECT * FROM books WHERE file_path LIKE ? OR original_path = ?')
    .get(`%${sourcePath.split(/[\\/]/).pop()}`, sourcePath)

  if (existingByPath) {
    return {
      success: false,
      error: 'This book has already been imported',
      code: 'DUPLICATE'
    }
  }

  // Parse the EPUB
  let metadata: EpubMetadata
  try {
    metadata = parseEpub(sourcePath)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error parsing EPUB'
    return { success: false, error: msg, code: 'INVALID_EPUB' }
  }

  // Check for duplicate by title + author
  if (metadata.title && metadata.author) {
    const existingByMeta = db
      .prepare('SELECT id FROM books WHERE title = ? AND author = ?')
      .get(metadata.title, metadata.author)
    if (existingByMeta) {
      return {
        success: false,
        error: `"${metadata.title}" by ${metadata.author} is already in your library`,
        code: 'DUPLICATE'
      }
    }
  }

  const bookId = randomUUID()
  const now = new Date().toISOString()

  // Copy EPUB to app data directory
  const fileName = `${bookId}.epub`
  const destPath = join(getBooksDir(), fileName)
  try {
    copyFileSync(sourcePath, destPath)
  } catch (err) {
    return {
      success: false,
      error: 'Failed to copy EPUB file to library',
      code: 'UNKNOWN'
    }
  }

  // Save cover image
  let coverPath: string | null = null
  if (metadata.coverImageData && metadata.coverImageExt) {
    const coverFileName = `${bookId}.${metadata.coverImageExt}`
    coverPath = join(getCoversDir(), coverFileName)
    try {
      writeFileSync(coverPath, metadata.coverImageData)
    } catch {
      coverPath = null // Non-fatal, continue without cover
    }
  }

  // Resolve category: use provided or null (Uncategorized will be shown as badge)
  const categoryId = options?.categoryId ?? null
  const readingMode = options?.readingMode ?? null

  // Create database record
  try {
    db.prepare(
      `INSERT INTO books (id, title, author, cover_path, file_path, original_path, description, language, total_words_estimate, category_id, reading_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      bookId,
      metadata.title,
      metadata.author,
      coverPath,
      destPath,
      sourcePath,
      metadata.description,
      metadata.language,
      metadata.estimatedWordCount > 0 ? metadata.estimatedWordCount : null,
      categoryId,
      readingMode,
      now,
      now
    )
  } catch (err) {
    // Clean up copied files on DB failure
    try {
      unlinkSync(destPath)
      if (coverPath) unlinkSync(coverPath)
    } catch { /* ignore cleanup errors */ }
    return {
      success: false,
      error: 'Failed to save book to database',
      code: 'UNKNOWN'
    }
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as ImportResult['book']

  return { success: true, book }
}

/**
 * Delete a book and its associated files
 */
export function deleteBookFiles(bookId: string): void {
  const db = getDatabase()
  const book = db.prepare('SELECT file_path, cover_path FROM books WHERE id = ?').get(bookId) as
    | { file_path: string; cover_path: string | null }
    | undefined

  if (!book) return

  // Delete the EPUB file if it's in our books directory
  if (book.file_path && book.file_path.includes(app.getPath('userData'))) {
    try {
      if (existsSync(book.file_path)) unlinkSync(book.file_path)
    } catch { /* ignore */ }
  }

  // Delete the cover image
  if (book.cover_path) {
    try {
      if (existsSync(book.cover_path)) unlinkSync(book.cover_path)
    } catch { /* ignore */ }
  }
}
