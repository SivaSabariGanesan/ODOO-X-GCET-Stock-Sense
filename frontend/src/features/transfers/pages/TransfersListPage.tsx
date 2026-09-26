import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TablePagination } from '@/components/common/TablePagination';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useTransfers } from '../hooks/useTransfers';
import { transfersApi } from '../api';
import { warehousesApi } from '@/features/warehouses/api';
import type { ApiTransfer, ApiTransferStatus } from '../types';
import type { ApiWarehouse } from '@/features/warehouses/types';

const PAGE_SIZE = 10;

export function TransfersListPage() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceWarehouseFilter, setSourceWarehouseFilter] = useState('all');
  const [destinationWarehouseFilter, setDestinationWarehouseFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);

  // Load warehouses for warehouse filter dropdowns
  useEffect(() => {
    let isCancelled = false;
    warehousesApi
      .list({ isActive: true, limit: 100 })
      .then((res) => {
        if (!isCancelled && res.data) {
          setWarehouses(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  const {
    transfers,
    locationsMap,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateTransferStatus,
  } = useTransfers({
    search,
    status: statusFilter,
    pageSize: PAGE_SIZE,
  });

  // Client-side warehouse association filter if specified
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (sourceWarehouseFilter !== 'all') {
        const srcWhId = locationsMap[t.sourceLocationId]?.warehouseId || t.sourceLocation?.warehouseId;
        if (srcWhId !== sourceWarehouseFilter) return false;
      }
      if (destinationWarehouseFilter !== 'all') {
        const dstWhId = locationsMap[t.destinationLocationId]?.warehouseId || t.destinationLocation?.warehouseId;
        if (dstWhId !== destinationWarehouseFilter) return false;
      }
      if (dateFilter === 'active_only') {
        if (t.status === 'DONE' || t.status === 'CANCELED') return false;
      }
      return true;
    });
  }, [transfers, sourceWarehouseFilter, destinationWarehouseFilter, dateFilter, locationsMap]);

  const isFiltered =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    sourceWarehouseFilter !== 'all' ||
    destinationWarehouseFilter !== 'all' ||
    dateFilter !== 'all';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSourceWarehouseFilter('all');
    setDestinationWarehouseFilter('all');
    setDateFilter('all');
    toast.info('Filters Reset', 'Showing all internal transfers.');
  };

  const handleQuickValidate = async (t: ApiTransfer) => {
    try {
      await transfersApi.process(t.id);
      updateTransferStatus(t.id, 'DONE');
      toast.success(
        'Transfer Validated',
        `${t.transferNumber} stock relocated to destination. Company total inventory remains unchanged.`
      );
    } catch (err: any) {
      toast.error('Validation Failed', err?.message || 'Could not process transfer.');
    }
  };

  const getStatusBadge = (status: ApiTransferStatus | string) => {
    const s = String(status).toUpperCase();
    switch (s) {
      case 'READY':
        return <Badge variant="ready" dot>READY</Badge>;
      case 'DONE':
        return <Badge variant="done" dot>DONE</Badge>;
      case 'CANCELED':
      case 'CANCELLED':
        return <Badge variant="cancelled" dot>CANCELED</Badge>;
      case 'WAITING':
        return <Badge variant="warning" dot>WAITING</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="draft" dot>DRAFT</Badge>;
    }
  };

  // Summary counts
  const readyCount = transfers.filter((t) => t.status === 'READY').length;
  const draftCount = transfers.filter((t) => t.status === 'DRAFT').length;
  const doneCount = transfers.filter((t) => t.status === 'DONE').length;

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

      {/* ── Informational Semantics Banner ─── */}
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

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <Button variant="ghost" size="xs" onClick={refetch} className="shrink-0 text-rose-700 hover:bg-rose-100">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

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
                placeholder="Search transfer #, notes..."
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="cancelled">Canceled</option>
            </select>

            {/* Source Warehouse Filter */}
            <select
              value={sourceWarehouseFilter}
              onChange={(e) => setSourceWarehouseFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">Source: All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  From {wh.name} ({wh.shortCode})
                </option>
              ))}
            </select>

            {/* Destination Warehouse Filter */}
            <select
              value={destinationWarehouseFilter}
              onChange={(e) => setDestinationWarehouseFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">Dest: All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  To {wh.name} ({wh.shortCode})
                </option>
              ))}
            </select>

            {/* Date / Timeline Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">Any Timeline</option>
              <option value="active_only">Active Movements (Draft/Waiting/Ready)</option>
            </select>
          </div>

          {/* Right: Results Count & Reset */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-slate-500 font-mono">
              <strong className="text-slate-900">{pagination?.total ?? filteredTransfers.length}</strong> transfers
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
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand mb-2" />
                    <span>Loading internal transfers...</span>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
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
                filteredTransfers.map((item) => {
                  const srcLocName =
                    locationsMap[item.sourceLocationId]?.name ||
                    item.sourceLocation?.name ||
                    'Origin Location';
                  const srcFullPath =
                    locationsMap[item.sourceLocationId]?.fullPath ||
                    item.sourceLocation?.fullPath ||
                    '';

                  const dstLocName =
                    locationsMap[item.destinationLocationId]?.name ||
                    item.destinationLocation?.name ||
                    'Target Location';
                  const dstFullPath =
                    locationsMap[item.destinationLocationId]?.fullPath ||
                    item.destinationLocation?.fullPath ||
                    '';

                  const totalQty = item.items?.reduce(
                    (acc, it) => acc + (parseFloat(String(it.quantity)) || 0),
                    0
                  ) || 0;

                  const firstProduct = item.items?.[0]?.product;
                  const firstProductName =
                    firstProduct?.name || (item.items?.[0] ? `Product (${item.items[0].productId.slice(0, 8)})` : 'Empty Item');

                  return (
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
                          <span className="truncate max-w-[170px]" title={srcFullPath || srcLocName}>
                            {srcLocName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]" title={srcFullPath}>
                          {srcFullPath}
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-2.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-900 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-brand shrink-0" />
                          <span className="truncate max-w-[170px]" title={dstFullPath || dstLocName}>
                            {dstLocName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]" title={dstFullPath}>
                          {dstFullPath}
                        </div>
                      </td>

                      {/* Products */}
                      <td className="py-2.5 px-4 text-slate-800">
                        <div className="font-medium flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={firstProductName}>
                            {firstProductName}
                          </span>
                        </div>
                        {item.items && item.items.length > 1 && (
                          <div className="text-[10.5px] text-brand font-medium">
                            +{item.items.length - 1} other item{item.items.length > 2 ? 's' : ''}
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                        <span>{totalQty.toLocaleString()}</span>{' '}
                        <span className="text-[10.5px] font-normal text-slate-500">
                          {firstProduct?.uom?.abbreviation || 'units'}
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
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(item.status === 'READY' || item.status === 'DRAFT' || item.status === 'WAITING') && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickValidate(item);
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={pagination?.total ?? filteredTransfers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="transfers"
        />
      </div>
    </div>
  );
}
