import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { BookDoc, ReadingMode } from '../types'

function booksCol(uid: string) {
  return collection(db, 'users', uid, 'books')
}

function bookRef(uid: string, bookId: string) {
  return doc(db, 'users', uid, 'books', bookId)
}

export const booksService = {
  async getAll(uid: string): Promise<BookDoc[]> {
    const snap = await getDocs(query(booksCol(uid), orderBy('updatedAt', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookDoc)
  },

  async getById(uid: string, bookId: string): Promise<BookDoc | null> {
    const snap = await getDoc(bookRef(uid, bookId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as BookDoc
  },

  async getByCategory(uid: string, categoryId: string): Promise<BookDoc[]> {
    const q = query(booksCol(uid), where('categoryId', '==', categoryId), orderBy('updatedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookDoc)
  },

  async create(
    uid: string,
    data: Omit<BookDoc, 'id' | 'createdAt' | 'updatedAt' | 'percentComplete' | 'cfiPosition' | 'currentChapter'>
  ): Promise<BookDoc> {
    const ref = doc(booksCol(uid))
    const now = Timestamp.now()
    const book: BookDoc = {
      ...data,
      id: ref.id,
      percentComplete: 0,
      cfiPosition: null,
      currentChapter: null,
      createdAt: now,
      updatedAt: now
    }
    await setDoc(ref, book)
    return book
  },

  async update(uid: string, bookId: string, data: Partial<BookDoc>): Promise<void> {
    await updateDoc(bookRef(uid, bookId), {
      ...data,
      updatedAt: Timestamp.now()
    })
  },

  async updateProgress(
    uid: string,
    bookId: string,
    progress: { percentComplete: number; cfiPosition: string | null; currentChapter: string | null }
  ): Promise<void> {
    await updateDoc(bookRef(uid, bookId), {
      ...progress,
      updatedAt: Timestamp.now()
    })
  },

  async updateCategory(uid: string, bookId: string, categoryId: string | null): Promise<void> {
    await updateDoc(bookRef(uid, bookId), {
      categoryId,
      updatedAt: Timestamp.now()
    })
  },

  async updateReadingMode(uid: string, bookId: string, readingMode: ReadingMode): Promise<void> {
    await updateDoc(bookRef(uid, bookId), {
      readingMode,
      updatedAt: Timestamp.now()
    })
  },

  async delete(uid: string, bookId: string): Promise<void> {
    await deleteDoc(bookRef(uid, bookId))
  },

  async deleteMultiple(uid: string, bookIds: string[]): Promise<void> {
    const batch = writeBatch(db)
    for (const id of bookIds) {
      batch.delete(bookRef(uid, id))
    }
    await batch.commit()
  }
}
