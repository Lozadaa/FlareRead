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
import type { HighlightDoc } from '../types'

function highlightsCol(uid: string) {
  return collection(db, 'users', uid, 'highlights')
}

function highlightRef(uid: string, highlightId: string) {
  return doc(db, 'users', uid, 'highlights', highlightId)
}

export const highlightsService = {
  async getAll(uid: string): Promise<HighlightDoc[]> {
    const snap = await getDocs(query(highlightsCol(uid), orderBy('createdAt', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HighlightDoc)
  },

  async getById(uid: string, highlightId: string): Promise<HighlightDoc | null> {
    const snap = await getDoc(highlightRef(uid, highlightId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as HighlightDoc
  },

  async getByBook(uid: string, bookId: string): Promise<HighlightDoc[]> {
    const q = query(highlightsCol(uid), where('bookId', '==', bookId), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HighlightDoc)
  },

  async create(
    uid: string,
    data: Omit<HighlightDoc, 'id' | 'createdAt'>
  ): Promise<HighlightDoc> {
    const ref = doc(highlightsCol(uid))
    const highlight: HighlightDoc = {
      ...data,
      id: ref.id,
      createdAt: Timestamp.now()
    }
    await setDoc(ref, highlight)
    return highlight
  },

  async updateColor(uid: string, highlightId: string, color: string): Promise<void> {
    await updateDoc(highlightRef(uid, highlightId), { color })
  },

  async delete(uid: string, highlightId: string): Promise<void> {
    await deleteDoc(highlightRef(uid, highlightId))
  },

  async deleteByBook(uid: string, bookId: string): Promise<void> {
    const highlights = await this.getByBook(uid, bookId)
    const batch = writeBatch(db)
    for (const h of highlights) {
      batch.delete(highlightRef(uid, h.id))
    }
    await batch.commit()
  }
}
