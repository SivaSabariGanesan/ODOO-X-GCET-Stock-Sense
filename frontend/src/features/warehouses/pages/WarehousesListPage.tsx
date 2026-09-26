import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Warehouse as WarehouseIcon,
  ChevronRight,
  Eye,
  MapPin,
  Package,
  Layers,
  Activity,
  AlertTriangle,
  X,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getMockWarehouses } from '../mockWarehouses'
import { Warehouse } from '../types'
import { cn } from '@/lib/cn'

export function WarehousesListPage() {
  const warehouses = getMockWarehouses()
  const [search, setSearch] = useState('')

  const filteredWarehouses = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return warehouses

    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.address.toLowerCase().includes(q) ||
        w.manager.toLowerCase().includes(q)
    )
  }, [warehouses, search])

  // Aggregate metrics
  const totalLocationsCount = warehouses.reduce((acc, w) => acc + w.totalLocations, 0)
  const totalStockCount = warehouses.reduce((acc, w) => acc + w.totalStockUnits, 0)
  const avgUtilization = Math.round(
    warehouses.reduce((acc, w) => acc + w.capacityUtilization, 0) / warehouses.length
  )

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Warehouses & Facilities
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Physical distribution centers, fulfillment hubs, selective rack tiers, and location topology.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-lg shadow-2xs">
          <WarehouseIcon className="w-4 h-4 text-brand" />
          <span>Active Nodes: </span>
          <strong className="text-slate-800">{warehouses.length} Facilities Online</strong>
        </div>
      </div>

      {/* ── Top Metric Summary Strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Facilities</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {warehouses.length} Nodes
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">100% Operational status</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Storage Locations</span>
          <span className="text-lg font-bold font-mono text-brand-dark mt-0.5 block">
            {totalLocationsCount} Locations
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Across all facilities</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total On-Hand Inventory</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalStockCount.toLocaleString()} Units
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Physical units tracked</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Avg Capacity Utilization</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 block">
            {avgUtilization}%
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Optimal distribution load</span>
        </div>
      </div>

      {/* ── Toolbar & Filter ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-4 sm:py-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search warehouse name, code, address..."
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

        <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-mono">
            <strong className="text-slate-900">{filteredWarehouses.length}</strong> facilities
          </span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table View ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600 font-semibold select-none">
                <th className="py-2.5 px-4">Warehouse Name</th>
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4 text-center">Number of Locations</th>
                <th className="py-2.5 px-4">Stock Summary</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <WarehouseIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No warehouse matches search</p>
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((wh) => (
                  <tr
                    key={wh.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    {/* Warehouse Name */}
                    <td className="py-3 px-4">
                      <Link
                        to={`/settings/warehouses/${wh.code}`}
                        className="hover:text-brand transition-colors block"
                      >
                        <span className="font-bold text-slate-900 text-sm block font-heading">
                          {wh.name}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[280px]">{wh.address}</span>
                        </span>
                      </Link>
                    </td>

                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {wh.code}
                      </span>
                    </td>

                    {/* Number of Locations */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-semibold text-slate-900 text-xs">
                        {wh.totalLocations}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">locations</span>
                    </td>

                    {/* Stock Summary */}
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {wh.totalStockUnits.toLocaleString()} units
                        </span>
                        <span className="text-slate-300">&middot;</span>
                        <span className="text-slate-500 font-medium">
                          {wh.productCount} SKUs
                        </span>
                        <span className="text-slate-300">&middot;</span>
                        <span className="text-brand font-mono text-[11px]">
                          {wh.capacityUtilization}% Capacity
                        </span>
                      </div>
                      {(wh.lowStockCount > 0 || wh.outOfStockCount > 0) && (
                        <div className="flex items-center gap-2 text-[10.5px] mt-1">
                          {wh.lowStockCount > 0 && (
                            <span className="text-amber-700 flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {wh.lowStockCount} low stock
                            </span>
                          )}
                          {wh.outOfStockCount > 0 && (
                            <span className="text-rose-600 font-medium">
                              {wh.outOfStockCount} out of stock
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <Badge variant="done" dot>
                        ACTIVE
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <Link to={`/settings/warehouses/${wh.code}`}>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 px-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>View Tree</span>
                          <ChevronRight className="w-3 h-3 ml-0.5 text-slate-400" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer ──────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredWarehouses.length} active warehouse distribution nodes configured</span>
          <span className="text-[11px] text-slate-400">
            StockSense Multi-Facility Architecture
          </span>
        </div>
      </div>
    </div>
  )
}
