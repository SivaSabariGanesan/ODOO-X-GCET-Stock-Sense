import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  History,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Clock,
  User,
  ShieldCheck,
  Copy,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useStockMovements } from '../hooks/useStockMovements'
import { StockMove, MoveFiltersState, MovementType } from '../types'
import { apiClient } from '@/lib/apiClient'
import { cn } from '@/lib/cn'

const PAGE_SIZE = 10

interface WarehouseOption {
  id: string
  name: string
  shortCode: string
}

interface LocationOption {
  id: string
  name: string
  fullPath: string
  warehouseId: string
}

export function MoveHistoryPage() {
  const toast = useToast()

  // Selected movement for side drawer inspection
  const [selectedMove, setSelectedMove] = useState<StockMove | null>(null)

  // Filters State
  const [filters, setFilters] = useState<MoveFiltersState>({
    search: '',
    movementType: 'all',
    warehouse: 'all',
    location: 'all',
    dateRange: 'all',
  })

  // Dynamic filter dropdown options fetched from backend
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])

  useEffect(() => {
    let isMounted = true

    apiClient
      .get<{ data: WarehouseOption[] }>('/api/warehouses')
      .then((res) => {
        if (isMounted && res?.data) {
          setWarehouses(res.data)
        }
      })
      .catch(() => {
        // Fallback gracefully if warehouses endpoint is restricted
      })

    apiClient
      .get<{ data: LocationOption[] }>('/api/locations')
      .then((res) => {
        if (isMounted && res?.data) {
          setLocations(res.data)
        }
      })
      .catch(() => {
        // Fallback gracefully if locations endpoint is restricted
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Hook for server-side fetching with search debouncing, filtering & pagination
  const {
    movements,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
  } = useStockMovements({
    search: filters.search,
    movementType: filters.movementType,
    warehouseId: filters.warehouse,
    locationId: filters.location,
    dateRange: filters.dateRange,
    pageSize: PAGE_SIZE,
  })

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedMove) {
        setSelectedMove(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMove])

  // Filter locations by chosen warehouse if applicable
  const availableLocations = useMemo(() => {
    if (filters.warehouse === 'all') return locations
    return locations.filter((loc) => loc.warehouseId === filters.warehouse)
  }, [locations, filters.warehouse])

  const totalPages = pagination?.totalPages ?? 1
  const totalItems = pagination?.total ?? movements.length

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.movementType !== 'all' ||
    filters.warehouse !== 'all' ||
    filters.location !== 'all' ||
    filters.dateRange !== 'all'

  const handleResetFilters = () => {
    setFilters({
      search: '',
      movementType: 'all',
      warehouse: 'all',
      location: 'all',
      dateRange: 'all',
    })
    setCurrentPage(1)
    toast.info('Filters Reset', 'Displaying all recorded inventory movements.')
  }

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  // Type badge styling helper
  const getMovementTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'receipt':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 select-none">
            <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
            Receipt
          </span>
        )
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 select-none">
            <ArrowUpFromLine className="w-3 h-3 text-sky-600" />
            Delivery
          </span>
        )
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ede9fe] text-brand-dark border border-brand/20 select-none">
            <ArrowLeftRight className="w-3 h-3 text-brand" />
            Transfer
          </span>
        )
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 select-none">
            <SlidersHorizontal className="w-3 h-3 text-amber-600" />
            Adjustment
          </span>
        )
    }
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Move History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View stock movement history.
          </p>
        </div>
      </div>

      {/* ── Toolbar & Filters ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-4 sm:py-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filters List */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search product, SKU, reference, user..."
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

            {/* Movement Type Filter */}
            <select
              value={filters.movementType}
              onChange={(e) => setFilters((prev) => ({ ...prev, movementType: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Movement Types</option>
              <option value="receipt">Receipt (Inbound)</option>
              <option value="delivery">Delivery (Outbound)</option>
              <option value="transfer">Internal Transfer</option>
              <option value="adjustment">Stock Adjustment</option>
            </select>

            {/* Warehouse Filter */}
            <select
              value={filters.warehouse}
              onChange={(e) => setFilters((prev) => ({ ...prev, warehouse: e.target.value, location: 'all' }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.shortCode} — {wh.name}
                </option>
              ))}
            </select>

            {/* Location Filter */}
            <select
              value={filters.location}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer font-mono"
            >
              <option value="all">All Locations</option>
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.fullPath || loc.name}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Recorded Dates</option>
              <option value="today">Today</option>
              <option value="last_7">Last 7 Days</option>
              <option value="last_30">Last 30 Days</option>
            </select>
          </div>

          {/* Right: Results Count & Reset / Refresh */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-slate-500 font-mono">
              <strong className="text-slate-900">{totalItems}</strong> ledger entries
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
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Refresh ledger"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-brand')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            onClick={refetch}
            className="font-semibold underline hover:no-underline cursor-pointer text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Data-Dense Table View ──────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        {/* Loading state indicator */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span>Loading stock movement ledger...</span>
          </div>
        )}

        {/* Empty state when no moves and not loading */}
        {!isLoading && !error && movements.length === 0 && (
          <EmptyState
            icon={History}
            title={isFiltered ? 'No stock movements match your filters' : 'No stock movements recorded yet'}
            description={
              isFiltered
                ? 'Try clearing or relaxing your active search and filter criteria.'
                : 'Stock movements will appear here automatically when receipts, deliveries, transfers, or inventory adjustments are recorded.'
            }
            actionLabel={isFiltered ? 'Clear Filters' : undefined}
            onAction={isFiltered ? handleResetFilters : undefined}
          />
        )}

        {/* Table content when loaded */}
        {!isLoading && !error && movements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600 font-semibold select-none">
                  <th className="py-2.5 px-3.5">Date / Time</th>
                  <th className="py-2.5 px-3.5">Product</th>
                  <th className="py-2.5 px-3.5">SKU</th>
                  <th className="py-2.5 px-3.5">Type</th>
                  <th className="py-2.5 px-3.5">Source Location</th>
                  <th className="py-2.5 px-3.5">Destination Location</th>
                  <th className="py-2.5 px-3.5 text-right">Quantity</th>
                  <th className="py-2.5 px-3.5">Reference</th>
                  <th className="py-2.5 px-3.5">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {movements.map((m) => {
                  const isSelected = selectedMove?.id === m.id
                  const isPositive = m.quantity > 0
                  const isNegative = m.quantity < 0

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMove(m)}
                      className={cn(
                        'transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-[#ede9fe]/50 font-medium text-slate-900'
                          : 'hover:bg-slate-50/80 text-slate-700'
                      )}
                    >
                      {/* Date/Time */}
                      <td className="py-2 px-3.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        <div className="font-semibold text-slate-800">{m.date}</div>
                        <div className="text-[10px] text-slate-400">{m.time}</div>
                      </td>

                      {/* Product */}
                      <td className="py-2 px-3.5 max-w-[210px]">
                        <span className="font-medium text-slate-900 truncate block" title={m.productName}>
                          {m.productName}
                        </span>
                        <span className="text-[10.5px] text-slate-400 truncate block">
                          {m.productCategory}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="py-2 px-3.5 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                        {m.productSku}
                      </td>

                      {/* Movement Type */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        {getMovementTypeBadge(m.movementType)}
                      </td>

                      {/* Source Location */}
                      <td className="py-2 px-3.5 font-mono text-[11px] text-slate-600 max-w-[160px] truncate" title={m.sourceLocation}>
                        {m.sourceLocation}
                      </td>

                      {/* Destination Location */}
                      <td className="py-2 px-3.5 font-mono text-[11px] text-slate-800 max-w-[160px] truncate font-medium" title={m.destinationLocation}>
                        {m.destinationLocation}
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={cn(
                            m.movementType === 'transfer'
                              ? 'text-brand-dark'
                              : isPositive
                              ? 'text-emerald-700'
                              : isNegative
                              ? 'text-rose-700'
                              : 'text-slate-600'
                          )}
                        >
                          {m.movementType !== 'transfer' && isPositive ? '+' : ''}
                          {m.quantity.toLocaleString()} {m.unit}
                        </span>
                      </td>

                      {/* Reference */}
                      <td className="py-2 px-3.5 font-mono font-medium text-slate-800 whitespace-nowrap">
                        <span className="hover:text-brand hover:underline">
                          {m.reference}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-2 px-3.5 text-slate-600 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                            {m.user.slice(0, 1).toUpperCase()}
                          </div>
                          <span>{m.user}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Table Footer & Pagination ─────────────────────────────── */}
        {!isLoading && !error && movements.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center gap-2">
              <span>
                Showing{' '}
                <strong className="text-slate-800 font-mono">
                  {totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800 font-mono">
                  {Math.min(currentPage * PAGE_SIZE, totalItems)}
                </strong>{' '}
                of <strong className="text-slate-800 font-mono">{totalItems}</strong> moves
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-400">
                Click any row to inspect details without disrupting table
              </span>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                  Previous
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-6 h-6 rounded text-xs font-mono font-medium transition-colors cursor-pointer',
                        page === currentPage
                          ? 'bg-brand text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Slide-Over Inspection Drawer (Non-disruptive Detail) ───── */}
      {selectedMove && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-[fadeIn_150ms_ease-out]">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-2xs transition-opacity"
            onClick={() => setSelectedMove(null)}
          />

          {/* Flyout Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 text-xs overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#ede9fe] text-brand-dark flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedMove.reference}
                    </span>
                    {getMovementTypeBadge(selectedMove.movementType)}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Tx ID: {selectedMove.transactionId}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMove(null)}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Close inspection panel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
              {/* Product Info Card */}
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Product
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      {selectedMove.productName}
                    </h3>
                    <span className="font-mono text-xs text-slate-600 block mt-0.5">
                      {selectedMove.productSku} &middot; {selectedMove.productCategory}
                    </span>
                  </div>
                  <Link
                    to={`/products/${selectedMove.productId}`}
                    className="text-brand hover:underline inline-flex items-center gap-1 font-medium text-xs shrink-0"
                  >
                    <span>View Product</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Physical Route Flow */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-3">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Movement Path
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">From (Source)</span>
                    <span className="font-mono font-medium text-slate-800 text-xs block mt-0.5 truncate">
                      {selectedMove.sourceLocation}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">To (Destination)</span>
                    <span className="font-mono font-medium text-slate-800 text-xs block mt-0.5 truncate">
                      {selectedMove.destinationLocation}
                    </span>
                  </div>
                </div>

                {/* Net Stock Impact */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Quantity:</span>
                  <span
                    className={cn(
                      'font-mono font-bold text-sm px-2 py-0.5 rounded border',
                      selectedMove.movementType === 'transfer'
                        ? 'bg-[#ede9fe] text-brand-dark border-brand/20'
                        : selectedMove.quantity > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    )}
                  >
                    {selectedMove.movementType !== 'transfer' && selectedMove.quantity > 0 ? '+' : ''}
                    {selectedMove.quantity.toLocaleString()} {selectedMove.unit}
                  </span>
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="space-y-3 border-t border-slate-200/80 pt-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Warehouse:</span>
                  <span className="font-medium text-slate-800">{selectedMove.warehouseName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Date & Time:</span>
                  <span className="font-mono text-slate-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {selectedMove.timestamp}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">User:</span>
                  <span className="font-medium text-slate-800 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {selectedMove.user}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono font-semibold text-brand">
                    {selectedMove.reference}
                  </span>
                </div>
              </div>

              {/* Ledger Operational Notes */}
              {selectedMove.notes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[11px] mb-1">Notes</span>
                  <p className="text-slate-700">{selectedMove.notes}</p>
                </div>
              )}

              {/* Stock Semantics Help Banner */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-normal flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {selectedMove.movementType === 'transfer'
                    ? 'Internal transfers alter storage bin location while maintaining company-wide aggregate on-hand levels.'
                    : selectedMove.movementType === 'receipt'
                    ? 'Inbound receipts increase recorded physical stock on hand upon dock sign-off.'
                    : selectedMove.movementType === 'delivery'
                    ? 'Outbound deliveries decrement on-hand inventory balances upon vehicle dispatch.'
                    : 'Inventory adjustments reconcile theoretical book stock with physical counts.'}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => copyText(selectedMove.id, 'Stock Movement ID')}
                leftIcon={<Copy className="w-3 h-3" />}
              >
                Copy ID
              </Button>

              <div className="flex items-center gap-2">
                {selectedMove.referenceUrl && (
                  <Link to={selectedMove.referenceUrl}>
                    <Button variant="secondary" size="xs" leftIcon={<ExternalLink className="w-3 h-3" />}>
                      Open {selectedMove.reference}
                    </Button>
                  </Link>
                )}
                <Button variant="primary" size="xs" onClick={() => setSelectedMove(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
