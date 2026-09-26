import { useState, useEffect, useCallback, useMemo } from 'react'
import { warehousesApi, locationsApi } from '../api'
import { stockBalancesApi } from '../../inventory/api'
import { ApiWarehouse, ApiLocation, WarehouseLocationNode, LocationProductItem } from '../types'
import { ApiStockBalance } from '../../inventory/types'
import { ApiError } from '../../../lib/apiClient'

// Check if string is a valid UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function useWarehouseDetail(idOrCode: string | undefined) {
  const [warehouse, setWarehouse] = useState<ApiWarehouse | null>(null)
  const [locations, setLocations] = useState<ApiLocation[]>([])
  const [stockBalances, setStockBalances] = useState<ApiStockBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!idOrCode) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Resolve Warehouse
      let resolvedWarehouse: ApiWarehouse | null = null

      if (UUID_REGEX.test(idOrCode)) {
        // Direct UUID query
        resolvedWarehouse = await warehousesApi.getById(idOrCode)
      } else {
        // Search by short code or name
        const searchRes = await warehousesApi.list({ search: idOrCode })
        const match = (searchRes.data || []).find(
          (w) =>
            w.shortCode.toLowerCase() === idOrCode.toLowerCase() ||
            w.name.toLowerCase() === idOrCode.toLowerCase() ||
            w.id === idOrCode
        )
        if (match) {
          resolvedWarehouse = match
        } else if (searchRes.data && searchRes.data.length > 0) {
          resolvedWarehouse = searchRes.data[0]
        } else {
          throw new ApiError(`Warehouse '${idOrCode}' not found`, 404)
        }
      }

      setWarehouse(resolvedWarehouse)

      // 2. Fetch Locations for this Warehouse
      const locRes = await locationsApi.list({
        warehouseId: resolvedWarehouse.id,
        limit: 100,
        sortBy: 'fullPath',
        sortOrder: 'asc',
      })
      const locs = locRes.data || []
      setLocations(locs)

      // 3. Fetch Stock Balances for this Warehouse
      const stockRes = await stockBalancesApi.list({
        warehouseId: resolvedWarehouse.id,
        limit: 100,
      })
      const balances = stockRes.data || []
      setStockBalances(balances)
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to retrieve warehouse details'
      setError(msg)
      setWarehouse(null)
    } finally {
      setIsLoading(false)
    }
  }, [idOrCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Build hierarchical or mapped location tree nodes with stock products
  const locationNodes: WarehouseLocationNode[] = useMemo(() => {
    if (!warehouse) return []

    // Group stock balances by locationId
    const balancesByLoc: Record<string, ApiStockBalance[]> = {}
    for (const b of stockBalances) {
      if (!balancesByLoc[b.locationId]) {
        balancesByLoc[b.locationId] = []
      }
      balancesByLoc[b.locationId].push(b)
    }

    return locations.map((loc) => {
      const locBalances = balancesByLoc[loc.id] || []
      const totalUnits = locBalances.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)

      const products: LocationProductItem[] = locBalances.map((b) => {
        const qty = Number(b.quantity) || 0
        let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock'
        if (qty <= 0) {
          status = 'out_of_stock'
        } else if (qty < 20) {
          status = 'low_stock'
        }

        return {
          id: b.productId,
          sku: b.productSku || 'SKU-UNKNOWN',
          name: b.productName || 'Unnamed Product',
          category: 'Inventory',
          quantity: qty,
          unit: b.uomAbbreviation || b.uomName || 'units',
          status,
        }
      })

      return {
        id: loc.id,
        name: loc.name,
        fullPath: loc.fullPath || `${warehouse.shortCode}/${loc.name}`,
        type: loc.locationType || 'internal',
        parentId: loc.parentId,
        itemCount: products.length,
        totalUnits,
        products,
      }
    })
  }, [warehouse, locations, stockBalances])

  // Computed metrics
  const totalStockUnits = useMemo(() => {
    return stockBalances.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
  }, [stockBalances])

  const productCount = useMemo(() => {
    const seen = new Set(stockBalances.map((b) => b.productId))
    return seen.size
  }, [stockBalances])

  const lowStockCount = useMemo(() => {
    return stockBalances.filter((b) => {
      const q = Number(b.quantity) || 0
      return q > 0 && q < 20
    }).length
  }, [stockBalances])

  const outOfStockCount = useMemo(() => {
    return stockBalances.filter((b) => (Number(b.quantity) || 0) <= 0).length
  }, [stockBalances])

  return {
    warehouse,
    locations,
    stockBalances,
    locationNodes,
    totalStockUnits,
    totalLocations: locations.length,
    productCount,
    lowStockCount,
    outOfStockCount,
    isLoading,
    error,
    refetch: loadData,
  }
}
