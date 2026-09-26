/**
 * useAdjustments — data hook for the inventory adjustments list page.
 *
 * Handles:
 *  - Server-side fetching from GET /api/adjustments
 *  - Loading / error state
 *  - Pagination (server-driven)
 *  - Debounced search + filter params
 *  - Optimistic status updates
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { adjustmentsApi, ApiAdjustment, ApiAdjustmentStatus, ApiPagination } from '../api'
import { ApiError } from '@/lib/apiClient'

// Map frontend lowercase status values to backend UPPERCASE enum
const STATUS_MAP: Record<string, ApiAdjustmentStatus | undefined> = {
  draft: 'DRAFT',
  waiting: 'WAITING',
  ready: 'READY',
  done: 'DONE',
  cancelled: 'CANCELED',
  canceled: 'CANCELED',
}

interface UseAdjustmentsOptions {
  search?: string
  status?: string // frontend lowercase or 'all'
  locationId?: string
  pageSize?: number
}

interface UseAdjustmentsReturn {
  adjustments: ApiAdjustment[]
  pagination: ApiPagination | null
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
  updateAdjustmentStatus: (id: string, newStatus: ApiAdjustmentStatus) => void
}

export function useAdjustments(options: UseAdjustmentsOptions = {}): UseAdjustmentsReturn {
  const { search = '', status = 'all', locationId = 'all', pageSize = 10 } = options

  const [adjustments, setAdjustments] = useState<ApiAdjustment[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchId = useRef(0)

  const fetchAdjustments = useCallback(
    async (page: number) => {
      const id = ++fetchId.current
      setIsLoading(true)
      setError(null)

      try {
        const apiStatus = status !== 'all' ? STATUS_MAP[status] : undefined
        const apiLocation = locationId !== 'all' ? locationId : undefined

        const res = await adjustmentsApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          status: apiStatus,
          locationId: apiLocation,
        })

        if (id !== fetchId.current) return

        setAdjustments(res.data)
        setPagination(res.pagination)
      } catch (err) {
        if (id !== fetchId.current) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load inventory adjustments. Please check your connection.')
        }
      } finally {
        if (id === fetchId.current) {
          setIsLoading(false)
        }
      }
    },
    [search, status, locationId, pageSize]
  )

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const delay = search ? 400 : 0
    debounceTimer.current = setTimeout(() => {
      fetchAdjustments(currentPage)
    }, delay)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [fetchAdjustments, currentPage, search])

  // Reset to page 1 when filters change (except page itself)
  const prevFilters = useRef({ search, status, locationId })
  useEffect(() => {
    if (
      prevFilters.current.search !== search ||
      prevFilters.current.status !== status ||
      prevFilters.current.locationId !== locationId
    ) {
      prevFilters.current = { search, status, locationId }
      setCurrentPage(1)
    }
  }, [search, status, locationId])

  const refetch = useCallback(() => {
    fetchAdjustments(currentPage)
  }, [fetchAdjustments, currentPage])

  const updateAdjustmentStatus = useCallback((id: string, newStatus: ApiAdjustmentStatus) => {
    setAdjustments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    )
  }, [])

  return {
    adjustments,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateAdjustmentStatus,
  }
}
