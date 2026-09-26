import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  ArrowDownToLine,
  RotateCcw,
  Eye,
  Clock,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TablePagination } from '@/components/common/TablePagination'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useReceipts } from '../hooks/useReceipts'
import { receiptsApi, ApiReceipt, ApiReceiptStatus } from '../api'
import { cn } from '@/lib/cn'

export function ReceiptsListPage() {
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')

  const {
    receipts,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateReceiptStatus,
  } = useReceipts({ search, status: statusFilter, warehouseId: warehouseFilter, pageSize: 10 })

  const isFiltered =
    Boolean(search.trim()) || statusFilter !== 'all' || warehouseFilter !== 'all'

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setWarehouseFilter('all')
    toast.info('Filters Reset', 'Showing all warehouse receipts.')
  }

  const handleQuickProcess = async (rec: ApiReceipt) => {
    try {
      // If READY → process (DONE). If DRAFT/WAITING → validate first then process.
      if (rec.status === 'READY') {
        await receiptsApi.process(rec.id)
        updateReceiptStatus(rec.id, 'DONE')
        toast.success('Receipt Validated', `${rec.receiptNumber} validated and stock added to inventory.`)
      } else {
        // Validate → READY
        await receiptsApi.validate(rec.id)
        updateReceiptStatus(rec.id, 'READY')
        toast.info('Receipt Validated', `${rec.receiptNumber} is now ready to receive.`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed. Please try again.'
      toast.error('Action Failed', message)
    }
  }

  const getStatusBadge = (status: ApiReceiptStatus) => {
    switch (status) {
      case 'READY':
        return <Badge variant="ready" dot>READY</Badge>
      case 'WAITING':
        return <Badge variant="warning" dot>WAITING</Badge>
      case 'DONE':
        return <Badge variant="done" dot>DONE</Badge>
      case 'CANCELED':
        return <Badge variant="cancelled" dot>CANCELED</Badge>
      case 'DRAFT':
      default:
        return <Badge variant="draft" dot>DRAFT</Badge>
    }
  }

  const totalItems = pagination?.total ?? receipts.length

  // Client-side convenience: show total count from meta
  const resultSummary = useMemo(() => {
    if (!pagination) return null
    const start = (pagination.page - 1) * pagination.limit + 1
    const end = Math.min(pagination.page * pagination.limit, pagination.total)
    return { start, end, total: pagination.total }
  }, [pagination])

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Inbound Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Vendor purchase order receipts, unloading dock queues, and goods receiving inspection.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/operations/receipts/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Receipt
            </Button>
          </Link>
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
                placeholder="Search receipt #, supplier, PO..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors placeholder:text-slate-400 text-slate-800"
                aria-label="Search receipts"
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

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                  statusFilter !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Status"
              >
                <option value="all">Status: All</option>
                <option value="draft">Status: Draft</option>
                <option value="waiting">Status: Waiting</option>
                <option value="ready">Status: Ready</option>
                <option value="done">Status: Done</option>
                <option value="cancelled">Status: Canceled</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>

            {/* Warehouse Dropdown */}
            <div className="relative">
              <select
                value={warehouseFilter}
                onChange={(e) => { setWarehouseFilter(e.target.value); setCurrentPage(1) }}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium max-w-[190px] truncate',
                  warehouseFilter !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Warehouse"
              >
                <option value="all">Warehouse: All</option>
                <option value="WH01">WH01 — Main Central Warehouse</option>
                <option value="WH02">WH02 — North Distribution Hub</option>
                <option value="WH03">WH03 — Cold Storage Facility</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
          </div>

          {/* Right: Results & Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs">
            {resultSummary && !isLoading ? (
              <span className="font-mono text-slate-500">
                <strong className="text-slate-800 font-sans">{resultSummary.start}–{resultSummary.end}</strong> of {resultSummary.total} receipts
              </span>
            ) : (
              <span className="font-mono text-slate-400">Loading…</span>
            )}

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-brand hover:text-brand-dark hover:underline font-medium cursor-pointer"
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
            className="font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading receipts…
          </div>
        </div>
      )}

      {/* ── Table Surface ───────────────────────────────────────────── */}
      {!isLoading && !error && receipts.length === 0 && (
        <EmptyState
          icon={ArrowDownToLine}
          title="No receipts match your search criteria"
          description="Try resetting your filters or clearing search text to view all inbound receipts."
          actionLabel={isFiltered ? 'Reset Filters' : undefined}
          onAction={isFiltered ? handleResetFilters : undefined}
        />
      )}

      {!isLoading && !error && receipts.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 sm:px-5">Receipt Number</th>
                  <th className="px-3 py-2.5">Supplier</th>
                  <th className="px-3 py-2.5">Warehouse</th>
                  <th className="px-3 py-2.5 text-center">Items</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Created</th>
                  <th className="px-4 py-2.5 text-right sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Receipt Number */}
                    <td className="px-4 py-3 sm:px-5 whitespace-nowrap">
                      <Link
                        to={`/operations/receipts/${rec.id}`}
                        className="font-mono text-xs font-semibold text-brand hover:underline"
                      >
                        {rec.receiptNumber}
                      </Link>
                      {rec.supplierReference && (
                        <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                          {rec.supplierReference}
                        </div>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900 truncate max-w-[200px]">
                        {rec.supplierName || <span className="text-slate-400 italic">No supplier</span>}
                      </div>
                      {rec.defaultLocation && (
                        <div className="text-[10.5px] text-slate-400 truncate max-w-[200px]">
                          → {rec.defaultLocation.fullPath}
                        </div>
                      )}
                    </td>

                    {/* Warehouse */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {rec.warehouse ? (
                        <>
                          <span className="font-semibold text-slate-800">{rec.warehouse.shortCode}</span>
                          <span className="text-[10.5px] text-slate-400 block truncate max-w-[130px]">
                            {rec.warehouse.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">{rec.warehouseId.slice(0, 8)}…</span>
                      )}
                    </td>

                    {/* Items count */}
                    <td className="px-3 py-3 text-center whitespace-nowrap font-mono">
                      <span className="font-bold text-slate-900 text-xs">
                        {rec.items.length}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400 font-sans">
                        line{rec.items.length !== 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getStatusBadge(rec.status)}
                    </td>

                    {/* Created Date */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/operations/receipts/${rec.id}`}
                          className="px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span>View</span>
                        </Link>

                        {(rec.status === 'READY' || rec.status === 'DRAFT' || rec.status === 'WAITING') && (
                          <Button
                            variant={rec.status === 'READY' ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handleQuickProcess(rec)}
                            className="text-[11px] py-1 px-2.5 h-auto"
                          >
                            {rec.status === 'READY' ? 'Receive' : 'Validate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && (
            <TablePagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={10}
              onPageChange={setCurrentPage}
              itemLabel="receipts"
            />
          )}
        </div>
      )}
    </div>
  )
}