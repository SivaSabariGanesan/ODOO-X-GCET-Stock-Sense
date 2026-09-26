/**
 * useStockMovements — data hook for the Move History ledger page.
 *
 * Handles:
 *  - Server-side fetching from GET /api/stock-movements
 *  - Real-time loading / error states
 *  - Server-driven pagination
 *  - Debounced search queries
 *  - Server-side filtering by movement type, warehouse, location, and date range
 *  - Safe transformation of backend ledger records to UI models
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  stockMovementsApi,
  ApiStockMovement,
  ApiPagination,
  StockMove,
  formatStockMove,
  mapFrontendTypeToApi,
} from '../types'
import { ApiError } from '../../../lib/apiClient'

export interface UseStockMovementsOptions {
  search?: string
  movementType?: string // 'all' | 'receipt' | 'delivery' | 'transfer' | 'adjustment'
  warehouseId?: string // 'all' | UUID
  locationId?: string // 'all' | UUID
  dateRange?: string // 'all' | 'today' | 'last_7' | 'last_30'
  productId?: string
  pageSize?: number
}

export interface UseStockMovementsReturn {
  rawMovements: ApiStockMovement[]
  movements: StockMove[]
  pagination: ApiPagination | null
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
}

export function useStockMovements(
  options: UseStockMovementsOptions = {}
): UseStockMovementsReturn {
  const {
    search = '',
    movementType = 'all',
    warehouseId = 'all',
    locationId = 'all',
    dateRange = 'all',
    productId,
    pageSize = 10,
  } = options

  const [rawMovements, setRawMovements] = useState<ApiStockMovement[]>([])
  const [movements, setMovements] = useState<StockMove[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchId = useRef(0)

  // Calculate ISO date boundaries based on dateRange selection
  const getDateRangeBounds = useCallback((range: string) => {
    if (range === 'today') {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return { fromDate: start.toISOString(), toDate: end.toISOString() }
    } else if (range === 'last_7') {
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return { fromDate: start.toISOString(), toDate: undefined }
    } else if (range === 'last_30') {
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return { fromDate: start.toISOString(), toDate: undefined }
    }
    return { fromDate: undefined, toDate: undefined }
  }, [])

  const fetchMovements = useCallback(
    async (page: number) => {
      const id = ++fetchId.current
      setIsLoading(true)
      setError(null)

      try {
        const apiMovementType =
          movementType !== 'all' ? mapFrontendTypeToApi(movementType) : undefined
        const apiWarehouseId = warehouseId !== 'all' ? warehouseId : undefined
        const apiLocationId = locationId !== 'all' ? locationId : undefined
        const { fromDate, toDate } = getDateRangeBounds(dateRange)

        const res = await stockMovementsApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          movementType: apiMovementType,
          warehouseId: apiWarehouseId,
          locationId: apiLocationId,
          productId: productId || undefined,
          fromDate,
          toDate,
        })

        // Discard stale responses
        if (id !== fetchId.current) return

        setRawMovements(res.data)
        setMovements(res.data.map(formatStockMove))
        setPagination(res.pagination)
      } catch (err) {
        if (id !== fetchId.current) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load stock movements. Please check your network connection.')
        }
      } finally {
        if (id === fetchId.current) {
          setIsLoading(false)
        }
      }
    },
    [search, movementType, warehouseId, locationId, dateRange, productId, pageSize, getDateRangeBounds]
  )

  // Handle debounced search changes and immediate filter adjustments
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    const delay = search ? 400 : 0
    debounceTimer.current = setTimeout(() => {
      setCurrentPage(1)
      fetchMovements(1)
    }, delay)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [search, movementType, warehouseId, locationId, dateRange, productId, pageSize, fetchMovements])

  // Re-fetch whenever the user navigates between pages
  useEffect(() => {
    fetchMovements(currentPage)
  }, [currentPage, fetchMovements])

  const refetch = useCallback(() => {
    fetchMovements(currentPage)
  }, [fetchMovements, currentPage])

  return {
    rawMovements,
    movements,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
  }
}
