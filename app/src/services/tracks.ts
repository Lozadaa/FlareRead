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
  Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CategoryTrackDoc } from '../types'

function tracksCol(uid: string) {
  return collection(db, 'users', uid, 'tracks')
}

function trackRef(uid: string, trackId: string) {
  return doc(db, 'users', uid, 'tracks', trackId)
}

export const tracksService = {
  async getAll(uid: string): Promise<CategoryTrackDoc[]> {
    const snap = await getDocs(tracksCol(uid))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CategoryTrackDoc)
  },

  async getById(uid: string, trackId: string): Promise<CategoryTrackDoc | null> {
    const snap = await getDoc(trackRef(uid, trackId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as CategoryTrackDoc
  },

  async getByCategory(uid: string, categoryId: string): Promise<CategoryTrackDoc | null> {
    const q = query(tracksCol(uid), where('categoryId', '==', categoryId))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const first = snap.docs[0]!
    return { id: first.id, ...first.data() } as CategoryTrackDoc
  },

  async create(
    uid: string,
    data: Omit<CategoryTrackDoc, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CategoryTrackDoc> {
    const ref = doc(tracksCol(uid))
    const now = Timestamp.now()
    const track: CategoryTrackDoc = {
      ...data,
      id: ref.id,
      createdAt: now,
      updatedAt: now
    }
    await setDoc(ref, track)
    return track
  },

  async update(uid: string, trackId: string, data: Partial<CategoryTrackDoc>): Promise<void> {
    await updateDoc(trackRef(uid, trackId), {
      ...data,
      updatedAt: Timestamp.now()
    })
  },

  async delete(uid: string, trackId: string): Promise<void> {
    await deleteDoc(trackRef(uid, trackId))
  }
}
