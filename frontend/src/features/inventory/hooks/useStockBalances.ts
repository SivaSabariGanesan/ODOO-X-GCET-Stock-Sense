import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { stockBalancesApi } from '../api'
import {
  ApiStockBalance,
  ApiPagination,
  InventoryFiltersState,
  MasterWarehouseOption,
  MasterLocationOption,
} from '../types'
import { ApiError } from '../../../lib/apiClient'

const DEFAULT_FILTERS: InventoryFiltersState = {
  search: '',
  warehouseId: 'all',
  locationId: 'all',
  hasStockOnly: false,
  sortBy: 'lastMovedAt',
  sortOrder: 'desc',
}

const DEFAULT_PAGINATION: ApiPagination = {
  page: 1,
  limit: 15,
  total: 0,
  totalPages: 1,
}

export function useStockBalances() {
  const [balances, setBalances] = useState<ApiStockBalance[]>([])
  const [pagination, setPagination] = useState<ApiPagination>(DEFAULT_PAGINATION)
  const [filters, setFilters] = useState<InventoryFiltersState>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Master options
  const [warehouseOptions, setWarehouseOptions] = useState<MasterWarehouseOption[]>([])
  const [locationOptions, setLocationOptions] = useState<MasterLocationOption[]>([])

  // Load master filter options once
  useEffect(() => {
    let mounted = true
    Promise.all([
      stockBalancesApi.getWarehousesMaster(),
      stockBalancesApi.getLocationsMaster(),
    ]).then(([whs, locs]) => {
      if (mounted) {
        setWarehouseOptions(whs)
        setLocationOptions(locs)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // If warehouse filter changes, update available location options
  useEffect(() => {
    let mounted = true
    const whId = filters.warehouseId !== 'all' ? filters.warehouseId : undefined
    stockBalancesApi.getLocationsMaster(whId).then((locs) => {
      if (mounted) {
        setLocationOptions(locs)
        // If current selected location is not in the filtered warehouse, reset to 'all'
        if (filters.locationId !== 'all' && !locs.some((l) => l.id === filters.locationId)) {
          setFilters((prev) => ({ ...prev, locationId: 'all' }))
        }
      }
    })
    return () => {
      mounted = false
    }
  }, [filters.warehouseId])

  // Debounced search input handler (350ms)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: val }))
      setPage(1)
    }, 350)
  }

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await stockBalancesApi.list({
        page,
        limit: pagination.limit,
        search: filters.search.trim() || undefined,
        warehouseId: filters.warehouseId !== 'all' ? filters.warehouseId : undefined,
        locationId: filters.locationId !== 'all' ? filters.locationId : undefined,
        hasStock: filters.hasStockOnly ? true : undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })

      setBalances(res.data || [])
      setPagination(
        res.pagination ||
          res.meta || {
            page,
            limit: pagination.limit,
            total: res.data?.length || 0,
            totalPages: 1,
          }
      )
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to fetch stock balances from server.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    page,
    pagination.limit,
    filters.search,
    filters.warehouseId,
    filters.locationId,
    filters.hasStockOnly,
    filters.sortBy,
    filters.sortOrder,
  ])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  // Filter setters
  const handleWarehouseChange = (warehouseId: string) => {
    setFilters((prev) => ({ ...prev, warehouseId, locationId: 'all' }))
    setPage(1)
  }

  const handleLocationChange = (locationId: string) => {
    setFilters((prev) => ({ ...prev, locationId }))
    setPage(1)
  }

  const handleHasStockToggle = () => {
    setFilters((prev) => ({ ...prev, hasStockOnly: !prev.hasStockOnly }))
    setPage(1)
  }

  const handleResetFilters = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    setSearchInput('')
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  const handleSortChange = (sortBy: InventoryFiltersState['sortBy']) => {
    setFilters((prev) => {
      const isSame = prev.sortBy === sortBy
      const sortOrder = isSame && prev.sortOrder === 'asc' ? 'desc' : 'asc'
      return { ...prev, sortBy, sortOrder }
    })
  }

  // Summary Metrics computed from current dataset
  const metrics = useMemo(() => {
    let totalOnHand = 0
    let totalReserved = 0
    let totalAvailable = 0
    const locationsSet = new Set<string>()

    balances.forEach((b) => {
      const q = parseFloat(b.quantity || '0')
      const r = parseFloat(b.reservedQuantity || '0')
      totalOnHand += q
      totalReserved += r
      totalAvailable += Math.max(0, q - r)
      if (b.locationId) locationsSet.add(b.locationId)
    })

    return {
      totalOnHand: Math.round(totalOnHand * 100) / 100,
      totalReserved: Math.round(totalReserved * 100) / 100,
      totalAvailable: Math.round(totalAvailable * 100) / 100,
      trackedLocationsCount: locationsSet.size,
    }
  }, [balances])

  return {
    balances,
    pagination,
    page,
    setPage,
    isLoading,
    error,
    filters,
    searchInput,
    warehouseOptions,
    locationOptions,
    metrics,
    handleSearchChange,
    handleWarehouseChange,
    handleLocationChange,
    handleHasStockToggle,
    handleResetFilters,
    handleSortChange,
    refetch: fetchBalances,
  }
}
