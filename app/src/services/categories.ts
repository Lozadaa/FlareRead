import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CategoryDoc } from '../types'

function categoriesCol(uid: string) {
  return collection(db, 'users', uid, 'categories')
}

function categoryRef(uid: string, categoryId: string) {
  return doc(db, 'users', uid, 'categories', categoryId)
}

export const categoriesService = {
  async getAll(uid: string): Promise<CategoryDoc[]> {
    const snap = await getDocs(query(categoriesCol(uid), orderBy('name', 'asc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CategoryDoc)
  },

  async getById(uid: string, categoryId: string): Promise<CategoryDoc | null> {
    const snap = await getDoc(categoryRef(uid, categoryId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as CategoryDoc
  },

  async create(
    uid: string,
    data: Omit<CategoryDoc, 'id' | 'createdAt'>
  ): Promise<CategoryDoc> {
    const ref = doc(categoriesCol(uid))
    const category: CategoryDoc = {
      ...data,
      id: ref.id,
      createdAt: Timestamp.now()
    }
    await setDoc(ref, category)
    return category
  },

  async createDefault(uid: string): Promise<CategoryDoc> {
    const ref = categoryRef(uid, 'uncategorized')
    const existing = await getDoc(ref)
    if (existing.exists()) return { id: existing.id, ...existing.data() } as CategoryDoc

    const category: CategoryDoc = {
      id: 'uncategorized',
      name: 'Uncategorized',
      color: '#6b7280',
      icon: null,
      createdAt: Timestamp.now()
    }
    await setDoc(ref, category)
    return category
  },

  async update(uid: string, categoryId: string, data: Partial<Pick<CategoryDoc, 'name' | 'color' | 'icon'>>): Promise<void> {
    await updateDoc(categoryRef(uid, categoryId), { ...data })
  },

  async delete(uid: string, categoryId: string): Promise<void> {
    if (categoryId === 'uncategorized') {
      throw new Error('Cannot delete the default uncategorized category')
    }
    await deleteDoc(categoryRef(uid, categoryId))
  },

  async initializeDefaults(uid: string): Promise<void> {
    const existing = await getDocs(categoriesCol(uid))
    if (existing.empty) {
      await this.createDefault(uid)
    }
  }
}
