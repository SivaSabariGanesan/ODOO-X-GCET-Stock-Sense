/**
 * useUoms — data hook for Units of Measure list, search, filters, pagination, and mutations.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { uomsApi } from '../api'
import {
  ApiUom,
  ApiPagination,
  CreateUomPayload,
  UpdateUomPayload,
} from '../types'
import { ApiError } from '../../../lib/apiClient'

export interface UseUomsOptions {
  search?: string
  measureType?: string
  status?: 'all' | 'active' | 'inactive'
  pageSize?: number
}

export interface UseUomsReturn {
  uoms: ApiUom[]
  pagination: ApiPagination | null
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
  createUom: (payload: CreateUomPayload) => Promise<ApiUom>
  updateUom: (id: string, payload: UpdateUomPayload) => Promise<ApiUom>
  deleteUom: (id: string) => Promise<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }>
}

export function useUoms(options: UseUomsOptions = {}): UseUomsReturn {
  const { search = '', measureType = 'all', status = 'all', pageSize = 20 } = options

  const [uoms, setUoms] = useState<ApiUom[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchId = useRef(0)

  const fetchUoms = useCallback(
    async (page: number) => {
      const id = ++fetchId.current
      setIsLoading(true)
      setError(null)

      try {
        const isActiveParam =
          status === 'active' ? true : status === 'inactive' ? false : undefined

        const res = await uomsApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          measureType: measureType && measureType !== 'all' ? measureType : undefined,
          isActive: isActiveParam,
        })

        // Ignore stale responses
        if (id !== fetchId.current) return

        setUoms(res.data)
        setPagination(res.pagination)
      } catch (err) {
        if (id !== fetchId.current) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load units of measure. Please check your connection.')
        }
      } finally {
        if (id === fetchId.current) {
          setIsLoading(false)
        }
      }
    },
    [search, measureType, status, pageSize]
  )

  // Debounce search input and handle immediate filter shifts
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const delay = search ? 350 : 0
    debounceTimer.current = setTimeout(() => {
      setCurrentPage(1)
      fetchUoms(1)
    }, delay)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search, measureType, status, pageSize, fetchUoms])

  // Re-fetch on page navigation
  useEffect(() => {
    fetchUoms(currentPage)
  }, [currentPage, fetchUoms])

  const refetch = useCallback(() => {
    fetchUoms(currentPage)
  }, [fetchUoms, currentPage])

  const createUom = useCallback(
    async (payload: CreateUomPayload): Promise<ApiUom> => {
      const created = await uomsApi.create(payload)
      refetch()
      return created
    },
    [refetch]
  )

  const updateUom = useCallback(
    async (id: string, payload: UpdateUomPayload): Promise<ApiUom> => {
      const updated = await uomsApi.update(id, payload)
      refetch()
      return updated
    },
    [refetch]
  )

  const deleteUom = useCallback(
    async (
      id: string
    ): Promise<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }> => {
      const result = await uomsApi.delete(id)
      refetch()
      return result
    },
    [refetch]
  )

  return {
    uoms,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    createUom,
    updateUom,
    deleteUom,
  }
}
