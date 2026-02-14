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
import type { NoteDoc } from '../types'

function notesCol(uid: string) {
  return collection(db, 'users', uid, 'notes')
}

function noteRef(uid: string, noteId: string) {
  return doc(db, 'users', uid, 'notes', noteId)
}

export const notesService = {
  async getAll(uid: string): Promise<NoteDoc[]> {
    const snap = await getDocs(query(notesCol(uid), orderBy('updatedAt', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NoteDoc)
  },

  async getById(uid: string, noteId: string): Promise<NoteDoc | null> {
    const snap = await getDoc(noteRef(uid, noteId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as NoteDoc
  },

  async getByBook(uid: string, bookId: string): Promise<NoteDoc[]> {
    const q = query(notesCol(uid), where('bookId', '==', bookId), orderBy('updatedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NoteDoc)
  },

  async getByHighlight(uid: string, highlightId: string): Promise<NoteDoc[]> {
    const q = query(notesCol(uid), where('highlightId', '==', highlightId))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NoteDoc)
  },

  async create(
    uid: string,
    data: Omit<NoteDoc, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<NoteDoc> {
    const ref = doc(notesCol(uid))
    const now = Timestamp.now()
    const note: NoteDoc = {
      ...data,
      id: ref.id,
      createdAt: now,
      updatedAt: now
    }
    await setDoc(ref, note)
    return note
  },

  async update(uid: string, noteId: string, data: { content?: string; tags?: string[] }): Promise<void> {
    await updateDoc(noteRef(uid, noteId), {
      ...data,
      updatedAt: Timestamp.now()
    })
  },

  async delete(uid: string, noteId: string): Promise<void> {
    await deleteDoc(noteRef(uid, noteId))
  },

  async deleteByBook(uid: string, bookId: string): Promise<void> {
    const notes = await this.getByBook(uid, bookId)
    const batch = writeBatch(db)
    for (const n of notes) {
      batch.delete(noteRef(uid, n.id))
    }
    await batch.commit()
  }
}
