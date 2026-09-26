import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Warehouse as WarehouseIcon,
  ChevronRight,
  Eye,
  MapPin,
  AlertTriangle,
  X,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { TablePagination } from '@/components/common/TablePagination'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useWarehouses, EnrichedWarehouse } from '../hooks/useWarehouses'
import { warehousesApi } from '../api'
import { CreateWarehousePayload, UpdateWarehousePayload } from '../types'
import { ApiError } from '@/lib/apiClient'
import { cn } from '@/lib/cn'

export function WarehousesListPage() {
  const toast = useToast()
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  const {
    warehouses,
    isLoading,
    error,
    refetch,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    totalLocationsCount,
    totalStockUnitsCount,
    activeFacilitiesCount,
  } = useWarehouses()

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<EnrichedWarehouse | null>(null)
  const [formData, setFormData] = useState<CreateWarehousePayload>({
    name: '',
    shortCode: '',
    address: '',
    description: '',
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<EnrichedWarehouse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const openCreateModal = () => {
    setEditingWarehouse(null)
    setFormData({
      name: '',
      shortCode: '',
      address: '',
      description: '',
      isActive: true,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (wh: EnrichedWarehouse) => {
    setEditingWarehouse(wh)
    setFormData({
      name: wh.name,
      shortCode: wh.shortCode,
      address: wh.address || '',
      description: wh.description || '',
      isActive: wh.isActive,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Warehouse name is required'
    }
    if (!formData.shortCode.trim()) {
      errors.shortCode = 'Short code is required'
    } else if (formData.shortCode.trim().length > 10) {
      errors.shortCode = 'Short code cannot exceed 10 characters'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    setFormErrors({})

    try {
      if (editingWarehouse) {
        const updatePayload: UpdateWarehousePayload = {
          name: formData.name.trim(),
          shortCode: formData.shortCode.trim().toUpperCase(),
          address: formData.address?.trim() || null,
          description: formData.description?.trim() || null,
          isActive: formData.isActive,
        }
        await warehousesApi.update(editingWarehouse.id, updatePayload)
        toast.success('Warehouse Updated', `${formData.name} was updated successfully.`)
      } else {
        await warehousesApi.create({
          name: formData.name.trim(),
          shortCode: formData.shortCode.trim().toUpperCase(),
          address: formData.address?.trim() || undefined,
          description: formData.description?.trim() || undefined,
          isActive: formData.isActive,
        })
        toast.success('Warehouse Created', `${formData.name} facility registered.`)
      }

      setIsModalOpen(false)
      refetch()
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Operation failed'
      setFormErrors({ submit: msg })
      toast.error('Operation Failed', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await warehousesApi.delete(deleteTarget.id)
      toast.success('Warehouse Removed', res.message || `${deleteTarget.name} has been processed.`)
      setDeleteTarget(null)
      refetch()
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete warehouse'
      toast.error('Deletion Failed', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Warehouses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage warehouses and storage locations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              New Warehouse
            </Button>
          )}
        </div>
      </div>

      {/* ── Top Metric Summary Strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Warehouses</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {total}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            {activeFacilitiesCount} active &middot; {total - activeFacilitiesCount} inactive
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Active Warehouses</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 block">
            {activeFacilitiesCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Operational</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Storage Locations</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalLocationsCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Across all warehouses</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total On-Hand</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalStockUnitsCount.toLocaleString()}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Units in stock</span>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button variant="secondary" size="xs" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}

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
            <strong className="text-slate-900">{warehouses.length}</strong> of {total} warehouses
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
                <th className="py-2.5 px-4">Warehouse</th>
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4 text-center">Locations</th>
                <th className="py-2.5 px-4">Stock</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-4 bg-slate-200 rounded w-40 mb-1.5" />
                      <div className="h-3 bg-slate-100 rounded w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 bg-slate-100 rounded w-14" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 bg-slate-100 rounded w-16 mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-32" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-5 bg-slate-100 rounded w-16 mx-auto" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-6 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={WarehouseIcon}
                      title={search ? 'No warehouses found' : 'No warehouses configured'}
                      description={
                        search
                          ? 'Try searching with a different name or code.'
                          : 'Create your first warehouse to get started.'
                      }
                      actionLabel={search ? 'Reset Search' : canManage ? 'New Warehouse' : undefined}
                      onAction={search ? () => setSearch('') : canManage ? openCreateModal : undefined}
                    />
                  </td>
                </tr>
              ) : (
                warehouses.map((wh) => (
                  <tr
                    key={wh.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    {/* Warehouse Name */}
                    <td className="py-3 px-4">
                      <Link
                        to={`/settings/warehouses/${wh.id}`}
                        className="hover:text-brand transition-colors block"
                      >
                        <span className="font-bold text-slate-900 text-sm block font-heading">
                          {wh.name}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[280px]">
                            {wh.address || 'No address specified'}
                          </span>
                        </span>
                      </Link>
                    </td>

                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {wh.shortCode}
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
                      </div>
                      {wh.description && (
                        <p className="text-[10.5px] text-slate-400 truncate max-w-xs mt-0.5">
                          {wh.description}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <Badge variant={wh.isActive ? 'done' : 'neutral'} dot>
                        {wh.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/settings/warehouses/${wh.id}`}>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-7 px-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>View</span>
                            <ChevronRight className="w-3 h-3 ml-0.5 text-slate-400" />
                          </Button>
                        </Link>

                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditModal(wh)
                              }}
                              title="Edit warehouse"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(wh)
                              }}
                              title="Delete warehouse"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ─────────────────────────────────── */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>{total} warehouses</span>
          {total > limit && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={limit}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal Dialog ───────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-[fadeIn_150ms_ease-out]">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-[scaleIn_150ms_ease-out]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-brand" />
                <h3 className="font-heading font-semibold text-slate-900 text-sm">
                  {editingWarehouse ? 'Edit Warehouse' : 'New Warehouse'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {formErrors.submit && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* Warehouse Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warehouse Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Central Warehouse"
                  className={cn(
                    'w-full px-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1',
                    formErrors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-200 focus:border-brand focus:ring-brand/20'
                  )}
                />
                {formErrors.name && (
                  <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.name}</span>
                )}
              </div>

              {/* Short Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.shortCode}
                  onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                  placeholder="e.g. WH01"
                  className={cn(
                    'w-full px-3 py-1.5 text-xs border rounded-md font-mono uppercase focus:outline-none focus:ring-1',
                    formErrors.shortCode
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-200 focus:border-brand focus:ring-brand/20'
                  )}
                />
                {formErrors.shortCode && (
                  <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.shortCode}</span>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 12 Industrial Ave"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional warehouse description or notes"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="wh-is-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-brand focus:ring-brand/20 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="wh-is-active" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Active
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  leftIcon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
                >
                  {isSubmitting ? 'Saving...' : editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-[fadeIn_150ms_ease-out]">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200/80 w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-slate-900 text-sm">
                  Delete Warehouse
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove <strong className="text-slate-800">{deleteTarget.name}</strong>?
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
              If this warehouse contains existing locations or stock history, it will be deactivated to preserve movement records.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                leftIcon={isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
