import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  Repeat,
  Edit2,
  Trash2,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  Package,
  MapPin,
  Warehouse,
  CheckCircle2,
  Power,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TablePagination } from '@/components/common/TablePagination'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useReorderingRules } from '../hooks/useReorderingRules'
import { reorderingRulesApi } from '../api'
import { ApiReorderRule, CreateReorderRulePayload } from '../types'
import { ApiError } from '@/lib/apiClient'
import { cn } from '@/lib/cn'

export function ReorderingRulesListPage() {
  const toast = useToast()
  const { user } = useAuth()

  // RBAC checks
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const {
    rules,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    createRule,
    updateRule,
    deleteRule,
    toggleActiveRule,
  } = useReorderingRules({
    search,
    warehouseId: warehouseFilter,
    status: statusFilter,
    pageSize: 15,
  })

  // Master Data State for Selectors
  const [productsMaster, setProductsMaster] = useState<
    Array<{ id: string; name: string; sku: string }>
  >([])
  const [locationsMaster, setLocationsMaster] = useState<
    Array<{ id: string; name: string; fullPath?: string; warehouseId?: string }>
  >([])
  const [warehousesMaster, setWarehousesMaster] = useState<
    Array<{ id: string; name: string; shortCode?: string }>
  >([])

  useEffect(() => {
    let isMounted = true
    Promise.all([
      reorderingRulesApi.getProductsMaster().catch(() => []),
      reorderingRulesApi.getLocationsMaster().catch(() => []),
      reorderingRulesApi.getWarehousesMaster().catch(() => []),
    ]).then(([prods, locs, whs]) => {
      if (!isMounted) return
      setProductsMaster(prods)
      setLocationsMaster(locs)
      setWarehousesMaster(whs)
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Modal / Drawer state for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ApiReorderRule | null>(null)
  const [formData, setFormData] = useState<CreateReorderRulePayload>({
    productId: '',
    locationId: '',
    minQuantity: '0',
    maxQuantity: '',
    reorderQty: '1',
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete confirmation state
  const [deletingRule, setDeletingRule] = useState<ApiReorderRule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isFiltered = Boolean(search.trim()) || warehouseFilter !== 'all' || statusFilter !== 'all'

  const handleResetFilters = () => {
    setSearch('')
    setWarehouseFilter('all')
    setStatusFilter('all')
    toast.info('Filters Reset', 'Showing all reordering rules.')
  }

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingRule(null)
    setFormData({
      productId: productsMaster[0]?.id || '',
      locationId: locationsMaster[0]?.id || '',
      minQuantity: '0',
      maxQuantity: '',
      reorderQty: '1',
      isActive: true,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEdit = (rule: ApiReorderRule) => {
    setEditingRule(rule)
    setFormData({
      productId: rule.productId,
      locationId: rule.locationId,
      minQuantity: String(rule.minQuantity),
      maxQuantity: rule.maxQuantity != null ? String(rule.maxQuantity) : '',
      reorderQty: String(rule.reorderQty),
      isActive: rule.isActive,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Validate form client-side
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.productId) {
      errors.productId = 'Product is required'
    }
    if (!formData.locationId) {
      errors.locationId = 'Location is required'
    }

    const min = Number(formData.minQuantity)
    if (isNaN(min) || min < 0) {
      errors.minQuantity = 'Minimum quantity must be a non-negative number'
    }

    const reorder = Number(formData.reorderQty)
    if (isNaN(reorder) || reorder <= 0) {
      errors.reorderQty = 'Reorder quantity must be greater than 0'
    }

    if (formData.maxQuantity !== '' && formData.maxQuantity != null) {
      const max = Number(formData.maxQuantity)
      if (isNaN(max) || max < 0) {
        errors.maxQuantity = 'Maximum quantity cannot be negative'
      } else if (!isNaN(min) && max < min) {
        errors.maxQuantity = 'Maximum quantity cannot be less than minimum quantity'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const maxVal =
        formData.maxQuantity !== '' && formData.maxQuantity != null
          ? String(formData.maxQuantity)
          : null

      if (editingRule) {
        await updateRule(editingRule.id, {
          productId: formData.productId,
          locationId: formData.locationId,
          minQuantity: String(formData.minQuantity),
          maxQuantity: maxVal,
          reorderQty: String(formData.reorderQty),
          isActive: formData.isActive,
        })
        toast.success(
          'Reordering Rule Updated',
          'The inventory threshold parameters have been updated.'
        )
      } else {
        await createRule({
          productId: formData.productId,
          locationId: formData.locationId,
          minQuantity: String(formData.minQuantity),
          maxQuantity: maxVal,
          reorderQty: String(formData.reorderQty),
          isActive: formData.isActive,
        })
        toast.success(
          'Reordering Rule Created',
          'Automated reorder replenishment threshold successfully established.'
        )
      }
      setIsModalOpen(false)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorDetails = err.data as { details?: { fieldErrors?: Record<string, string[]> } }
        if (errorDetails?.details?.fieldErrors) {
          const mapped: Record<string, string> = {}
          Object.entries(errorDetails.details.fieldErrors).forEach(([k, v]) => {
            mapped[k] = Array.isArray(v) ? v[0] || 'Invalid field' : String(v)
          })
          setFormErrors(mapped)
        } else {
          toast.error('Action Failed', err.message)
        }
      } else {
        toast.error('Action Failed', 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Toggle Active Rule
  const handleToggleActive = async (rule: ApiReorderRule) => {
    try {
      const updated = await toggleActiveRule(rule)
      if (updated.isActive) {
        toast.success('Rule Activated', `Rule for ${rule.productName || 'product'} is now active.`)
      } else {
        toast.info('Rule Paused', `Rule for ${rule.productName || 'product'} has been paused.`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not change rule status'
      toast.error('Toggle Failed', msg)
    }
  }

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingRule) return

    setIsDeleting(true)
    try {
      await deleteRule(deletingRule.id)
      toast.success(
        'Reordering Rule Deleted',
        `Reordering rule for ${deletingRule.productName || 'product'} deleted.`
      )
      setDeletingRule(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete rule'
      toast.error('Delete Failed', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Aggregate metric counts
  const totalCount = pagination?.total ?? rules.length
  const activeCount = useMemo(() => rules.filter((r) => r.isActive).length, [rules])
  const inactiveCount = useMemo(() => rules.filter((r) => !r.isActive).length, [rules])
  const distinctProductsCount = useMemo(() => {
    const set = new Set(rules.map((r) => r.productId))
    return set.size
  }, [rules])

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-[fadeIn_200ms_ease-out]">
      {/* ── Breadcrumb & Page Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
            <span>Configuration</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">Reordering Rules</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
              Reordering Rules
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Define minimum and maximum stock rules to trigger replenishment.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Rule
            </Button>
          </div>
        )}
      </div>

      {/* ── Metric Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Rules</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Configured reorder rules</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Active</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 block">
            {activeCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Rules active</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Inactive</span>
          <span className="text-lg font-bold font-mono text-slate-500 mt-0.5 block">
            {inactiveCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Rules paused</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Products</span>
          <span className="text-lg font-bold font-mono text-brand-dark mt-0.5 block">
            {distinctProductsCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Configured products</span>
        </div>
      </div>

      {/* ── Toolbar & Filters ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-4 sm:py-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SKU, product, location..."
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

            {/* Warehouse Filter */}
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Facilities</option>
              {warehousesMaster.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.shortCode})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Right: Counter, Reset & Refresh */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-slate-500 font-mono">
              <strong className="text-slate-900">{totalCount}</strong> rules
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
            <button
              type="button"
              onClick={refetch}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Refresh reordering rules"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-brand')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table / Content Area ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        {isLoading && rules.length === 0 ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-md animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Failed to Load Rules</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={refetch}>
              Retry Load
            </Button>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Repeat}
              title={isFiltered ? 'No matching reordering rules' : 'No reordering rules defined'}
              description={
                isFiltered
                  ? 'Try clearing your search query or setting the status and warehouse filters to all.'
                  : 'Establish automated reorder triggers to prevent stockouts and maintain optimal inventory levels.'
              }
              action={
                isFiltered ? (
                  <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                ) : canManage ? (
                  <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                    Create First Rule
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider font-heading">
                  <th className="py-2.5 px-4 sm:pl-5">Target Product</th>
                  <th className="py-2.5 px-3.5">Storage Location</th>
                  <th className="py-2.5 px-3.5 text-right">Min Qty</th>
                  <th className="py-2.5 px-3.5 text-right">Max Target</th>
                  <th className="py-2.5 px-3.5 text-right">Reorder Batch</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-4 text-right sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Product & SKU */}
                    <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-brand-light/40 text-brand-dark flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-xs">
                            {rule.productName || 'Unknown Product'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            SKU: {rule.productSku || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Location & Warehouse */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{rule.locationFullPath || rule.locationName || 'Location'}</span>
                        </div>
                        {rule.warehouseName && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Warehouse className="w-2.5 h-2.5" />
                            {rule.warehouseName} ({rule.warehouseShortCode})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Min Quantity */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-800">
                      {parseFloat(rule.minQuantity).toLocaleString()}
                    </td>

                    {/* Max Quantity */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-slate-600">
                      {rule.maxQuantity != null ? (
                        parseFloat(rule.maxQuantity).toLocaleString()
                      ) : (
                        <span className="text-slate-400 italic">No limit</span>
                      )}
                    </td>

                    {/* Reorder Batch Quantity */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-semibold text-brand">
                      +{parseFloat(rule.reorderQty).toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <Badge variant={rule.isActive ? 'ready' : 'draft'} dot>
                        {rule.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 sm:pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            className={cn(
                              'p-1.5 rounded-md transition-colors cursor-pointer',
                              rule.isActive
                                ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                                : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                            )}
                            title={rule.isActive ? 'Pause automation rule' : 'Resume automation rule'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rule)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit rule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setDeletingRule(rule)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Table Pagination ────────────────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-slate-200/80 px-4 py-3 bg-slate-50/50">
            <TablePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 z-10 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  {editingRule ? 'Edit Reordering Rule' : 'Create Reordering Rule'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Product Selector */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Target Product <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, productId: e.target.value }))
                    if (formErrors.productId) setFormErrors((prev) => ({ ...prev, productId: '' }))
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-xs bg-white border rounded-md text-slate-700 focus:outline-none focus:ring-1 cursor-pointer',
                    formErrors.productId
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-brand focus:ring-brand/20'
                  )}
                >
                  <option value="">Select a Product</option>
                  {productsMaster.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                {formErrors.productId && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.productId}</p>
                )}
              </div>

              {/* Location Selector */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Stock Storage Location <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.locationId}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, locationId: e.target.value }))
                    if (formErrors.locationId) setFormErrors((prev) => ({ ...prev, locationId: '' }))
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-xs bg-white border rounded-md text-slate-700 focus:outline-none focus:ring-1 cursor-pointer',
                    formErrors.locationId
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-brand focus:ring-brand/20'
                  )}
                >
                  <option value="">Select a Location</option>
                  {locationsMaster.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.fullPath || loc.name}
                    </option>
                  ))}
                </select>
                {formErrors.locationId && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.locationId}</p>
                )}
              </div>

              {/* Quantity Thresholds Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Min Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.minQuantity}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, minQuantity: e.target.value }))
                      if (formErrors.minQuantity) setFormErrors((prev) => ({ ...prev, minQuantity: '' }))
                    }}
                    placeholder="0"
                    className={cn(
                      'w-full px-3 py-2 text-xs font-mono bg-white border rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1',
                      formErrors.minQuantity
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-brand focus:ring-brand/20'
                    )}
                  />
                  {formErrors.minQuantity && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.minQuantity}</p>
                  )}
                  <span className="text-[10px] text-slate-400 block">Trigger threshold</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">Max Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.maxQuantity ?? ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, maxQuantity: e.target.value }))
                      if (formErrors.maxQuantity) setFormErrors((prev) => ({ ...prev, maxQuantity: '' }))
                    }}
                    placeholder="Unlimited"
                    className={cn(
                      'w-full px-3 py-2 text-xs font-mono bg-white border rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1',
                      formErrors.maxQuantity
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-brand focus:ring-brand/20'
                    )}
                  />
                  {formErrors.maxQuantity && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.maxQuantity}</p>
                  )}
                  <span className="text-[10px] text-slate-400 block">Ceiling limit (optional)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Reorder Batch <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={formData.reorderQty}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, reorderQty: e.target.value }))
                      if (formErrors.reorderQty) setFormErrors((prev) => ({ ...prev, reorderQty: '' }))
                    }}
                    placeholder="1"
                    className={cn(
                      'w-full px-3 py-2 text-xs font-mono bg-white border rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1',
                      formErrors.reorderQty
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-brand focus:ring-brand/20'
                    )}
                  />
                  {formErrors.reorderQty && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.reorderQty}</p>
                  )}
                  <span className="text-[10px] text-slate-400 block">Replenish quantity</span>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Active Status</span>
                  <span className="text-[11px] text-slate-400 block">
                    When active, the MRP system monitors stock below minimum for auto-replenishment.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
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
                  {isSubmitting ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => !isDeleting && setDeletingRule(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 z-10 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 font-heading">
                  Delete Reordering Rule?
                </h3>
                <p className="text-slate-500 leading-normal">
                  Are you sure you want to delete the reordering rule for{' '}
                  <strong className="text-slate-800">
                    "{deletingRule.productName || 'product'}"
                  </strong>{' '}
                  at{' '}
                  <strong className="text-slate-800">
                    "{deletingRule.locationFullPath || deletingRule.locationName || 'location'}"
                  </strong>
                  ? Automated replenishment alerts for this bin threshold will cease.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingRule(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
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
