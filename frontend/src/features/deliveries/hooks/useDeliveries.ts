/**
 * useDeliveries — data hook for the deliveries list page.
 *
 * Handles:
 *  - Server-side fetching from GET /api/deliveries
 *  - Loading / error state
 *  - Pagination (server-driven)
 *  - Debounced search + filter params
 *  - Optimistic status update for quick-validate/dispatch action
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { deliveriesApi, ApiDelivery, ApiDeliveryStatus, ApiPagination } from '../api'
import { ApiError } from '@/lib/apiClient'

// Map frontend lowercase status values to backend UPPERCASE enum
const STATUS_MAP: Record<string, ApiDeliveryStatus | undefined> = {
  draft: 'DRAFT',
  waiting: 'WAITING',
  ready: 'READY',
  done: 'DONE',
  cancelled: 'CANCELED',
  canceled: 'CANCELED',
}

interface UseDeliveriesOptions {
  search?: string
  status?: string   // frontend lowercase value or 'all'
  warehouseId?: string
  pageSize?: number
}

interface UseDeliveriesReturn {
  deliveries: ApiDelivery[]
  pagination: ApiPagination | null
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
  /** Optimistically update a delivery's status in the local list after status change */
  updateDeliveryStatus: (id: string, newStatus: ApiDeliveryStatus) => void
}

export function useDeliveries(options: UseDeliveriesOptions = {}): UseDeliveriesReturn {
  const { search = '', status = 'all', warehouseId = 'all', pageSize = 10 } = options

  const [deliveries, setDeliveries] = useState<ApiDelivery[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Use a ref for the debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchId = useRef(0)

  const fetchDeliveries = useCallback(
    async (page: number) => {
      const id = ++fetchId.current
      setIsLoading(true)
      setError(null)

      try {
        const apiStatus = status !== 'all' ? STATUS_MAP[status] : undefined
        const apiWarehouse = warehouseId !== 'all' ? warehouseId : undefined

        const res = await deliveriesApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          status: apiStatus,
          warehouseId: apiWarehouse,
        })

        // Ignore stale responses
        if (id !== fetchId.current) return

        setDeliveries(res.data)
        setPagination(res.pagination)
      } catch (err) {
        if (id !== fetchId.current) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load deliveries. Please check your connection.')
        }
      } finally {
        if (id === fetchId.current) {
          setIsLoading(false)
        }
      }
    },
    [search, status, warehouseId, pageSize]
  )

  // Debounce search-driven refetches; immediate for non-search changes
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const delay = search ? 400 : 0
    debounceTimer.current = setTimeout(() => {
      fetchDeliveries(currentPage)
    }, delay)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [fetchDeliveries, currentPage, search])

  // Reset to page 1 when filters change (except page itself)
  const prevFilters = useRef({ search, status, warehouseId })
  useEffect(() => {
    if (
      prevFilters.current.search !== search ||
      prevFilters.current.status !== status ||
      prevFilters.current.warehouseId !== warehouseId
    ) {
      prevFilters.current = { search, status, warehouseId }
      setCurrentPage(1)
    }
  }, [search, status, warehouseId])

  const refetch = useCallback(() => {
    fetchDeliveries(currentPage)
  }, [fetchDeliveries, currentPage])

  const updateDeliveryStatus = useCallback((id: string, newStatus: ApiDeliveryStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    )
  }, [])

  return {
    deliveries,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateDeliveryStatus,
  }
}
