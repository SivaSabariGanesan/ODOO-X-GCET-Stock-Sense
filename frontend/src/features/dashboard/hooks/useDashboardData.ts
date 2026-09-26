import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  dashboardApi,
  transformToPendingOperations,
  transformToLowStockProducts,
  transformToRecentActivities,
  computeMovementSummary,
} from '../api'
import {
  DashboardFiltersState,
  PendingOperation,
  LowStockProduct,
  RecentActivityItem,
  MovementSummaryData,
  ApiDashboardSummary,
  ApiDashboardWarehouseSummary,
} from '../types'
import { DEFAULT_FILTERS } from '../mockData'

export function useDashboardData() {
  const [filters, setFilters] = useState<DashboardFiltersState>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now')

  // Master Data Options for Filter Controls
  const [warehouseOptions, setWarehouseOptions] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'All Warehouses' },
  ])
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['All Categories'])

  // Core Data States
  const [summary, setSummary] = useState<ApiDashboardSummary | null>(null)
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([])
  const [lowStockList, setLowStockList] = useState<LowStockProduct[]>([])
  const [recentActivitiesList, setRecentActivitiesList] = useState<RecentActivityItem[]>([])
  const [warehousesSummary, setWarehousesSummary] = useState<ApiDashboardWarehouseSummary[]>([])
  const [rawMovements, setRawMovements] = useState<any[]>([])

  // Raw operation counts
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState<number>(0)
  const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState<number>(0)
  const [scheduledTransfersCount, setScheduledTransfersCount] = useState<number>(0)

  // ---------------------------------------------------------------------------
  // Load All Backend Data
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Execute all dashboard queries in parallel
      const [
        summaryResult,
        lowStockResult,
        movementsResult,
        warehousesResult,
        whMasterResult,
        catMasterResult,
        receiptsResult,
        deliveriesResult,
        transfersResult,
        adjustmentsResult,
      ] = await Promise.allSettled([
        dashboardApi.getSummary(),
        dashboardApi.getLowStock({ limit: 50 }),
        dashboardApi.getMovements({ limit: 40 }),
        dashboardApi.getWarehousesSummary(),
        dashboardApi.getWarehousesMaster(),
        dashboardApi.getCategoriesMaster(),
        dashboardApi.getReceipts({ limit: 50 }),
        dashboardApi.getDeliveries({ limit: 50 }),
        dashboardApi.getTransfers({ limit: 50 }),
        dashboardApi.getAdjustments({ limit: 50 }),
      ])

      // 1. Domain Summary
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value)
      }

      // 2. Low Stock Alerts
      if (lowStockResult.status === 'fulfilled') {
        const rawLowStock = lowStockResult.value.data || []
        setLowStockList(transformToLowStockProducts(rawLowStock))
      }

      // 3. Movement Ledger & Recent Activities
      if (movementsResult.status === 'fulfilled') {
        const moves = movementsResult.value.data || []
        setRawMovements(moves)
        setRecentActivitiesList(transformToRecentActivities(moves))
      }

      // 4. Warehouse Summaries
      if (warehousesResult.status === 'fulfilled') {
        setWarehousesSummary(warehousesResult.value || [])
      }

      // 5. Master Filters: Warehouses
      if (whMasterResult.status === 'fulfilled') {
        const whList = whMasterResult.value || []
        const options = [
          { id: 'all', name: 'All Warehouses' },
          ...whList.map((w) => ({
            id: w.id,
            name: `${w.shortCode} — ${w.name}`,
          })),
        ]
        setWarehouseOptions(options)
      }

      // 6. Master Filters: Categories
      if (catMasterResult.status === 'fulfilled') {
        const catList = catMasterResult.value || []
        const options = ['All Categories', ...catList.map((c) => c.name)]
        setCategoryOptions(options)
      }

      // 7. Operational Queues (Receipts, Deliveries, Transfers, Adjustments)
      const receipts = receiptsResult.status === 'fulfilled' ? receiptsResult.value : []
      const deliveries = deliveriesResult.status === 'fulfilled' ? deliveriesResult.value : []
      const transfers = transfersResult.status === 'fulfilled' ? transfersResult.value : []
      const adjustments = adjustmentsResult.status === 'fulfilled' ? adjustmentsResult.value : []

      const transformedOps = transformToPendingOperations(receipts, deliveries, transfers, adjustments)
      setPendingOps(transformedOps)

      // Count uncompleted operations
      setPendingReceiptsCount(
        receipts.filter((r) => r.status !== 'DONE' && r.status !== 'CANCELED').length
      )
      setPendingDeliveriesCount(
        deliveries.filter((d) => d.status !== 'DONE' && d.status !== 'CANCELED').length
      )
      setScheduledTransfersCount(
        transfers.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELED').length
      )

      const now = new Date()
      setLastRefreshed(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError(err?.message || 'Failed to connect to StockSense dashboard API.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------------------------------------------------------------------------
  // Filter Handlers
  // ---------------------------------------------------------------------------
  const handleFilterChange = (key: keyof DashboardFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  // ---------------------------------------------------------------------------
  // Live Filtered Computations
  // ---------------------------------------------------------------------------
  const query = filters.searchQuery.toLowerCase().trim()

  // 1. Filtered Pending Operations
  const filteredPendingOperations = useMemo(() => {
    return pendingOps.filter((op) => {
      // Document type filter
      if (filters.documentType !== 'all') {
        const typeMap: Record<string, string> = {
          receipts: 'receipt',
          deliveries: 'delivery',
          transfers: 'transfer',
          adjustments: 'adjustment',
        }
        if (op.type !== typeMap[filters.documentType]) return false
      }

      // Status filter
      if (filters.status !== 'all' && op.status !== filters.status) {
        return false
      }

      // Warehouse filter
      if (filters.warehouse !== 'all') {
        const matchesWh =
          op.warehouseId === filters.warehouse ||
          op.warehouseName.toLowerCase().includes(filters.warehouse.toLowerCase())
        if (!matchesWh) return false
      }

      // Category filter
      if (filters.category !== 'all' && op.category !== filters.category) {
        return false
      }

      // Search query
      if (query) {
        const match =
          op.reference.toLowerCase().includes(query) ||
          op.source.toLowerCase().includes(query) ||
          op.destination.toLowerCase().includes(query) ||
          (op.partner && op.partner.toLowerCase().includes(query)) ||
          op.warehouseName.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })
  }, [pendingOps, filters, query])

  // 2. Filtered Low Stock Products
  const filteredLowStockProducts = useMemo(() => {
    return lowStockList.filter((prod) => {
      // Warehouse filter
      if (filters.warehouse !== 'all') {
        const matchesWh =
          prod.warehouseId === filters.warehouse ||
          prod.warehouseName.toLowerCase().includes(filters.warehouse.toLowerCase())
        if (!matchesWh) return false
      }

      // Category filter
      if (filters.category !== 'all' && prod.category !== filters.category) {
        return false
      }

      // Search query
      if (query) {
        const match =
          prod.sku.toLowerCase().includes(query) ||
          prod.name.toLowerCase().includes(query) ||
          prod.category.toLowerCase().includes(query) ||
          prod.warehouseName.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })
  }, [lowStockList, filters.warehouse, filters.category, query])

  // 3. Filtered Recent Activities
  const filteredRecentActivities = useMemo(() => {
    return recentActivitiesList.filter((act) => {
      // Document type filter
      if (filters.documentType !== 'all') {
        const typeMap: Record<string, string> = {
          receipts: 'receipt',
          deliveries: 'delivery',
          transfers: 'transfer',
          adjustments: 'adjustment',
        }
        if (act.type !== typeMap[filters.documentType]) return false
      }

      // Status filter
      if (filters.status !== 'all' && act.status !== filters.status) {
        return false
      }

      // Warehouse filter
      if (filters.warehouse !== 'all') {
        const matchesWh =
          act.warehouseId === filters.warehouse ||
          act.warehouseName.toLowerCase().includes(filters.warehouse.toLowerCase())
        if (!matchesWh) return false
      }

      // Category filter
      if (filters.category !== 'all' && act.category !== filters.category) {
        return false
      }

      // Search query
      if (query) {
        const match =
          act.reference.toLowerCase().includes(query) ||
          act.description.toLowerCase().includes(query) ||
          act.user.toLowerCase().includes(query) ||
          act.warehouseName.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })
  }, [recentActivitiesList, filters, query])

  // 4. Authoritative Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalProds = summary?.totalProducts ?? 0
    const lowStock = lowStockList.filter((p) => p.status === 'low_stock').length
    const outOfStock = lowStockList.filter((p) => p.status === 'out_of_stock').length

    return {
      totalProducts: totalProds,
      lowStockCount: lowStock > 0 ? lowStock : (summary?.lowStockCount ?? 0),
      outOfStockCount: outOfStock,
      pendingReceipts: pendingReceiptsCount,
      pendingDeliveries: pendingDeliveriesCount,
      scheduledTransfers: scheduledTransfersCount,
    }
  }, [summary, lowStockList, pendingReceiptsCount, pendingDeliveriesCount, scheduledTransfersCount])

  // 5. Movement Summary Data
  const movementData = useMemo<MovementSummaryData>(() => {
    return computeMovementSummary(rawMovements, warehousesSummary)
  }, [rawMovements, warehousesSummary])

  const totalResultsCount =
    filteredPendingOperations.length +
    filteredLowStockProducts.length +
    filteredRecentActivities.length

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleValidateOperation = async (id: string) => {
    const target = pendingOps.find((op) => op.id === id)
    if (!target) return

    try {
      await dashboardApi.validateOperation(target.type, target.id)
      // Optimistically update
      setPendingOps((prev) =>
        prev.map((op) => (op.id === id ? { ...op, status: 'ready' } : op))
      )
      // Re-fetch in background
      fetchData()
    } catch (err) {
      console.error('Validation failed:', err)
      throw err
    }
  }

  const handleReorderProduct = (id: string) => {
    setLowStockList((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, onHand: p.onHand + p.reorderQuantity, status: 'low_stock' } : p
      )
    )
  }

  return {
    filters,
    isLoading,
    error,
    lastRefreshed,
    warehouseOptions,
    categoryOptions,
    summaryMetrics,
    pendingOperations: filteredPendingOperations,
    lowStockProducts: filteredLowStockProducts,
    recentActivities: filteredRecentActivities,
    movementData,
    totalResultsCount,
    handleFilterChange,
    handleResetFilters,
    handleRefresh: fetchData,
    handleValidateOperation,
    handleReorderProduct,
  }
}
