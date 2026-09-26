import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  RotateCcw,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Package,
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
import { useDashboardData } from '../hooks'
import { PendingOperation, LowStockProduct } from '../types'

export function DashboardPage() {
  const toast = useToast()
  const [isNewOpOpen, setIsNewOpOpen] = useState(false)

  // ── Real Backend Dashboard State ──────────────────────────────────────────
  const {
    filters,
    isLoading,
    error,
    lastRefreshed,
    warehouseOptions,
    categoryOptions,
    summaryMetrics,
    pendingOperations,
    lowStockProducts,
    recentActivities,
    movementData,
    totalResultsCount,
    handleFilterChange,
    handleResetFilters,
    handleRefresh,
    handleValidateOperation,
    handleReorderProduct,
  } = useDashboardData()

  // ── Metric Selection Handlers ─────────────────────────────────────────────
  const handleSelectMetric = (metricId: string) => {
    if (metricId === 'low_stock' || metricId === 'out_of_stock') {
      const el = document.getElementById('low-stock-section')
      el?.scrollIntoView({ behavior: 'smooth' })
    } else if (metricId === 'receipts') {
      handleFilterChange('documentType', 'receipts')
    } else if (metricId === 'deliveries') {
      handleFilterChange('documentType', 'deliveries')
    } else if (metricId === 'transfers') {
      handleFilterChange('documentType', 'transfers')
    } else if (metricId === 'products') {
      handleResetFilters()
    }
  }

  const onResetWithToast = () => {
    handleResetFilters()
    toast.info('Filters Reset', 'All view criteria restored to default.')
  }

  const onValidateWithToast = async (id: string) => {
    try {
      await handleValidateOperation(id)
      const op = pendingOperations.find((o) => o.id === id)
      toast.success(
        'Operation Validated',
        `${op?.reference || 'Document'} was successfully validated against stock ledger.`
      )
    } catch {
      toast.error('Validation Error', 'Failed to validate operation against backend.')
    }
  }

  const onReorderWithToast = (id: string) => {
    handleReorderProduct(id)
    const product = lowStockProducts.find((p) => p.id === id)
    if (product) {
      toast.success(
        'Purchase Requisition Created',
        `Draft replenishment order generated for ${product.reorderQuantity} ${product.unit} of ${product.sku}.`
      )
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title & Purpose */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Overview of stock levels, pending operations, and inventory movements.
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
            title="Refresh data"
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
                    New Operation
                  </div>
                  <Link
                    to="/operations/receipts"
                    onClick={() => setIsNewOpOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-[#ede9fe]/50 hover:text-brand-dark transition-colors"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-brand" />
                    <span>Receipt</span>
                  </Link>
                  <Link
                    to="/operations/deliveries"
                    onClick={() => setIsNewOpOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-[#ede9fe]/50 hover:text-brand-dark transition-colors"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-sky-600" />
                    <span>Delivery Order</span>
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
        onResetFilters={onResetWithToast}
        totalResultsCount={totalResultsCount}
        warehouseOptions={warehouseOptions}
        categoryOptions={categoryOptions}
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
            <Button variant="secondary" size="sm" onClick={onResetWithToast}>
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
              operations={pendingOperations}
              onValidateOperation={onValidateWithToast}
            />
          </div>

          {/* 2. Low Stock Products & Inventory Movement (Balanced 2-Col Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Low Stock Products (7 Cols) */}
            <div id="low-stock-section" className="lg:col-span-7">
              <LowStockSection
                products={lowStockProducts}
                onReorderProduct={onReorderWithToast}
              />
            </div>

            {/* Right Column: Inventory Movement Summary (5 Cols) */}
            <div className="lg:col-span-5">
              <MovementSummarySection data={movementData} />
            </div>
          </div>

          {/* 3. Recent Activity Ledger */}
          <div id="recent-activity-section">
            <RecentActivitySection activities={recentActivities} />
          </div>
        </div>
      )}
    </div>
  )
}
