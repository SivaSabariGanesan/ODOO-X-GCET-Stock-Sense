import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Warehouse as WarehouseIcon,
  MapPin,
  Package,
  FolderTree,
  ExternalLink,
  Boxes,
  AlertTriangle,
  TrendingDown,
  Info,
  Plus,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useWarehouseDetail } from '../hooks/useWarehouseDetail'
import { locationsApi } from '../api'
import { CreateLocationPayload, LocationType } from '../types'
import { ApiError } from '@/lib/apiClient'
import { cn } from '@/lib/cn'

export function WarehouseDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  const {
    warehouse,
    locations,
    locationNodes,
    totalStockUnits,
    totalLocations,
    productCount,
    lowStockCount,
    outOfStockCount,
    isLoading,
    error,
    refetch,
  } = useWarehouseDetail(id)

  // Active selected location node in the tree ('all' or location id)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all')

  // Modal State for Create Location
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [locationFormData, setLocationFormData] = useState<{
    name: string
    locationType: LocationType
    parentId: string
  }>({
    name: '',
    locationType: 'internal',
    parentId: '',
  })
  const [locationFormErrors, setLocationFormErrors] = useState<Record<string, string>>({})
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false)

  const activeNode = useMemo(() => {
    if (!warehouse || selectedLocationId === 'all') return null
    return locationNodes.find((l) => l.id === selectedLocationId) || null
  }, [warehouse, locationNodes, selectedLocationId])

  // Products displayed based on selected tree node
  const displayedProducts = useMemo(() => {
    if (!warehouse) return []
    if (activeNode) {
      return activeNode.products.map((p) => ({
        ...p,
        locationName: activeNode.name,
        locationPath: activeNode.fullPath,
      }))
    }

    // All locations
    const all: any[] = []
    locationNodes.forEach((loc) => {
      loc.products.forEach((p) => {
        all.push({ ...p, locationName: loc.name, locationPath: loc.fullPath })
      })
    })
    return all
  }, [warehouse, activeNode, locationNodes])

  const openCreateLocationModal = () => {
    setLocationFormData({
      name: '',
      locationType: 'internal',
      parentId: selectedLocationId !== 'all' ? selectedLocationId : '',
    })
    setLocationFormErrors({})
    setIsLocationModalOpen(true)
  }

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!warehouse) return

    const errors: Record<string, string> = {}
    if (!locationFormData.name.trim()) {
      errors.name = 'Location name is required'
    }

    if (Object.keys(errors).length > 0) {
      setLocationFormErrors(errors)
      return
    }

    setIsSubmittingLocation(true)
    setLocationFormErrors({})

    try {
      const payload: CreateLocationPayload = {
        warehouseId: warehouse.id,
        name: locationFormData.name.trim(),
        locationType: locationFormData.locationType,
        parentId: locationFormData.parentId || null,
      }

      await locationsApi.create(payload)
      toast.success('Location Created', `${locationFormData.name} added to ${warehouse.name}.`)
      setIsLocationModalOpen(false)
      refetch()
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create location'
      setLocationFormErrors({ submit: msg })
      toast.error('Creation Failed', msg)
    } finally {
      setIsSubmittingLocation(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading warehouse facility & location hierarchy...</span>
      </div>
    )
  }

  if (error || !warehouse) {
    return (
      <EmptyState
        icon={WarehouseIcon}
        title="Warehouse Not Found"
        description={error || `The facility identifier #${id} could not be located in the active directory.`}
        actionLabel="Back to Warehouses"
        onAction={() => navigate('/settings/warehouses')}
      />
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
            title="Back to warehouses"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                {warehouse.shortCode}
              </span>
              <Badge variant={warehouse.isActive ? 'done' : 'neutral'} dot>
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1">
              {warehouse.name}
            </h1>
            {warehouse.address ? (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{warehouse.address}</span>
                {warehouse.description && (
                  <>
                    <span className="text-slate-300">&middot;</span>
                    <span>{warehouse.description}</span>
                  </>
                )}
              </p>
            ) : warehouse.description ? (
              <p className="text-xs text-slate-500 mt-0.5">
                {warehouse.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/settings/warehouses">
            <Button variant="secondary" size="sm">
              All Warehouses
            </Button>
          </Link>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateLocationModal}
            >
              Add Location
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Total On-hand */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total On-hand</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalStockUnits.toLocaleString()} units
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            Across {totalLocations} locations
          </span>
        </div>

        {/* 2. Products */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Products</span>
          <span className="text-lg font-bold font-mono text-brand-dark mt-0.5 block flex items-center gap-1">
            <Package className="w-4 h-4 text-brand" />
            {productCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            Catalog items stored
          </span>
        </div>

        {/* 3. Low Stock */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Low Stock</span>
          <span
            className={cn(
              'text-lg font-bold font-mono mt-0.5 block flex items-center gap-1',
              lowStockCount > 0 ? 'text-amber-600' : 'text-slate-700'
            )}
          >
            {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            {lowStockCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            Below reorder threshold
          </span>
        </div>

        {/* 4. Out of Stock */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Out of Stock</span>
          <span
            className={cn(
              'text-lg font-bold font-mono mt-0.5 block flex items-center gap-1',
              outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-700'
            )}
          >
            {outOfStockCount > 0 && <TrendingDown className="w-4 h-4 text-rose-500" />}
            {outOfStockCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            Zero quantity on hand
          </span>
        </div>
      </div>

      {/* ── Main Two-Column Structure: Location Tree & Inventory Table ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Left Column: Clean Location Hierarchy (5 cols) ─── */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-lg shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-brand" />
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Location Hierarchy
              </h2>
            </div>
            <div className="flex items-center gap-2">
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
                All Locations
              </button>
            </div>
          </div>

          {/* Tree Representation */}
          <div className="font-mono text-xs text-slate-700 bg-slate-50/70 p-3 rounded-md border border-slate-200/70 space-y-0.5">
            {/* Root Warehouse */}
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
                <span>{warehouse.name} ({warehouse.shortCode})</span>
              </div>
              <span className="font-mono text-[10.5px] text-slate-500">
                {totalStockUnits.toLocaleString()} units
              </span>
            </div>

            {/* Tree Branch Items */}
            <div className="pl-2 pt-0.5 space-y-0.5">
              {locationNodes.length === 0 ? (
                <div className="py-4 text-center text-slate-400 font-sans text-xs">
                  No storage locations found in this warehouse.
                </div>
              ) : (
                locationNodes.map((loc, idx) => {
                  const isLast = idx === locationNodes.length - 1
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
                })
              )}
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 leading-normal flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Select a location in the tree to filter the stock list.
            </span>
          </div>
        </div>

        {/* ── Right Column: Stock by Location (7 cols) ─ */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand" />
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Stock by Location
                </h3>
                <span className="text-[10.5px] text-slate-400">
                  {activeNode ? activeNode.fullPath : `All locations in ${warehouse.name}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-slate-500">
                <strong className="text-slate-900">{displayedProducts.length}</strong> items
              </span>
            </div>
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
                            ? 'In Stock'
                            : p.status === 'low_stock'
                            ? 'Low Stock'
                            : 'Out of Stock'}
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
              {activeNode ? `Filtered by ${activeNode.fullPath}` : 'All warehouse locations'}
            </span>
            <span className="font-mono text-[11px]">
              Total on-hand: <strong>{displayedProducts.reduce((a, c) => a + c.quantity, 0).toLocaleString()}</strong> units
            </span>
          </div>
        </div>
      </div>

      {/* ── Create Location Modal Dialog ───────────────────────────────── */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-[fadeIn_150ms_ease-out]">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-[scaleIn_150ms_ease-out]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-brand" />
                <h3 className="font-heading font-semibold text-slate-900 text-sm">
                  Add Storage Location
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="p-5 space-y-4">
              {locationFormErrors.submit && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{locationFormErrors.submit}</span>
                </div>
              )}

              {/* Location Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={locationFormData.name}
                  onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                  placeholder="e.g. Rack A / Shelf 1"
                  className={cn(
                    'w-full px-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1',
                    locationFormErrors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-200 focus:border-brand focus:ring-brand/20'
                  )}
                />
                {locationFormErrors.name && (
                  <span className="text-[11px] text-rose-600 mt-0.5 block">{locationFormErrors.name}</span>
                )}
              </div>

              {/* Location Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Type
                </label>
                <select
                  value={locationFormData.locationType}
                  onChange={(e) =>
                    setLocationFormData({
                      ...locationFormData,
                      locationType: e.target.value as LocationType,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white"
                >
                  <option value="internal">Internal Storage (Default)</option>
                  <option value="input">Inbound Dock / Intake</option>
                  <option value="output">Outbound Staging / Dispatch</option>
                  <option value="quality_control">Quality Control / Inspection</option>
                  <option value="virtual">Virtual / Cross-docking</option>
                </select>
              </div>

              {/* Parent Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Location (Optional Hierarchy)
                </label>
                <select
                  value={locationFormData.parentId}
                  onChange={(e) => setLocationFormData({ ...locationFormData, parentId: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white"
                >
                  <option value="">No Parent (Root Facility Tier)</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.fullPath || loc.name} ({loc.locationType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsLocationModalOpen(false)}
                  disabled={isSubmittingLocation}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingLocation}
                  leftIcon={isSubmittingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
                >
                  {isSubmittingLocation ? 'Creating...' : 'Create Location'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
