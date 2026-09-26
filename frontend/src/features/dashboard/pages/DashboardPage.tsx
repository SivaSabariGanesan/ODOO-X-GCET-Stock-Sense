import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  RotateCcw,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Package,
  Layers,
  AlertCircle,
} from 'lucide-react'
import { DashboardSummaryStrip } from '../components/DashboardSummaryStrip'
import { DashboardFilters } from '../components/DashboardFilters'
import { PendingOperationsSection } from '../components/PendingOperationsSection'
import { LowStockSection } from '../components/LowStockSection'
import { MovementSummarySection } from '../components/MovementSummarySection'
import { RecentActivitySection } from '../components/RecentActivitySection'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import {
  DEFAULT_FILTERS,
  INITIAL_PENDING_OPERATIONS,
  INITIAL_LOW_STOCK_PRODUCTS,
  INITIAL_RECENT_ACTIVITIES,
  INITIAL_MOVEMENT_DATA,
} from '../mockData'
import { DashboardFiltersState, PendingOperation, LowStockProduct } from '../types'

export function DashboardPage() {
  const toast = useToast()

  // ── States ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<DashboardFiltersState>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewOpOpen, setIsNewOpOpen] = useState(false)

  // Local state for interactive operations (e.g. validating/reordering updates live)
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>(INITIAL_PENDING_OPERATIONS)
  const [lowStockList, setLowStockList] = useState<LowStockProduct[]>(INITIAL_LOW_STOCK_PRODUCTS)
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now')

  // ── Filter Handlers ────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof DashboardFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    toast.info('Filters Reset', 'All view criteria restored to default.')
  }

  const handleSelectMetric = (metricId: string) => {
    if (metricId === 'low_stock' || metricId === 'out_of_stock') {
      // scroll to or focus on low stock section
      const el = document.getElementById('low-stock-section')
      el?.scrollIntoView({ behavior: 'smooth' })
    } else if (metricId === 'receipts') {
      setFilters((prev) => ({ ...prev, documentType: 'receipts' }))
    } else if (metricId === 'deliveries') {
      setFilters((prev) => ({ ...prev, documentType: 'deliveries' }))
    } else if (metricId === 'transfers') {
      setFilters((prev) => ({ ...prev, documentType: 'transfers' }))
    } else if (metricId === 'products') {
      setFilters(DEFAULT_FILTERS)
    }
  }

  // ── Live Filter Computations ───────────────────────────────────────────────
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
      if (filters.warehouse !== 'all' && op.warehouseId !== filters.warehouse) {
        return false
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
      if (filters.warehouse !== 'all' && prod.warehouseId !== filters.warehouse) {
        return false
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
    return INITIAL_RECENT_ACTIVITIES.filter((act) => {
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
      if (filters.warehouse !== 'all' && act.warehouseId !== filters.warehouse) {
        return false
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
  }, [filters, query])

  // 4. Dynamically calculated operational metrics
  const summaryMetrics = useMemo(() => {
    // Total products base
    const baseTotal = 2481
    // Scale count if warehouse filter is active
    let scaledTotal = baseTotal
    if (filters.warehouse === 'WH01') scaledTotal = 1420
    else if (filters.warehouse === 'WH02') scaledTotal = 780
    else if (filters.warehouse === 'WH03') scaledTotal = 281

    if (filters.category !== 'all') {
      scaledTotal = Math.round(scaledTotal * 0.28)
    }

    const lowStock = filteredLowStockProducts.filter((p) => p.status === 'low_stock').length
    const outOfStock = filteredLowStockProducts.filter((p) => p.status === 'out_of_stock').length

    const pendingRec = filteredPendingOperations.filter((op) => op.type === 'receipt').length
    const pendingDel = filteredPendingOperations.filter((op) => op.type === 'delivery').length
    const schedTrans = filteredPendingOperations.filter((op) => op.type === 'transfer').length

    return {
      totalProducts: scaledTotal,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      pendingReceipts: pendingRec,
      pendingDeliveries: pendingDel,
      scheduledTransfers: schedTrans,
    }
  }, [filters.warehouse, filters.category, filteredLowStockProducts, filteredPendingOperations])

  // 5. Dynamic Movement Data based on warehouse filter
  const movementData = useMemo(() => {
    if (filters.warehouse === 'all') return INITIAL_MOVEMENT_DATA

    const targetWh = INITIAL_MOVEMENT_DATA.byWarehouse.find(
      (w) => w.warehouseId === filters.warehouse
    )

    if (!targetWh) return INITIAL_MOVEMENT_DATA

    return {
      inboundUnits: targetWh.inbound,
      inboundCount: Math.round(targetWh.inbound / 120),
      outboundUnits: targetWh.outbound,
      outboundCount: Math.round(targetWh.outbound / 35),
      internalUnits: targetWh.internal,
      internalCount: Math.round(targetWh.internal / 30),
      adjustmentsUnits: 4,
      adjustmentsCount: 1,
      netChange: targetWh.inbound - targetWh.outbound,
      byWarehouse: [targetWh],
    }
  }, [filters.warehouse])

  const totalResultsCount =
    filteredPendingOperations.length +
    filteredLowStockProducts.length +
    filteredRecentActivities.length

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setIsLoading(true)
    setError(null)
    setTimeout(() => {
      setIsLoading(false)
      const now = new Date()
      setLastRefreshed(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      toast.success('Inventory Data Refreshed', 'Telemetry streams and operational queues updated.')
    }, 450)
  }

  const handleValidateOperation = (id: string) => {
    setPendingOps((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status: 'done' } : op))
    )
  }

  const handleReorderProduct = (id: string) => {
    setLowStockList((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, onHand: p.onHand + p.reorderQuantity, status: 'low_stock' } : p
      )
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title & Purpose */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Inventory Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time operational view: stock velocity, intake/dispatch backlogs, and replenishment alerts.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Refresh Action */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh inventory telemetry"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">({lastRefreshed})</span>
          </button>

          {/* New Operation Dropdown Menu */}
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsNewOpOpen(!isNewOpOpen)}
            >
              New Operation
            </Button>

            {isNewOpOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNewOpOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1 text-xs animate-[fadeIn_100ms_ease-out]">
                  <div className="px-3 py-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                    Create Document
                  </div>
                  <Link
                    to="/operations/receipts"
                    onClick={() => setIsNewOpOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-[#ede9fe]/50 hover:text-brand-dark transition-colors"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-brand" />
                    <span>Inbound Receipt (PO)</span>
                  </Link>
                  <Link
                    to="/operations/deliveries"
                    onClick={() => setIsNewOpOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-[#ede9fe]/50 hover:text-brand-dark transition-colors"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-sky-600" />
                    <span>Delivery Order (SO)</span>
                  </Link>
                  <Link
                    to="/operations/transfers"
                    onClick={() => setIsNewOpOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-[#ede9fe]/50 hover:text-brand-dark transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Internal Transfer</span>
                  </Link>
                  <Link
                    to="/operations/adjustments"
                    onClick={() => setIsNewOpOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-[#ede9fe]/50 hover:text-brand-dark transition-colors border-t border-slate-100"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    <span>Inventory Adjustment</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Operational Summary Strip ───────────────────────────────── */}
      <DashboardSummaryStrip
        totalProducts={summaryMetrics.totalProducts}
        lowStockCount={summaryMetrics.lowStockCount}
        outOfStockCount={summaryMetrics.outOfStockCount}
        pendingReceipts={summaryMetrics.pendingReceipts}
        pendingDeliveries={summaryMetrics.pendingDeliveries}
        scheduledTransfers={summaryMetrics.scheduledTransfers}
        activeFilter={filters.documentType}
        onSelectMetric={handleSelectMetric}
      />

      {/* ── Live Filter Toolbar ─────────────────────────────────────── */}
      <DashboardFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalResultsCount={totalResultsCount}
      />

      {/* ── Loading Skeleton / Error State ───────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-64 bg-slate-200/60 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 h-72 bg-slate-200/60 rounded-lg" />
            <div className="lg:col-span-5 h-72 bg-slate-200/60 rounded-lg" />
          </div>
          <div className="h-64 bg-slate-200/60 rounded-lg" />
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-lg text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="mt-3 text-xs"
          >
            Retry Connection
          </Button>
        </div>
      ) : totalResultsCount === 0 ? (
        /* ── Empty State across all views ──────────────────────────── */
        <div className="bg-white border border-slate-200/80 rounded-lg p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            No matching records found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No pending operations, inventory alerts, or recent activities matched your current combination of filters.
          </p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Clear All Filters
            </Button>
          </div>
        </div>
      ) : (
        /* ── Main Dashboard Sections ───────────────────────────────── */
        <div className="space-y-5">
          {/* 1. Pending Operations Queue */}
          <div id="pending-operations-section">
            <PendingOperationsSection
              operations={filteredPendingOperations}
              onValidateOperation={handleValidateOperation}
            />
          </div>

          {/* 2. Low Stock Products & Inventory Movement (Balanced 2-Col Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Low Stock Products (7 Cols) */}
            <div id="low-stock-section" className="lg:col-span-7">
              <LowStockSection
                products={filteredLowStockProducts}
                onReorderProduct={handleReorderProduct}
              />
            </div>

            {/* Right Column: Inventory Movement Summary (5 Cols) */}
            <div className="lg:col-span-5">
              <MovementSummarySection data={movementData} />
            </div>
          </div>

          {/* 3. Recent Activity Ledger */}
          <div id="recent-activity-section">
            <RecentActivitySection activities={filteredRecentActivities} />
          </div>
        </div>
      )}
    </div>
  )
}
