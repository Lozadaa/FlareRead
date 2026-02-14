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
  Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { SessionDoc } from '../types'

function sessionsCol(uid: string) {
  return collection(db, 'users', uid, 'sessions')
}

function sessionRef(uid: string, sessionId: string) {
  return doc(db, 'users', uid, 'sessions', sessionId)
}

export const sessionsService = {
  async getAll(uid: string): Promise<SessionDoc[]> {
    const snap = await getDocs(query(sessionsCol(uid), orderBy('startTime', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc)
  },

  async getById(uid: string, sessionId: string): Promise<SessionDoc | null> {
    const snap = await getDoc(sessionRef(uid, sessionId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as SessionDoc
  },

  async getByBook(uid: string, bookId: string): Promise<SessionDoc[]> {
    const q = query(sessionsCol(uid), where('bookId', '==', bookId), orderBy('startTime', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc)
  },

  async getByDateRange(uid: string, start: Date, end: Date): Promise<SessionDoc[]> {
    const q = query(
      sessionsCol(uid),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      orderBy('startTime', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc)
  },

  async create(
    uid: string,
    data: Omit<SessionDoc, 'id' | 'createdAt'>
  ): Promise<SessionDoc> {
    const ref = doc(sessionsCol(uid))
    const session: SessionDoc = {
      ...data,
      id: ref.id,
      createdAt: Timestamp.now()
    }
    await setDoc(ref, session)
    return session
  },

  async update(uid: string, sessionId: string, data: Partial<SessionDoc>): Promise<void> {
    await updateDoc(sessionRef(uid, sessionId), { ...data })
  },

  async endSession(
    uid: string,
    sessionId: string,
    stats: {
      activeMs: number
      pagesViewed: number
      wordsReadEstimate: number
      totalAfkMs: number
      totalBreakMs: number
      highlightsDuring: number
      notesDuring: number
      completedPomodoros: number
    }
  ): Promise<void> {
    await updateDoc(sessionRef(uid, sessionId), {
      ...stats,
      endTime: Timestamp.now(),
      status: 'completed'
    })
  },

  async delete(uid: string, sessionId: string): Promise<void> {
    await deleteDoc(sessionRef(uid, sessionId))
  }
}
