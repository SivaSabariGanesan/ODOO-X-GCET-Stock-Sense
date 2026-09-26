/**
 * useCategories — data hook for category list, search, filters, pagination, and mutations.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  categoriesApi,
  ApiCategory,
  ApiPagination,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../index'
import { ApiError } from '../../../lib/apiClient'

export interface UseCategoriesOptions {
  search?: string
  status?: 'all' | 'active' | 'inactive'
  parentCategoryId?: string
  pageSize?: number
}

export interface UseCategoriesReturn {
  categories: ApiCategory[]
  pagination: ApiPagination | null
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
  createCategory: (payload: CreateCategoryPayload) => Promise<ApiCategory>
  updateCategory: (id: string, payload: UpdateCategoryPayload) => Promise<ApiCategory>
  deleteCategory: (id: string) => Promise<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }>
}

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesReturn {
  const { search = '', status = 'all', parentCategoryId, pageSize = 20 } = options

  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchId = useRef(0)

  const fetchCategories = useCallback(
    async (page: number) => {
      const id = ++fetchId.current
      setIsLoading(true)
      setError(null)

      try {
        const isActiveParam =
          status === 'active' ? true : status === 'inactive' ? false : undefined

        const res = await categoriesApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          isActive: isActiveParam,
          parentCategoryId: parentCategoryId && parentCategoryId !== 'all' ? parentCategoryId : undefined,
        })

        // Ignore stale responses
        if (id !== fetchId.current) return

        setCategories(res.data)
        setPagination(res.pagination)
      } catch (err) {
        if (id !== fetchId.current) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load categories. Please check your connection.')
        }
      } finally {
        if (id === fetchId.current) {
          setIsLoading(false)
        }
      }
    },
    [search, status, parentCategoryId, pageSize]
  )

  // Debounce search input and handle immediate filter shifts
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const delay = search ? 350 : 0
    debounceTimer.current = setTimeout(() => {
      setCurrentPage(1)
      fetchCategories(1)
    }, delay)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search, status, parentCategoryId, pageSize, fetchCategories])

  // Re-fetch on page navigation
  useEffect(() => {
    fetchCategories(currentPage)
  }, [currentPage, fetchCategories])

  const refetch = useCallback(() => {
    fetchCategories(currentPage)
  }, [fetchCategories, currentPage])

  const createCategory = useCallback(
    async (payload: CreateCategoryPayload): Promise<ApiCategory> => {
      const created = await categoriesApi.create(payload)
      refetch()
      return created
    },
    [refetch]
  )

  const updateCategory = useCallback(
    async (id: string, payload: UpdateCategoryPayload): Promise<ApiCategory> => {
      const updated = await categoriesApi.update(id, payload)
      refetch()
      return updated
    },
    [refetch]
  )

  const deleteCategory = useCallback(
    async (
      id: string
    ): Promise<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }> => {
      const result = await categoriesApi.delete(id)
      refetch()
      return result
    },
    [refetch]
  )

  return {
    categories,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
