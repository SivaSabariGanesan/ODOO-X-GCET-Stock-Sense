import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  MapPin,
  Package,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import {
  getMockAdjustments,
  updateAdjustmentStatus,
  ADJUSTMENT_REASONS,
  ADJUSTMENT_WAREHOUSES,
} from '../mockAdjustments'
import { Adjustment, AdjustmentFiltersState, AdjustmentStatus } from '../types'
import { cn } from '@/lib/cn'

export function AdjustmentsListPage() {
  const toast = useToast()
  const [adjustments, setAdjustments] = useState<Adjustment[]>(getMockAdjustments())

  // Confirmation Modal state for quick validate
  const [confirmItem, setConfirmItem] = useState<Adjustment | null>(null)

  const [filters, setFilters] = useState<AdjustmentFiltersState>({
    search: '',
    status: 'all',
    warehouse: 'all',
    reason: 'all',
    varianceType: 'all',
  })

  // ── Live Filters ──────────────────────────────────────────────────────────
  const filteredAdjustments = useMemo(() => {
    const q = filters.search.toLowerCase().trim()

    return adjustments.filter((a) => {
      // Search
      if (q) {
        const matchesNum = a.adjustmentNumber.toLowerCase().includes(q)
        const matchesSku = a.productSku.toLowerCase().includes(q)
        const matchesName = a.productName.toLowerCase().includes(q)
        const matchesLoc = a.location.toLowerCase().includes(q)
        if (!matchesNum && !matchesSku && !matchesName && !matchesLoc) return false
      }

      // Status
      if (filters.status !== 'all' && a.status !== filters.status) {
        return false
      }

      // Warehouse
      if (filters.warehouse !== 'all' && a.warehouseId !== filters.warehouse) {
        return false
      }

      // Reason
      if (filters.reason !== 'all' && a.reason !== filters.reason) {
        return false
      }

      // Variance Type
      if (filters.varianceType === 'deficit' && a.difference >= 0) return false
      if (filters.varianceType === 'surplus' && a.difference <= 0) return false
      if (filters.varianceType === 'exact' && a.difference !== 0) return false

      return true
    })
  }, [adjustments, filters])

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.status !== 'all' ||
    filters.warehouse !== 'all' ||
    filters.reason !== 'all' ||
    filters.varianceType !== 'all'

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      warehouse: 'all',
      reason: 'all',
      varianceType: 'all',
    })
    toast.info('Filters Reset', 'Displaying all inventory adjustments.')
  }

  const handleConfirmValidation = () => {
    if (!confirmItem) return
    const updated = updateAdjustmentStatus(confirmItem.id, 'done')
    if (updated) {
      setAdjustments(getMockAdjustments())
      toast.success(
        'Adjustment Validated',
        `${confirmItem.adjustmentNumber} reconciled. Stock level for ${confirmItem.productSku} updated by ${confirmItem.difference >= 0 ? '+' : ''}${confirmItem.difference} ${confirmItem.unit}.`
      )
    }
    setConfirmItem(null)
  }

  const getStatusBadge = (status: AdjustmentStatus) => {
    switch (status) {
      case 'done':
        return <Badge variant="done" dot>DONE</Badge>
      case 'cancelled':
        return <Badge variant="cancelled" dot>CANCELED</Badge>
      case 'draft':
      default:
        return <Badge variant="draft" dot>DRAFT</Badge>
    }
  }

  // Summary Metrics
  const draftCount = adjustments.filter((a) => a.status === 'draft').length
  const totalDeficits = adjustments.filter((a) => a.difference < 0).length
  const totalSurpluses = adjustments.filter((a) => a.difference > 0).length

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Inventory Adjustments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Physical cycle counts, discrepancy reconciliation, scrap write-offs, and theoretical vs. counted audits.
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
          <span className="text-[11px] font-medium text-slate-500 block">Total Recorded Audits</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {adjustments.length}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Pending Draft Signoff</span>
          <span className="text-lg font-bold font-mono text-amber-600 mt-0.5 block">
            {draftCount}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Deficit Variances (Loss)</span>
          <span className="text-lg font-bold font-mono text-rose-600 mt-0.5 block flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            {totalDeficits}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Surplus Variances (Found)</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 block flex items-center gap-1">
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
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search adjustment #, SKU, product, location..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft (Pending)</option>
              <option value="done">Done (Validated)</option>
              <option value="cancelled">Canceled</option>
            </select>

            {/* Warehouse Filter */}
            <select
              value={filters.warehouse}
              onChange={(e) => setFilters((prev) => ({ ...prev, warehouse: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Warehouses</option>
              {ADJUSTMENT_WAREHOUSES.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name.split(' — ')[0]}
                </option>
              ))}
            </select>

            {/* Variance Type Filter */}
            <select
              value={filters.varianceType}
              onChange={(e) => setFilters((prev) => ({ ...prev, varianceType: e.target.value as any }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Variances</option>
              <option value="deficit">Deficit Only (- Loss)</option>
              <option value="surplus">Surplus Only (+ Found)</option>
              <option value="exact">Zero Variance (Exact Match)</option>
            </select>

            {/* Reason Filter */}
            <select
              value={filters.reason}
              onChange={(e) => setFilters((prev) => ({ ...prev, reason: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Audit Reasons</option>
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Results Count & Reset */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-slate-500 font-mono">
              <strong className="text-slate-900">{filteredAdjustments.length}</strong> adjustments
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
          </div>
        </div>
      </div>

      {/* ── Table View ──────────────────────────────────────────────── */}
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
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <SlidersHorizontal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No adjustments found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isFiltered
                        ? 'Try clearing your active filters to see all cycle count logs.'
                        : 'Record a new physical count adjustment to get started.'}
                    </p>
                    {isFiltered && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={handleResetFilters}
                        className="mt-3"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((item) => {
                  const isNegative = item.difference < 0
                  const isPositive = item.difference > 0
                  const isZero = item.difference === 0

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
                          <span className="truncate max-w-[200px]" title={item.productName}>
                            {item.productName}
                          </span>
                        </div>
                        <div className="font-mono text-[10.5px] text-slate-500">
                          {item.productSku}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-2.5 px-4 text-slate-700">
                        <div className="font-mono font-medium text-slate-900 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]" title={item.location}>
                            {item.location}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {item.warehouseName.split(' — ')[1] || item.warehouseName}
                        </div>
                      </td>

                      {/* System Qty */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {item.systemQuantity.toLocaleString()}{' '}
                        <span className="text-[10.5px] text-slate-400">{item.unit}</span>
                      </td>

                      {/* Counted Qty */}
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                        {item.countedQuantity.toLocaleString()}{' '}
                        <span className="text-[10.5px] font-normal text-slate-500">{item.unit}</span>
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
                            {item.difference.toLocaleString()} {item.unit}
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-2.5 px-4 text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200/70 inline-block">
                          {item.reason}
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
                          <span>{item.createdDate}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          By {item.adjustedBy}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'draft' && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmItem(item)
                              }}
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Validate
                            </Button>
                          )}

                          <Link
                            to={`/operations/adjustments/${item.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="xs" className="h-7 px-2 text-slate-500 hover:text-slate-800">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
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

        {/* ── Table Footer ──────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Displaying {filteredAdjustments.length} of {adjustments.length} adjustment records
          </span>
          <span className="text-[11px] text-slate-400">
            Net physical variance:{' '}
            <strong className="text-slate-800 font-mono">
              {filteredAdjustments.reduce((acc, c) => acc + c.difference, 0) >= 0 ? '+' : ''}
              {filteredAdjustments.reduce((acc, c) => acc + c.difference, 0).toLocaleString()} units
            </strong>
          </span>
        </div>
      </div>

      {/* ── Confirmation Modal Before Validation ────────────────────── */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-[fadeIn_100ms_ease-out]">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Confirm Inventory Adjustment Validation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to officially reconcile the theoretical system balance with the physical floor count.
                </p>
              </div>
            </div>

            {/* Adjustment Details Callout */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Adjustment Ref:</span>
                <span className="font-mono font-bold text-slate-900">{confirmItem.adjustmentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-medium text-slate-900 text-right truncate max-w-[220px]">{confirmItem.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-mono text-slate-800">{confirmItem.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reason:</span>
                <span className="font-medium text-slate-800">{confirmItem.reason}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-700">Net Variance (Difference):</span>
                <span
                  className={cn(
                    'font-mono font-bold text-sm px-2 py-0.5 rounded border',
                    confirmItem.difference < 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : confirmItem.difference > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  )}
                >
                  {confirmItem.difference > 0 ? '+' : ''}{confirmItem.difference} {confirmItem.unit}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Once validated, the theoretical stock will be adjusted by{' '}
              <strong className="text-slate-900 font-mono">
                {confirmItem.difference > 0 ? '+' : ''}{confirmItem.difference} {confirmItem.unit}
              </strong>. This action will be permanently recorded in the immutable audit ledger.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmValidation}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Confirm & Validate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
