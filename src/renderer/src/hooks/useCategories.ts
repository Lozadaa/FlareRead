import { useState, useCallback, useEffect } from 'react'
import { Category } from '@/types'

export interface UseCategories {
  categories: Category[]
  loading: boolean
  refresh: () => Promise<void>
  createCategory: (data: { name: string; color?: string; icon?: string }) => Promise<Category>
  updateCategory: (
    id: string,
    data: Partial<{ name: string; color: string; icon: string }>
  ) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

export function useCategories(): UseCategories {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = (await window.api.categories.getAll()) as Category[]
    setCategories(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCategory = useCallback(
    async (data: { name: string; color?: string; icon?: string }) => {
      const created = (await window.api.categories.create(data)) as Category
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      return created
    },
    []
  )

  const updateCategory = useCallback(
    async (id: string, data: Partial<{ name: string; color: string; icon: string }>) => {
      const updated = (await window.api.categories.update(id, data)) as Category
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
      return updated
    },
    []
  )

  const deleteCategory = useCallback(async (id: string) => {
    await window.api.categories.delete(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { categories, loading, refresh, createCategory, updateCategory, deleteCategory }
}
