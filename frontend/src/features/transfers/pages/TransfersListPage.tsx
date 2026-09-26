import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  ArrowLeftRight,
  ChevronRight,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  X,
  Info,
  ArrowRight,
  Layers,
  MapPin,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TablePagination } from '@/components/common/TablePagination'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { getMockTransfers, updateTransferStatus, TRANSFER_WAREHOUSES } from '../mockTransfers'
import { Transfer, TransferFiltersState, TransferStatus } from '../types'

const PAGE_SIZE = 10

export function TransfersListPage() {
  const toast = useToast()
  const [transfers, setTransfers] = useState<Transfer[]>(getMockTransfers())
  const [currentPage, setCurrentPage] = useState(1)

  const [filters, setFilters] = useState<TransferFiltersState>({
    search: '',
    status: 'all',
    sourceWarehouse: 'all',
    destinationWarehouse: 'all',
    dateFilter: 'all',
  })

  // ── Live Filters ──────────────────────────────────────────────────────────
  const filteredTransfers = useMemo(() => {
    const q = filters.search.toLowerCase().trim()

    return transfers.filter((t) => {
      // Search query across ref, source, dest, products
      if (q) {
        const matchesNum = t.transferNumber.toLowerCase().includes(q)
        const matchesSrc = t.sourceLocation.toLowerCase().includes(q) || t.sourceWarehouseName.toLowerCase().includes(q)
        const matchesDst = t.destinationLocation.toLowerCase().includes(q) || t.destinationWarehouseName.toLowerCase().includes(q)
        const matchesProd = t.lines.some(
          (l) => l.productName.toLowerCase().includes(q) || l.productSku.toLowerCase().includes(q)
        )
        if (!matchesNum && !matchesSrc && !matchesDst && !matchesProd) return false
      }

      // Status
      if (filters.status !== 'all' && t.status !== filters.status) {
        return false
      }

      // Source Warehouse
      if (filters.sourceWarehouse !== 'all' && t.sourceWarehouseId !== filters.sourceWarehouse) {
        return false
      }

      // Destination Warehouse
      if (filters.destinationWarehouse !== 'all' && t.destinationWarehouseId !== filters.destinationWarehouse) {
        return false
      }

      // Date Filter
      if (filters.dateFilter === 'today') {
        if (!t.scheduledDate.toLowerCase().includes('today')) return false
      } else if (filters.dateFilter === 'active_only') {
        if (t.status === 'done' || t.status === 'cancelled') return false
      }

      return true
    })
  }, [transfers, filters])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredTransfers.slice(start, start + PAGE_SIZE)
  }, [filteredTransfers, currentPage])

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.status !== 'all' ||
    filters.sourceWarehouse !== 'all' ||
    filters.destinationWarehouse !== 'all' ||
    filters.dateFilter !== 'all'

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      sourceWarehouse: 'all',
      destinationWarehouse: 'all',
      dateFilter: 'all',
    })
    toast.info('Filters Reset', 'Showing all internal transfers.')
  }

  const handleQuickValidate = (id: string, ref: string) => {
    const updated = updateTransferStatus(id, 'done')
    if (updated) {
      setTransfers(getMockTransfers())
      toast.success(
        'Transfer Validated',
        `${ref} items relocated to destination bin. Company on-hand stock remains unchanged.`
      )
    }
  }

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'ready':
        return <Badge variant="ready" dot>READY</Badge>
      case 'done':
        return <Badge variant="done" dot>DONE</Badge>
      case 'cancelled':
        return <Badge variant="cancelled" dot>CANCELED</Badge>
      case 'draft':
      default:
        return <Badge variant="draft" dot>DRAFT</Badge>
    }
  }

  // Summary counts
  const readyCount = transfers.filter((t) => t.status === 'ready').length
  const draftCount = transfers.filter((t) => t.status === 'draft').length
  const doneCount = transfers.filter((t) => t.status === 'done').length

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Internal Stock Transfers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rack-to-rack replenishment, inter-warehouse transit, and production floor stock routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/operations/transfers/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Transfer
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Informational Semantics Banner (Clearly Communicated) ─── */}
      <div className="bg-[#ede9fe]/40 border border-[#71639e]/20 rounded-lg p-3 sm:px-4 sm:py-3 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          <span className="font-semibold text-brand-dark">Stock Routing Rule: </span>
          Internal transfers change location, not total inventory. When items move between racks or warehouse facilities, physical balances are updated without altering company-wide on-hand totals.
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-500">
          <span className="px-2 py-0.5 bg-white rounded border border-slate-200">
            Ready: <strong className="text-amber-600 font-bold">{readyCount}</strong>
          </span>
          <span className="px-2 py-0.5 bg-white rounded border border-slate-200">
            Draft: <strong className="text-slate-700 font-bold">{draftCount}</strong>
          </span>
          <span className="px-2 py-0.5 bg-white rounded border border-slate-200">
            Done: <strong className="text-emerald-600 font-bold">{doneCount}</strong>
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
                placeholder="Search transfer #, location, product..."
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
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="cancelled">Canceled</option>
            </select>

            {/* Source Warehouse Filter */}
            <select
              value={filters.sourceWarehouse}
              onChange={(e) => setFilters((prev) => ({ ...prev, sourceWarehouse: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">Source: All Warehouses</option>
              {TRANSFER_WAREHOUSES.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  From {wh.name.split(' — ')[0]}
                </option>
              ))}
            </select>

            {/* Destination Warehouse Filter */}
            <select
              value={filters.destinationWarehouse}
              onChange={(e) => setFilters((prev) => ({ ...prev, destinationWarehouse: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">Dest: All Warehouses</option>
              {TRANSFER_WAREHOUSES.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  To {wh.name.split(' — ')[0]}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={filters.dateFilter}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFilter: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">Any Timeline</option>
              <option value="today">Scheduled Today</option>
              <option value="active_only">Active Movements (Draft/Ready)</option>
            </select>
          </div>

          {/* Right: Results Count & Reset */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-slate-500 font-mono">
              <strong className="text-slate-900">{filteredTransfers.length}</strong> transfers
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
                <th className="py-2.5 px-4">Transfer Number</th>
                <th className="py-2.5 px-4">Source</th>
                <th className="py-2.5 px-4">Destination</th>
                <th className="py-2.5 px-4">Products</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon={ArrowLeftRight}
                      title="No transfers found"
                      description={
                        isFiltered
                          ? 'Try clearing your active filters to see all movements.'
                          : 'Create your first internal stock transfer to begin.'
                      }
                      actionLabel={isFiltered ? 'Clear Filters' : undefined}
                      onAction={isFiltered ? handleResetFilters : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    {/* Transfer Number */}
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      <Link
                        to={`/operations/transfers/${item.id}`}
                        className="hover:text-brand transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>{item.transferNumber}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-brand transition-colors" />
                      </Link>
                    </td>

                    {/* Source */}
                    <td className="py-2.5 px-4 text-slate-700">
                      <div className="font-medium text-slate-900 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[170px]" title={item.sourceLocation}>
                          {item.sourceLocation}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                        {item.sourceWarehouseName.split(' — ')[1] || item.sourceWarehouseName}
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="py-2.5 px-4 text-slate-700">
                      <div className="font-medium text-slate-900 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-brand shrink-0" />
                        <span className="truncate max-w-[170px]" title={item.destinationLocation}>
                          {item.destinationLocation}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                        {item.destinationWarehouseName.split(' — ')[1] || item.destinationWarehouseName}
                      </div>
                    </td>

                    {/* Products */}
                    <td className="py-2.5 px-4 text-slate-800">
                      <div className="font-medium flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={item.lines[0]?.productName}>
                          {item.lines[0]?.productName}
                        </span>
                      </div>
                      {item.lines.length > 1 && (
                        <div className="text-[10.5px] text-brand font-medium">
                          +{item.lines.length - 1} other item{item.lines.length > 2 ? 's' : ''}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                      <span>{item.totalQuantity.toLocaleString()}</span>{' '}
                      <span className="text-[10.5px] font-normal text-slate-500">
                        {item.lines[0]?.unit || 'units'}
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
                        <span>{item.scheduledDate}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Created {item.createdDate}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'ready' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickValidate(item.id, item.transferNumber)
                            }}
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Validate
                          </Button>
                        )}

                        <Link
                          to={`/operations/transfers/${item.id}`}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredTransfers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="transfers"
        />
      </div>
    </div>
  )
}
