import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  ArrowDownToLine,
  ChevronRight,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { getMockReceipts, updateReceiptStatus } from '../mockReceipts'
import { Receipt, ReceiptFiltersState, ReceiptStatus } from '../types'
import { cn } from '@/lib/cn'

export function ReceiptsListPage() {
  const toast = useToast()
  const [receipts, setReceipts] = useState<Receipt[]>(getMockReceipts())

  const [filters, setFilters] = useState<ReceiptFiltersState>({
    search: '',
    status: 'all',
    warehouse: 'all',
    dateFilter: 'all',
  })

  // ── Live Filters ──────────────────────────────────────────────────────────
  const filteredReceipts = useMemo(() => {
    const q = filters.search.toLowerCase().trim()

    return receipts.filter((r) => {
      // Search
      if (q) {
        const matchesNum = r.receiptNumber.toLowerCase().includes(q)
        const matchesSupplier = r.supplier.toLowerCase().includes(q)
        const matchesRef = r.supplierReference?.toLowerCase().includes(q)
        const matchesWh = r.warehouseName.toLowerCase().includes(q)
        if (!matchesNum && !matchesSupplier && !matchesRef && !matchesWh) return false
      }

      // Status
      if (filters.status !== 'all' && r.status !== filters.status) {
        return false
      }

      // Warehouse
      if (filters.warehouse !== 'all' && r.warehouseId !== filters.warehouse) {
        return false
      }

      // Date Filter
      if (filters.dateFilter === 'today') {
        if (!r.scheduledDate.toLowerCase().includes('today')) return false
      } else if (filters.dateFilter === 'past_due') {
        if (r.status === 'done' || r.status === 'cancelled') return false
      }

      return true
    })
  }, [receipts, filters])

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.status !== 'all' ||
    filters.warehouse !== 'all' ||
    filters.dateFilter !== 'all'

  const handleResetFilters = () => {
    setFilters({ search: '', status: 'all', warehouse: 'all', dateFilter: 'all' })
    toast.info('Filters Reset', 'Showing all warehouse receipts.')
  }

  const handleQuickValidate = (id: string, ref: string) => {
    const updated = updateReceiptStatus(id, 'done')
    if (updated) {
      setReceipts(getMockReceipts())
      toast.success('Receipt Validated', `${ref} has been validated and stock added to inventory.`)
    }
  }

  const getStatusBadge = (status: ReceiptStatus) => {
    switch (status) {
      case 'ready':
        return <Badge variant="ready" dot>READY</Badge>
      case 'waiting':
        return <Badge variant="warning" dot>WAITING</Badge>
      case 'done':
        return <Badge variant="done" dot>DONE</Badge>
      case 'cancelled':
        return <Badge variant="cancelled" dot>CANCELED</Badge>
      case 'draft':
      default:
        return <Badge variant="draft" dot>DRAFT</Badge>
    }
  }

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
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search receipt #, supplier, PO..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors placeholder:text-slate-400 text-slate-800"
                aria-label="Search receipts"
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

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                  filters.status !== 'all'
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
                value={filters.warehouse}
                onChange={(e) => setFilters((prev) => ({ ...prev, warehouse: e.target.value }))}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium max-w-[190px] truncate',
                  filters.warehouse !== 'all'
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

            {/* Date Filter */}
            <div className="relative">
              <select
                value={filters.dateFilter}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFilter: e.target.value }))}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                  filters.dateFilter !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Date"
              >
                <option value="all">Date: All</option>
                <option value="today">Date: Arriving Today</option>
                <option value="past_due">Date: Active Intake Queue</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* Right: Results Count & Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs">
            <span className="font-mono text-slate-500">
              <strong className="text-slate-800 font-sans">{filteredReceipts.length}</strong> of {receipts.length} receipts
            </span>

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
          </div>
        </div>
      </div>

      {/* ── Table Surface ───────────────────────────────────────────── */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-lg p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            No receipts match your search criteria
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your filters or clearing search text to view all inbound receipts.
          </p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 sm:px-5">Receipt Number</th>
                  <th className="px-3 py-2.5">Supplier</th>
                  <th className="px-3 py-2.5">Warehouse</th>
                  <th className="px-3 py-2.5 text-center">Items & Qty</th>
                  <th className="px-3 py-2.5">Scheduled Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Created Date</th>
                  <th className="px-4 py-2.5 text-right sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map((rec) => (
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
                        {rec.supplier}
                      </div>
                      <div className="text-[10.5px] text-slate-400 truncate max-w-[200px]">
                        → {rec.destinationLocation}
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      <span className="font-semibold text-slate-800">{rec.warehouseId}</span>
                      <span className="text-[10.5px] text-slate-400 block truncate max-w-[130px]">
                        {rec.warehouseName.split(' — ')[1] || rec.warehouseName}
                      </span>
                    </td>

                    {/* Items & Qty */}
                    <td className="px-3 py-3 text-center whitespace-nowrap font-mono">
                      <span className="font-bold text-slate-900 text-xs">
                        {rec.totalQuantity}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400 font-sans">units</span>
                      <div className="text-[10.5px] text-slate-400 font-sans">
                        {rec.itemCount} line{rec.itemCount !== 1 ? 's' : ''}
                      </div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rec.scheduledDate}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getStatusBadge(rec.status)}
                    </td>

                    {/* Created Date */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {rec.createdDate}
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

                        {rec.status === 'ready' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleQuickValidate(rec.id, rec.receiptNumber)}
                            className="text-[11px] py-1 px-2.5 h-auto"
                          >
                            Validate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
