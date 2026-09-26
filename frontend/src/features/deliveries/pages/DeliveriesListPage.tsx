import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  ArrowUpFromLine,
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
import { useDeliveries } from '../hooks/useDeliveries'
import { deliveriesApi, ApiDelivery, ApiDeliveryStatus } from '../api'
import { cn } from '@/lib/cn'

const PAGE_SIZE = 10

export function DeliveriesListPage() {
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')

  const {
    deliveries,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateDeliveryStatus,
  } = useDeliveries({
    search,
    status: statusFilter,
    warehouseId: warehouseFilter,
    pageSize: PAGE_SIZE,
  })

  const isFiltered =
    Boolean(search.trim()) || statusFilter !== 'all' || warehouseFilter !== 'all'

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setWarehouseFilter('all')
    toast.info('Filters Reset', 'Showing all outbound delivery orders.')
  }

  const handleQuickDispatch = async (del: ApiDelivery) => {
    try {
      await deliveriesApi.process(del.id)
      updateDeliveryStatus(del.id, 'DONE')
      toast.success(
        'Delivery Dispatched',
        `${del.deliveryNumber} has been validated and shipped.`
      )
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to dispatch delivery.'
      toast.error('Dispatch Failed', message)
    }
  }

  const getStatusBadge = (status: ApiDeliveryStatus) => {
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

  const totalItems = pagination?.total ?? deliveries.length

  const resultSummary = useMemo(() => {
    if (!pagination) return null
    const start = (pagination.page - 1) * pagination.limit + 1
    const end = Math.min(pagination.page * pagination.limit, pagination.total)
    return { start, end, total: pagination.total }
  }, [pagination])

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
            Delivery Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Customer sales order fulfillment, warehouse pick & pack staging, and freight dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/operations/deliveries/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Delivery
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
                placeholder="Search delivery #, customer, SO..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors placeholder:text-slate-400 text-slate-800"
                aria-label="Search deliveries"
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
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
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
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Warehouse Dropdown */}
            <div className="relative">
              <select
                value={warehouseFilter}
                onChange={(e) => {
                  setWarehouseFilter(e.target.value)
                  setCurrentPage(1)
                }}
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
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* Right: Results Count, Reset & Refresh */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs">
            {resultSummary && !isLoading ? (
              <span className="font-mono text-slate-500">
                <strong className="text-slate-800 font-sans">
                  {resultSummary.start}–{resultSummary.end}
                </strong>{' '}
                of {resultSummary.total} orders
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
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading deliveries…
          </div>
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {!isLoading && !error && deliveries.length === 0 && (
        <EmptyState
          icon={ArrowUpFromLine}
          title="No deliveries match your search criteria"
          description='Try adjusting your search terms or selecting "All Warehouses" to view queued shipments.'
          actionLabel={isFiltered ? 'Reset Filters' : undefined}
          onAction={isFiltered ? handleResetFilters : undefined}
        />
      )}

      {/* ── Table Surface ───────────────────────────────────────────── */}
      {!isLoading && !error && deliveries.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 sm:px-5">Delivery Number</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Warehouse</th>
                  <th className="px-3 py-2.5 text-center">Items & Qty</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((del) => {
                  const itemCount = del.items?.length ?? 0
                  const totalQty =
                    del.items?.reduce(
                      (acc, it) => acc + (parseFloat(it.quantity) || 0),
                      0
                    ) ?? 0

                  return (
                    <tr
                      key={del.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Delivery Number */}
                      <td className="px-4 py-3 sm:px-5 whitespace-nowrap">
                        <Link
                          to={`/operations/deliveries/${del.id}`}
                          className="font-mono text-xs font-semibold text-brand hover:underline"
                        >
                          {del.deliveryNumber}
                        </Link>
                        {del.customerReference && (
                          <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                            {del.customerReference}
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-[200px]">
                          {del.customerName || 'No customer specified'}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate max-w-[200px]">
                          From: {del.defaultSourceLocation?.name || del.defaultSourceLocation?.fullPath || 'Default Location'}
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {del.warehouse?.shortCode || del.warehouseId.substring(0, 8)}
                        </span>
                        <span className="text-[10.5px] text-slate-400 block truncate max-w-[130px]">
                          {del.warehouse?.name || 'Warehouse'}
                        </span>
                      </td>

                      {/* Items & Qty */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-mono">
                        <span className="font-bold text-slate-900 text-xs">
                          {totalQty}
                        </span>{' '}
                        <span className="text-[11px] text-slate-400 font-sans">units</span>
                        <div className="text-[10.5px] text-slate-400 font-sans">
                          {itemCount} line{itemCount !== 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(del.createdAt)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getStatusBadge(del.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/operations/deliveries/${del.id}`}
                            className="px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-slate-400" />
                            <span>View</span>
                          </Link>

                          {del.status === 'READY' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleQuickDispatch(del)}
                              className="text-[11px] py-1 px-2.5 h-auto"
                            >
                              Dispatch
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="deliveries"
          />
        </div>
      )}
    </div>
  )
}
