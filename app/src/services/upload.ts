import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { collection, doc, getDocs, query, where } from 'firebase/firestore'
import { storage, db } from '../lib/firebase'
import { booksService } from './books'
import type { BookDoc, ReadingMode } from '../types'
import ePub from 'epubjs'

// ─── Helpers ────────────────────────────────────────

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function storagePath(uid: string, bookId: string, filename: string) {
  return `users/${uid}/books/${bookId}/${filename}`
}

// ─── EPUB Metadata Extraction ───────────────────────

export interface EpubMetadata {
  title: string
  author: string | null
  description: string | null
  language: string | null
  coverBlob: Blob | null
}

export async function extractEpubMetadata(file: File): Promise<EpubMetadata> {
  const arrayBuffer = await file.arrayBuffer()
  const book = ePub(arrayBuffer as unknown as string)
  await book.ready

  const meta = book.packaging?.metadata
  const title = meta?.title || file.name.replace(/\.epub$/i, '')
  const author = meta?.creator || null
  const description = meta?.description || null
  const language = meta?.language || null

  // Extract cover image
  let coverBlob: Blob | null = null
  try {
    const coverUrl = await book.coverUrl()
    if (coverUrl) {
      const response = await fetch(coverUrl)
      coverBlob = await response.blob()
    }
  } catch {
    // Cover extraction can fail for some EPUBs, that's OK
  }

  book.destroy()
  return { title, author, description, language, coverBlob }
}

// ─── Duplicate Detection ────────────────────────────

export async function checkDuplicate(
  uid: string,
  fileHash: string,
  fileName: string
): Promise<BookDoc | null> {
  // Check by hash first (most reliable)
  const booksCol = collection(db, 'users', uid, 'books')
  const hashQuery = query(booksCol, where('fileHash', '==', fileHash))
  const hashSnap = await getDocs(hashQuery)
  const hashDoc = hashSnap.docs[0]
  if (hashDoc) {
    return { id: hashDoc.id, ...hashDoc.data() } as BookDoc
  }

  // Fallback: check by file name
  const nameQuery = query(booksCol, where('fileName', '==', fileName))
  const nameSnap = await getDocs(nameQuery)
  const nameDoc = nameSnap.docs[0]
  if (nameDoc) {
    return { id: nameDoc.id, ...nameDoc.data() } as BookDoc
  }

  return null
}

// ─── Upload Flow ────────────────────────────────────

export interface UploadBookOptions {
  file: File
  categoryId: string | null
  readingMode: ReadingMode
  onProgress?: (step: string) => void
}

export interface UploadResult {
  book: BookDoc
  isDuplicate: boolean
}

export async function uploadBook(
  uid: string,
  options: UploadBookOptions
): Promise<UploadResult> {
  const { file, categoryId, readingMode, onProgress } = options

  // Step 1: Compute hash
  onProgress?.('Computing file hash...')
  const fileHash = await computeFileHash(file)

  // Step 2: Check for duplicates
  onProgress?.('Checking for duplicates...')
  const duplicate = await checkDuplicate(uid, fileHash, file.name)
  if (duplicate) {
    return { book: duplicate, isDuplicate: true }
  }

  // Step 3: Extract metadata
  onProgress?.('Extracting metadata...')
  const metadata = await extractEpubMetadata(file)

  // Step 4: Create the book document first to get the ID
  const bookId = doc(collection(db, 'users', uid, 'books')).id
  const epubPath = storagePath(uid, bookId, file.name)

  // Step 5: Upload EPUB to Storage
  onProgress?.('Uploading EPUB...')
  const epubRef = ref(storage, epubPath)
  await uploadBytes(epubRef, file)

  // Step 6: Upload cover if available
  let coverStoragePath: string | null = null
  if (metadata.coverBlob) {
    onProgress?.('Uploading cover...')
    const ext = metadata.coverBlob.type.split('/')[1] || 'jpg'
    const coverPath = storagePath(uid, bookId, `cover.${ext}`)
    const coverRef = ref(storage, coverPath)
    await uploadBytes(coverRef, metadata.coverBlob)
    coverStoragePath = coverPath
  }

  // Step 7: Save to Firestore
  onProgress?.('Saving to library...')
  const book = await booksService.create(uid, {
    title: metadata.title,
    author: metadata.author,
    coverStoragePath,
    epubStoragePath: epubPath,
    description: metadata.description,
    language: metadata.language,
    totalWordsEstimate: null,
    categoryId,
    readingMode,
    fileHash,
    fileName: file.name,
  })

  return { book, isDuplicate: false }
}

// ─── Delete Book (with Storage cleanup) ─────────────

export async function deleteBookWithStorage(uid: string, book: BookDoc): Promise<void> {
  // Delete EPUB from Storage
  try {
    const epubRef = ref(storage, book.epubStoragePath)
    await deleteObject(epubRef)
  } catch {
    // File may not exist in storage, continue
  }

  // Delete cover from Storage
  if (book.coverStoragePath) {
    try {
      const coverRef = ref(storage, book.coverStoragePath)
      await deleteObject(coverRef)
    } catch {
      // Cover may not exist, continue
    }
  }

  // Delete Firestore document
  await booksService.delete(uid, book.id)
}

// ─── Get Cover URL ──────────────────────────────────

export async function getCoverUrl(storagePath: string): Promise<string> {
  const coverRef = ref(storage, storagePath)
  return getDownloadURL(coverRef)
}
