import { Link } from 'react-router-dom'
import {
  Boxes,
  Search,
  RotateCcw,
  SlidersHorizontal,
  History,
  Package,
  AlertCircle,
  Warehouse,
  MapPin,
  X,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TablePagination } from '@/components/common/TablePagination'
import { useStockBalances } from '../hooks'
import { cn } from '@/lib/cn'

export function StockBalancesListPage() {
  const {
    balances,
    pagination,
    page,
    setPage,
    isLoading,
    error,
    filters,
    searchInput,
    warehouseOptions,
    locationOptions,
    metrics,
    handleSearchChange,
    handleWarehouseChange,
    handleLocationChange,
    handleHasStockToggle,
    handleResetFilters,
    refetch,
  } = useStockBalances()

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.warehouseId !== 'all' ||
    filters.locationId !== 'all' ||
    filters.hasStockOnly

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Stock Balances & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Authoritative physical inventory ledger: multi-location on-hand balances, reserved allocations, and net available stock.
          </p>
        </div>

        {/* Global Action Strip */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={refetch}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh inventory balances"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          <Link to="/operations/adjustments/new">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              Adjust Count
            </Button>
          </Link>

          <Link to="/operations/moves">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<History className="w-3.5 h-3.5" />}
            >
              Move History
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Summary Metric Strip ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs">
        {/* Metric 1: Total On-Hand */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total On-Hand
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded text-brand-dark bg-[#ede9fe] border border-brand/20">
              Ledger
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-2">
            {metrics.totalOnHand.toLocaleString()}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">units</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Aggregate physical stock in locations</p>
        </div>

        {/* Metric 2: Reserved Buffer */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Allocated Reserved
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded text-amber-700 bg-amber-50 border border-amber-200">
              Orders
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-800 mt-2">
            {metrics.totalReserved.toLocaleString()}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">units</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Committed to pending pick & dispatches</p>
        </div>

        {/* Metric 3: Net Available */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Net Available
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded text-emerald-700 bg-emerald-50 border border-emerald-200">
              Uncommitted
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700 mt-2">
            {metrics.totalAvailable.toLocaleString()}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">units</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Free stock ready for immediate delivery</p>
        </div>

        {/* Metric 4: Active Locations */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Storage Bins
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded text-slate-600 bg-slate-100">
              Active
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-2">
            {metrics.trackedLocationsCount}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">locations</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Bins holding positive stock</p>
        </div>
      </div>

      {/* ── Filter Toolbar ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-4 sm:py-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Controls Group */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search SKU, product, or location..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors placeholder:text-slate-400 text-slate-800"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Warehouse Select */}
            <div className="relative">
              <select
                value={filters.warehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium max-w-[200px] truncate',
                  filters.warehouseId !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Warehouse"
              >
                <option value="all">All Warehouses</option>
                {warehouseOptions.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.shortCode} — {wh.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Location Select */}
            <div className="relative">
              <select
                value={filters.locationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium max-w-[200px] truncate',
                  filters.locationId !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Location"
              >
                <option value="all">All Storage Bins</option>
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.fullPath || loc.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Has Stock Toggle */}
            <button
              type="button"
              onClick={handleHasStockToggle}
              className={cn(
                'px-2.5 py-1.5 text-xs rounded-md border transition-colors cursor-pointer font-medium select-none',
                filters.hasStockOnly
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              {filters.hasStockOnly ? '✓ In-Stock Only' : 'Show All Balances'}
            </button>
          </div>

          {/* Reset Action */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="text-xs text-slate-500 font-mono">
              <span className="font-sans font-medium text-slate-700">{pagination.total}</span> records found
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-brand hover:text-brand-dark hover:bg-[#ede9fe]/60 transition-colors font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table / Skeleton / Error Surface ─────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-8 bg-slate-100 rounded w-1/3" />
            <div className="h-64 bg-slate-100/70 rounded" />
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">Failed to load stock balances</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
            <Button variant="secondary" size="sm" onClick={refetch} className="mt-4">
              Retry Query
            </Button>
          </div>
        ) : balances.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No stock balances found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No inventory balance records matched your selected warehouse, location, or search query.
            </p>
            {isFiltered && (
              <Button variant="secondary" size="sm" onClick={handleResetFilters} className="mt-4">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th className="px-4 py-3 sm:px-5">Product SKU & Name</th>
                  <th className="px-3 py-3">Warehouse Node</th>
                  <th className="px-3 py-3">Storage Bin Location</th>
                  <th className="px-3 py-3 text-right">On-Hand Stock</th>
                  <th className="px-3 py-3 text-right">Reserved</th>
                  <th className="px-3 py-3 text-right">Available Stock</th>
                  <th className="px-3 py-3 text-center">UOM</th>
                  <th className="px-3 py-3">Last Movement</th>
                  <th className="px-4 py-3 sm:pr-5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map((b) => {
                  const onHand = parseFloat(b.quantity || '0')
                  const reserved = parseFloat(b.reservedQuantity || '0')
                  const available = parseFloat(b.availableQuantity ?? String(onHand - reserved))
                  const isOutOfStock = onHand <= 0

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Product Name & SKU */}
                      <td className="px-4 py-3 sm:px-5 max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/products/${b.productId}`}
                            className="font-mono text-xs font-semibold text-brand hover:underline"
                          >
                            {b.productSku || 'SKU'}
                          </Link>
                          {isOutOfStock && (
                            <Badge variant="danger" dot className="text-[10px]">
                              EMPTY
                            </Badge>
                          )}
                        </div>
                        <div className="font-medium text-slate-900 truncate mt-0.5" title={b.productName}>
                          {b.productName || 'Unknown Product'}
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.warehouseShortCode || 'WH'}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate max-w-[130px]">
                          {b.warehouseName || 'Warehouse'}
                        </div>
                      </td>

                      {/* Storage Location */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800">
                          <MapPin className="w-3 h-3 text-brand shrink-0" />
                          <span>{b.locationFullPath || b.locationName || 'Bin Location'}</span>
                        </div>
                      </td>

                      {/* On-Hand Quantity */}
                      <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold text-slate-900 text-xs">
                        {onHand.toLocaleString()}
                      </td>

                      {/* Reserved Quantity */}
                      <td className="px-3 py-3 text-right whitespace-nowrap font-mono text-slate-500 text-xs">
                        {reserved > 0 ? (
                          <span className="text-amber-700 font-semibold">{reserved.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Net Available Quantity */}
                      <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold text-xs">
                        <span className={available > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                          {available.toLocaleString()}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-sans text-xs text-slate-500">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">
                          {b.uomAbbreviation || b.uomName || 'units'}
                        </span>
                      </td>

                      {/* Last Movement */}
                      <td className="px-3 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {b.lastMovedAt ? (
                          new Date(b.lastMovedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-slate-300">No activity</span>
                        )}
                      </td>

                      {/* Operations / Navigation */}
                      <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/operations/moves?search=${encodeURIComponent(b.productSku || '')}`}
                            title="View Move History"
                          >
                            <Button variant="ghost" size="xs" className="h-7 px-2 text-slate-500 hover:text-brand">
                              <History className="w-3.5 h-3.5 mr-1" />
                              <span>History</span>
                            </Button>
                          </Link>

                          <Link
                            to={`/products/${b.productId}`}
                            title="View Product Details"
                          >
                            <Button variant="ghost" size="xs" className="h-7 px-2 text-slate-500 hover:text-brand">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
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
        <div className="border-t border-slate-100">
          <TablePagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}
