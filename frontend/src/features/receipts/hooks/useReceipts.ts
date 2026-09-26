/**
 * useReceipts — data hook for the receipts list page.
 *
 * Handles:
 *  - Server-side fetching from GET /api/receipts
 *  - Loading / error state
 *  - Pagination (server-driven)
 *  - Debounced search + filter params
 *  - Optimistic status update for quick-validate action
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { receiptsApi, ApiReceipt, ApiReceiptStatus, ApiPagination } from '../api'
import { ApiError } from '@/lib/apiClient'

// Map frontend lowercase status values to backend UPPERCASE enum
const STATUS_MAP: Record<string, ApiReceiptStatus | undefined> = {
  draft: 'DRAFT',
  waiting: 'WAITING',
  ready: 'READY',
  done: 'DONE',
  cancelled: 'CANCELED',
  canceled: 'CANCELED',
}

interface UseReceiptsOptions {
  search?: string
  status?: string   // frontend lowercase value or 'all'
  warehouseId?: string
  pageSize?: number
}

interface UseReceiptsReturn {
  receipts: ApiReceipt[]
  pagination: ApiPagination | null
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
  /** Optimistically remove a receipt from the local list after status change */
  updateReceiptStatus: (id: string, newStatus: ApiReceiptStatus) => void
}

export function useReceipts(options: UseReceiptsOptions = {}): UseReceiptsReturn {
  const { search = '', status = 'all', warehouseId = 'all', pageSize = 10 } = options

  const [receipts, setReceipts] = useState<ApiReceipt[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Use a ref for the debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchId = useRef(0)

  const fetchReceipts = useCallback(
    async (page: number) => {
      const id = ++fetchId.current
      setIsLoading(true)
      setError(null)

      try {
        const apiStatus = status !== 'all' ? STATUS_MAP[status] : undefined
        const apiWarehouse = warehouseId !== 'all' ? warehouseId : undefined

        const res = await receiptsApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          status: apiStatus,
          warehouseId: apiWarehouse,
        })

        // Ignore stale responses
        if (id !== fetchId.current) return

        setReceipts(res.data)
        setPagination(res.pagination)
      } catch (err) {
        if (id !== fetchId.current) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load receipts. Please check your connection.')
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
      setCurrentPage(1)
      fetchReceipts(1)
    }, delay)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, warehouseId, pageSize])

  // Re-fetch when page changes (not from filter change, which resets to 1)
  useEffect(() => {
    fetchReceipts(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const refetch = useCallback(() => {
    fetchReceipts(currentPage)
  }, [fetchReceipts, currentPage])

  const updateReceiptStatus = useCallback((id: string, newStatus: ApiReceiptStatus) => {
    setReceipts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    )
  }, [])

  return {
    receipts,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateReceiptStatus,
  }
}
