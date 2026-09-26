import { useState, useEffect, useCallback, useMemo } from 'react'
import { warehousesApi, locationsApi } from '../api'
import { stockBalancesApi } from '../../inventory/api'
import { ApiWarehouse } from '../types'
import { ApiError } from '../../../lib/apiClient'

export interface EnrichedWarehouse extends ApiWarehouse {
  totalLocations: number
  totalStockUnits: number
  productCount: number
}

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([])
  const [locationsCountMap, setLocationsCountMap] = useState<Record<string, number>>({})
  const [stockSummaryMap, setStockSummaryMap] = useState<Record<string, { totalUnits: number; skus: number }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & search
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 1. Fetch Warehouses from real API
      const res = await warehousesApi.list({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
      })

      setWarehouses(res.data || [])
      setTotal(res.pagination?.total ?? res.data?.length ?? 0)
      setTotalPages(res.pagination?.totalPages ?? 1)

      // 2. Fetch Locations to enrich warehouse location counts
      try {
        const locRes = await locationsApi.list({ limit: 100 })
        const counts: Record<string, number> = {}
        for (const loc of locRes.data || []) {
          counts[loc.warehouseId] = (counts[loc.warehouseId] || 0) + 1
        }
        setLocationsCountMap(counts)
      } catch {
        // non-blocking
      }

      // 3. Fetch Stock Balances to enrich warehouse inventory counts
      try {
        const stockRes = await stockBalancesApi.list({ limit: 100 })
        const stockMap: Record<string, { totalUnits: number; skus: number; seenSkus: Set<string> }> = {}
        for (const bal of stockRes.data || []) {
          if (!bal.warehouseId) continue
          if (!stockMap[bal.warehouseId]) {
            stockMap[bal.warehouseId] = { totalUnits: 0, skus: 0, seenSkus: new Set() }
          }
          stockMap[bal.warehouseId].totalUnits += Number(bal.quantity) || 0
          if (bal.productId) {
            stockMap[bal.warehouseId].seenSkus.add(bal.productId)
          }
        }
        const finalStock: Record<string, { totalUnits: number; skus: number }> = {}
        for (const [whId, s] of Object.entries(stockMap)) {
          finalStock[whId] = { totalUnits: s.totalUnits, skus: s.seenSkus.size }
        }
        setStockSummaryMap(finalStock)
      } catch {
        // non-blocking
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to retrieve warehouses from server'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, debouncedSearch])

  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  const enrichedWarehouses: EnrichedWarehouse[] = useMemo(() => {
    return warehouses.map((wh) => ({
      ...wh,
      totalLocations: locationsCountMap[wh.id] || 0,
      totalStockUnits: stockSummaryMap[wh.id]?.totalUnits || 0,
      productCount: stockSummaryMap[wh.id]?.skus || 0,
    }))
  }, [warehouses, locationsCountMap, stockSummaryMap])

  // Aggregate metrics across active facilities
  const totalLocationsCount = useMemo(() => {
    return Object.values(locationsCountMap).reduce((a, b) => a + b, 0)
  }, [locationsCountMap])

  const totalStockUnitsCount = useMemo(() => {
    return Object.values(stockSummaryMap).reduce((a, b) => a + b.totalUnits, 0)
  }, [stockSummaryMap])

  const activeFacilitiesCount = useMemo(() => {
    return warehouses.filter((w) => w.isActive).length
  }, [warehouses])

  return {
    warehouses: enrichedWarehouses,
    isLoading,
    error,
    refetch: loadWarehouses,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    totalLocationsCount,
    totalStockUnitsCount,
    activeFacilitiesCount,
  }
}
