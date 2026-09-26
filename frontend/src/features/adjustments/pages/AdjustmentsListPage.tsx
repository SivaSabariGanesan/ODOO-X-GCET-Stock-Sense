import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
  Clock,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
  MapPin,
  Package,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TablePagination } from '@/components/common/TablePagination'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useAdjustments } from '../hooks/useAdjustments'
import { adjustmentsApi, ApiAdjustment, ApiAdjustmentStatus } from '../api'
import { cn } from '@/lib/cn'

const PAGE_SIZE = 10

export function AdjustmentsListPage() {
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [varianceType, setVarianceType] = useState<'all' | 'deficit' | 'surplus' | 'exact'>('all')

  const {
    adjustments,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateAdjustmentStatus,
  } = useAdjustments({
    search,
    status: statusFilter,
    pageSize: PAGE_SIZE,
  })

  // Confirmation Modal state for quick validate / process
  const [confirmItem, setConfirmItem] = useState<ApiAdjustment | null>(null)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Filter client-side by varianceType if selected
  const displayedAdjustments = useMemo(() => {
    if (varianceType === 'all') return adjustments
    return adjustments.filter((a) => {
      const diff = parseFloat(a.items?.[0]?.difference || '0')
      if (varianceType === 'deficit') return diff < 0
      if (varianceType === 'surplus') return diff > 0
      if (varianceType === 'exact') return diff === 0
      return true
    })
  }, [adjustments, varianceType])

  const isFiltered =
    Boolean(search.trim()) || statusFilter !== 'all' || varianceType !== 'all'

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setVarianceType('all')
    toast.info('Filters Reset', 'Displaying all inventory adjustments.')
  }

  const handleConfirmValidation = async () => {
    if (!confirmItem || isProcessingAction) return
    setIsProcessingAction(true)
    try {
      if (confirmItem.status === 'READY') {
        await adjustmentsApi.process(confirmItem.id)
        updateAdjustmentStatus(confirmItem.id, 'DONE')
        toast.success(
          'Adjustment Reconciled & Applied',
          `${confirmItem.adjustmentNumber} stock balances reconciled and ledger updated.`
        )
      } else {
        await adjustmentsApi.validate(confirmItem.id)
        updateAdjustmentStatus(confirmItem.id, 'READY')
        toast.success(
          'Adjustment Validated',
          `${confirmItem.adjustmentNumber} validated and marked READY for stock application.`
        )
      }
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.'
      toast.error('Operation Failed', msg)
    } finally {
      setIsProcessingAction(false)
      setConfirmItem(null)
    }
  }

  const getStatusBadge = (status: ApiAdjustmentStatus) => {
    switch (status) {
      case 'READY':
        return <Badge variant="ready" dot>Ready</Badge>
      case 'WAITING':
        return <Badge variant="warning" dot>Waiting</Badge>
      case 'DONE':
        return <Badge variant="done" dot>Done</Badge>
      case 'CANCELED':
        return <Badge variant="cancelled" dot>Cancelled</Badge>
      case 'DRAFT':
      default:
        return <Badge variant="draft" dot>Draft</Badge>
    }
  }

  // Summary Metrics
  const totalAudits = pagination?.total ?? adjustments.length
  const draftCount = adjustments.filter((a) => a.status === 'DRAFT').length
  const totalDeficits = adjustments.filter((a) => parseFloat(a.items?.[0]?.difference || '0') < 0).length
  const totalSurpluses = adjustments.filter((a) => parseFloat(a.items?.[0]?.difference || '0') > 0).length

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Inventory Adjustments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reconcile physical stock with system quantities.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/operations/adjustments/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Adjustment
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Metric Summary Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Adjustments</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalAudits}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Draft</span>
          <span className="text-lg font-bold font-mono text-amber-600 mt-0.5 block">
            {draftCount}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Loss (Deficit)</span>
          <span className="text-lg font-bold font-mono text-rose-600 mt-0.5 flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            {totalDeficits}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Gain (Surplus)</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            {totalSurpluses}
          </span>
        </div>
      </div>

      {/* ── Toolbar & Filters ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-4 sm:py-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search adjustment #, reason..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft (Pending)</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready (Validated)</option>
              <option value="done">Done (Reconciled)</option>
              <option value="cancelled">Canceled</option>
            </select>

            {/* Variance Type Filter */}
            <select
              value={varianceType}
              onChange={(e) => setVarianceType(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Variances</option>
              <option value="deficit">Deficit Only (- Loss)</option>
              <option value="surplus">Surplus Only (+ Found)</option>
              <option value="exact">Zero Variance (Exact Match)</option>
            </select>
          </div>

          {/* Right: Results Count, Reset & Refresh */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-slate-500 font-mono">
              <strong className="text-slate-900">{displayedAdjustments.length}</strong> adjustments
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={refetch}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
              title="Refresh"
            >
              <RotateCcw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error State ─────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={refetch}
            className="font-semibold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            Loading inventory adjustments…
          </div>
        </div>
      )}

      {/* ── Table View ──────────────────────────────────────────────── */}
      {!isLoading && !error && (
        <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600 font-semibold select-none">
                  <th className="py-2.5 px-4">Adjustment Number</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4 text-right">System Qty</th>
                  <th className="py-2.5 px-4 text-right">Counted Qty</th>
                  <th className="py-2.5 px-4 text-center">Difference</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {displayedAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <EmptyState
                        icon={SlidersHorizontal}
                        title="No adjustments found"
                        description={
                          isFiltered
                            ? 'Try clearing your active filters to see all cycle count logs.'
                            : 'Record a new physical count adjustment to get started.'
                        }
                        actionLabel={isFiltered ? 'Clear Filters' : undefined}
                        onAction={isFiltered ? handleResetFilters : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  displayedAdjustments.map((item) => {
                    const primaryItem = item.items?.[0]
                    const systemQty = primaryItem ? parseFloat(primaryItem.systemQuantity) : 0
                    const countedQty = primaryItem ? parseFloat(primaryItem.countedQuantity) : 0
                    const difference = primaryItem ? parseFloat(primaryItem.difference) : 0
                    const unit = primaryItem?.product?.uom?.abbreviation || 'units'

                    const isNegative = difference < 0
                    const isPositive = difference > 0
                    const isZero = difference === 0

                    const productName = primaryItem?.product?.name || (item.items?.length > 1 ? `${item.items.length} line items` : 'No product lines')
                    const productSku = primaryItem?.product?.sku || (item.items?.length > 1 ? `Multi-line count` : '—')

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        {/* Adjustment Number */}
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          <Link
                            to={`/operations/adjustments/${item.id}`}
                            className="hover:text-brand transition-colors inline-flex items-center gap-1.5"
                          >
                            <span>{item.adjustmentNumber}</span>
                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-brand transition-colors" />
                          </Link>
                        </td>

                        {/* Product */}
                        <td className="py-2.5 px-4 text-slate-800">
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <Package className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={productName}>
                              {productName}
                            </span>
                          </div>
                          <div className="font-mono text-[10.5px] text-slate-500">
                            {productSku}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-2.5 px-4 text-slate-700">
                          <div className="font-mono font-medium text-slate-900 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]" title={item.location?.name}>
                              {item.location?.name || 'Stock Location'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {item.location?.fullPath || 'Internal'}
                          </div>
                        </td>

                        {/* System Qty */}
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                          {systemQty.toLocaleString()}{' '}
                          <span className="text-[10.5px] text-slate-400">{unit}</span>
                        </td>

                        {/* Counted Qty */}
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                          {countedQty.toLocaleString()}{' '}
                          <span className="text-[10.5px] font-normal text-slate-500">{unit}</span>
                        </td>

                        {/* Difference (VISUALLY PROMINENT) */}
                        <td className="py-2.5 px-4 text-center">
                          <div
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono font-bold text-xs tracking-tight shadow-2xs border select-none',
                              isNegative && 'bg-rose-50 border-rose-200 text-rose-700',
                              isPositive && 'bg-emerald-50 border-emerald-200 text-emerald-700',
                              isZero && 'bg-slate-100 border-slate-200 text-slate-600'
                            )}
                          >
                            {isNegative && <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
                            {isPositive && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
                            {isZero && <Minus className="w-3.5 h-3.5 text-slate-400" />}
                            <span>
                              {isPositive ? '+' : ''}
                              {difference.toLocaleString()} {unit}
                            </span>
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-2.5 px-4 text-slate-700">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200/70 inline-block">
                            {item.reason || 'Annual Count'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 text-center">
                          {getStatusBadge(item.status)}
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-4 text-slate-600 font-sans">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'READY' && (
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmItem(item)
                                }}
                              >
                                Apply
                              </Button>
                            )}
                            {item.status === 'DRAFT' && (
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmItem(item)
                                }}
                              >
                                Validate
                              </Button>
                            )}
                            <Link
                              to={`/operations/adjustments/${item.id}`}
                              className="px-2 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={pagination?.total ?? displayedAdjustments.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="adjustments"
          />
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────────────────── */}
      <ConfirmationModal
        isOpen={Boolean(confirmItem)}
        onClose={() => setConfirmItem(null)}
        onConfirm={handleConfirmValidation}
        title={confirmItem?.status === 'READY' ? 'Apply Adjustment to Inventory' : 'Validate Physical Count'}
        message={
          confirmItem?.status === 'READY'
            ? `Are you sure you want to reconcile ${confirmItem?.adjustmentNumber}? This will immediately update the theoretical ledger balance in warehouse inventory.`
            : `Validate ${confirmItem?.adjustmentNumber} and stage it for reconciliation?`
        }
        confirmLabel={confirmItem?.status === 'READY' ? 'Apply to Stock' : 'Confirm Validation'}
        confirmVariant="primary"
        isLoading={isProcessingAction}
      />
    </div>
  )
}
