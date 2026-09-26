import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Warehouse as WarehouseIcon,
  MapPin,
  Package,
  Layers,
  AlertTriangle,
  FolderTree,
  ChevronRight,
  ExternalLink,
  Boxes,
  Activity,
  CheckCircle2,
  TrendingDown,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getMockWarehouseById } from '../mockWarehouses'
import { Warehouse, WarehouseLocationNode } from '../types'
import { cn } from '@/lib/cn'

export function WarehouseDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const warehouse = id ? getMockWarehouseById(id) : undefined

  // Active selected location node in the tree ('all' or location id)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all')

  const activeNode = useMemo(() => {
    if (!warehouse || selectedLocationId === 'all') return null
    return warehouse.locations.find((l) => l.id === selectedLocationId) || null
  }, [warehouse, selectedLocationId])

  // Products displayed based on selected tree node
  const displayedProducts = useMemo(() => {
    if (!warehouse) return []
    if (activeNode) {
      return activeNode.products.map((p) => ({ ...p, locationName: activeNode.name, locationPath: activeNode.fullPath }))
    }

    // All locations
    const all: any[] = []
    warehouse.locations.forEach((loc) => {
      loc.products.forEach((p) => {
        all.push({ ...p, locationName: loc.name, locationPath: loc.fullPath })
      })
    })
    return all
  }, [warehouse, activeNode])

  if (!warehouse) {
    return (
      <div className="w-full max-w-2xl mx-auto p-12 text-center bg-white border border-slate-200/80 rounded-lg shadow-2xs space-y-4">
        <WarehouseIcon className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-800">Warehouse Not Found</h2>
        <p className="text-xs text-slate-500">The facility code #{id} could not be located in the directory.</p>
        <Link to="/settings/warehouses">
          <Button variant="secondary" size="sm">
            Back to Warehouses
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/settings/warehouses"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mt-0.5"
            title="Back to warehouses list"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                {warehouse.code}
              </span>
              <Badge variant="done" dot>
                ACTIVE FACILITY
              </Badge>
              <span className="text-[11px] text-slate-400 font-mono">
                Capacity: {warehouse.capacityUtilization}%
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1">
              {warehouse.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{warehouse.address}</span>
              <span className="text-slate-300">&middot;</span>
              <span>Managed by: <strong className="text-slate-700 font-medium">{warehouse.manager}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/settings/warehouses">
            <Button variant="secondary" size="sm">
              All Facilities
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 4 Key Required Metrics ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Location Inventory Summary */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Location Inventory Summary</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {warehouse.totalStockUnits.toLocaleString()} Units
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            Across {warehouse.totalLocations} storage locations ({warehouse.capacityUtilization}% Cap)
          </span>
        </div>

        {/* 2. Product Count */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Product Count</span>
          <span className="text-lg font-bold font-mono text-brand-dark mt-0.5 block flex items-center gap-1">
            <Package className="w-4 h-4 text-brand" />
            {warehouse.productCount} SKUs
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            Distinct catalog items stored
          </span>
        </div>

        {/* 3. Low-Stock Count */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Low-Stock Count</span>
          <span
            className={cn(
              'text-lg font-bold font-mono mt-0.5 block flex items-center gap-1',
              warehouse.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-700'
            )}
          >
            {warehouse.lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            {warehouse.lowStockCount} SKU{warehouse.lowStockCount === 1 ? '' : 's'}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            {warehouse.lowStockCount > 0 ? 'Below minimum safety threshold' : 'All items above safety line'}
          </span>
        </div>

        {/* 4. Out-of-Stock Count */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Out-of-Stock Count</span>
          <span
            className={cn(
              'text-lg font-bold font-mono mt-0.5 block flex items-center gap-1',
              warehouse.outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-700'
            )}
          >
            {warehouse.outOfStockCount > 0 && <TrendingDown className="w-4 h-4 text-rose-500" />}
            {warehouse.outOfStockCount} SKU{warehouse.outOfStockCount === 1 ? '' : 's'}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            {warehouse.outOfStockCount > 0 ? 'Zero on-hand inventory balance' : 'Zero depleted items'}
          </span>
        </div>
      </div>

      {/* ── Main Two-Column Structure: Location Tree & Inventory Table ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Left Column: Clean Hierarchy / Tree / List UI (5 cols) ─── */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-lg shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-brand" />
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Location Hierarchy Tree
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLocationId('all')}
              className={cn(
                'text-[11px] font-medium px-2 py-0.5 rounded transition-colors cursor-pointer',
                selectedLocationId === 'all'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              View All
            </button>
          </div>

          {/* Clean ASCII Tree Representation */}
          <div className="font-mono text-xs text-slate-700 bg-slate-50/70 p-3 rounded-md border border-slate-200/70 space-y-0.5">
            {/* Root Facility Node */}
            <div
              onClick={() => setSelectedLocationId('all')}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded transition-colors cursor-pointer select-none font-sans',
                selectedLocationId === 'all'
                  ? 'bg-[#ede9fe] text-brand-dark font-semibold'
                  : 'hover:bg-slate-200/60 text-slate-900'
              )}
            >
              <div className="flex items-center gap-1.5 font-bold font-heading">
                <WarehouseIcon className="w-3.5 h-3.5 text-brand" />
                <span>{warehouse.name} ({warehouse.code})</span>
              </div>
              <span className="font-mono text-[10.5px] text-slate-500">
                {warehouse.totalStockUnits} units
              </span>
            </div>

            {/* Tree Branch Items */}
            <div className="pl-2 pt-0.5 space-y-0.5">
              {warehouse.locations.map((loc, idx) => {
                const isLast = idx === warehouse.locations.length - 1
                const branchPrefix = isLast ? '└── ' : '├── '
                const isSelected = selectedLocationId === loc.id

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={cn(
                      'flex items-center justify-between px-2 py-1.5 rounded transition-colors cursor-pointer select-none font-sans',
                      isSelected
                        ? 'bg-brand text-white font-semibold shadow-2xs'
                        : 'hover:bg-slate-200/60 text-slate-700'
                    )}
                  >
                    <div className="flex items-center min-w-0">
                      <span className={cn('font-mono text-xs shrink-0 select-none mr-1', isSelected ? 'text-white/80' : 'text-slate-400')}>
                        {branchPrefix}
                      </span>
                      <span className="truncate font-medium text-xs">
                        {loc.name}
                      </span>
                      <span
                        className={cn(
                          'ml-2 text-[10px] px-1.5 py-0.2 rounded uppercase font-mono tracking-wider',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200/80 text-slate-600'
                        )}
                      >
                        {loc.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className={cn(isSelected ? 'text-white' : 'text-slate-600')}>
                        {loc.totalUnits.toLocaleString()} units
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Node Inspector Helper */}
          <div className="pt-2 text-[11px] text-slate-400 leading-normal flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Click any location in the branch tree to filter the inventory list to that specific bin.
            </span>
          </div>
        </div>

        {/* ── Right Column: Location Inventory Summary Table (7 cols) ─ */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand" />
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  {activeNode ? `Bin Stock: ${activeNode.name}` : `All Bin Inventory: ${warehouse.code}`}
                </h3>
                <span className="text-[10.5px] text-slate-400">
                  {activeNode ? activeNode.fullPath : `${warehouse.locations.length} total facility bins`}
                </span>
              </div>
            </div>

            <span className="font-mono text-xs text-slate-500">
              <strong className="text-slate-900">{displayedProducts.length}</strong> product lines
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-white text-slate-600 font-semibold select-none">
                  <th className="py-2.5 px-3.5">Product Name</th>
                  <th className="py-2.5 px-3.5">SKU</th>
                  <th className="py-2.5 px-3.5">Location</th>
                  <th className="py-2.5 px-3.5 text-right">On-Hand</th>
                  <th className="py-2.5 px-3.5 text-center">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-600">No stock stored in this location</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        This location is currently empty or utilized exclusively as transit staging.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((p, idx) => (
                    <tr
                      key={`${p.id}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-[170px] truncate" title={p.name}>
                        <Link
                          to={`/products/${p.id}`}
                          className="hover:text-brand transition-colors"
                        >
                          {p.name}
                        </Link>
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-3.5 font-mono text-slate-600 text-[11px]">
                        {p.sku}
                      </td>

                      {/* Location Path */}
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-700">
                        {p.locationPath}
                      </td>

                      {/* On-hand */}
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                        {p.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{p.unit}</span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 text-center">
                        <Badge
                          variant={
                            p.status === 'in_stock'
                              ? 'done'
                              : p.status === 'low_stock'
                              ? 'warning'
                              : 'danger'
                          }
                          dot
                        >
                          {p.status === 'in_stock'
                            ? 'IN STOCK'
                            : p.status === 'low_stock'
                            ? 'LOW STOCK'
                            : 'OUT OF STOCK'}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3.5 text-right">
                        <Link to={`/products/${p.id}`}>
                          <Button variant="ghost" size="xs" className="h-6 px-2 text-slate-500 hover:text-brand">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              {activeNode ? `Filtered by ${activeNode.fullPath}` : 'Facility aggregate view'}
            </span>
            <span className="font-mono text-[11px]">
              Subtotal: <strong>{displayedProducts.reduce((a, c) => a + c.quantity, 0).toLocaleString()}</strong> units
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
