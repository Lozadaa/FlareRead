import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ManualTimeEntryDoc } from '../types'

function entriesCol(uid: string) {
  return collection(db, 'users', uid, 'manualTimeEntries')
}

function entryRef(uid: string, entryId: string) {
  return doc(db, 'users', uid, 'manualTimeEntries', entryId)
}

export const manualTimeEntriesService = {
  async getByCategory(uid: string, categoryId: string): Promise<ManualTimeEntryDoc[]> {
    const q = query(
      entriesCol(uid),
      where('categoryId', '==', categoryId),
      orderBy('occurredAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ManualTimeEntryDoc)
  },

  async getByDateRange(uid: string, categoryId: string, start: Date, end: Date): Promise<ManualTimeEntryDoc[]> {
    const q = query(
      entriesCol(uid),
      where('categoryId', '==', categoryId),
      where('occurredAt', '>=', Timestamp.fromDate(start)),
      where('occurredAt', '<=', Timestamp.fromDate(end)),
      orderBy('occurredAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ManualTimeEntryDoc)
  },

  async create(
    uid: string,
    data: Omit<ManualTimeEntryDoc, 'id' | 'createdAt'>
  ): Promise<ManualTimeEntryDoc> {
    const ref = doc(entriesCol(uid))
    const entry: ManualTimeEntryDoc = {
      ...data,
      id: ref.id,
      createdAt: Timestamp.now()
    }
    await setDoc(ref, entry)
    return entry
  },

  async delete(uid: string, entryId: string): Promise<void> {
    await deleteDoc(entryRef(uid, entryId))
  },

  async deleteByCategory(uid: string, categoryId: string): Promise<void> {
    const entries = await this.getByCategory(uid, categoryId)
    const batch = writeBatch(db)
    for (const e of entries) {
      batch.delete(entryRef(uid, e.id))
    }
    await batch.commit()
  }
}
