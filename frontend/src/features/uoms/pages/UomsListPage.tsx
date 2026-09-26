import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Scale,
  Edit2,
  Trash2,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TablePagination } from '@/components/common/TablePagination'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUoms } from '../hooks/useUoms'
import { ApiUom, CreateUomPayload } from '../types'
import { ApiError } from '@/lib/apiClient'
import { cn } from '@/lib/cn'

const COMMON_MEASURE_TYPES = [
  { value: 'unit', label: 'Unit / Count (pcs, box, dozen)' },
  { value: 'weight', label: 'Weight / Mass (kg, g, lb)' },
  { value: 'volume', label: 'Volume / Liquid (L, mL, gal)' },
  { value: 'length', label: 'Length / Dimension (m, cm, ft)' },
  { value: 'time', label: 'Time Duration (hr, day)' },
]

export function UomsListPage() {
  const toast = useToast()
  const { user } = useAuth()

  // RBAC permissions (admin and manager can manage UOMs)
  const isAdmin = user?.role === 'admin'
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [measureTypeFilter, setMeasureTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const {
    uoms,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    createUom,
    updateUom,
    deleteUom,
  } = useUoms({
    search,
    measureType: measureTypeFilter !== 'all' ? measureTypeFilter : undefined,
    status: statusFilter,
    pageSize: 15,
  })

  // Modal State for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUom, setEditingUom] = useState<ApiUom | null>(null)
  const [formData, setFormData] = useState<CreateUomPayload>({
    name: '',
    abbreviation: '',
    description: '',
    measureType: 'unit',
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete confirmation state
  const [deletingUom, setDeletingUom] = useState<ApiUom | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isFiltered = Boolean(search.trim()) || measureTypeFilter !== 'all' || statusFilter !== 'all'

  const handleResetFilters = () => {
    setSearch('')
    setMeasureTypeFilter('all')
    setStatusFilter('all')
    toast.info('Filters Reset', 'Showing all units of measure.')
  }

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingUom(null)
    setFormData({
      name: '',
      abbreviation: '',
      description: '',
      measureType: 'unit',
      isActive: true,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEdit = (uom: ApiUom) => {
    setEditingUom(uom)
    setFormData({
      name: uom.name,
      abbreviation: uom.abbreviation,
      description: uom.description || '',
      measureType: uom.measureType || 'unit',
      isActive: uom.isActive,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Client-side quick validation
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) {
      errors.name = 'Unit name is required'
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Unit name cannot exceed 100 characters'
    }
    if (!formData.abbreviation.trim()) {
      errors.abbreviation = 'Abbreviation / symbol is required'
    } else if (formData.abbreviation.trim().length > 20) {
      errors.abbreviation = 'Abbreviation cannot exceed 20 characters'
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
      if (editingUom) {
        await updateUom(editingUom.id, {
          name: formData.name.trim(),
          abbreviation: formData.abbreviation.trim(),
          description: formData.description?.trim() || null,
          measureType: formData.measureType?.trim() || null,
          isActive: formData.isActive,
        })
        toast.success('UOM Updated', `Unit of Measure "${formData.name}" was successfully updated.`)
      } else {
        await createUom({
          name: formData.name.trim(),
          abbreviation: formData.abbreviation.trim(),
          description: formData.description?.trim() || undefined,
          measureType: formData.measureType?.trim() || undefined,
          isActive: formData.isActive,
        })
        toast.success('UOM Created', `Unit of Measure "${formData.name}" was created successfully.`)
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

  // Handle Delete / Deactivation
  const handleConfirmDelete = async () => {
    if (!deletingUom) return

    setIsDeleting(true)
    try {
      const res = await deleteUom(deletingUom.id)
      if (res.mode === 'deactivated') {
        toast.info('UOM Deactivated', res.message)
      } else {
        toast.success('UOM Deleted', res.message)
      }
      setDeletingUom(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete unit of measure'
      toast.error('Delete Failed', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Aggregate metric counts
  const totalCount = pagination?.total ?? uoms.length
  const activeCount = useMemo(() => uoms.filter((u) => u.isActive).length, [uoms])
  const inactiveCount = useMemo(() => uoms.filter((u) => !u.isActive).length, [uoms])
  const distinctTypes = useMemo(() => {
    const set = new Set(uoms.map((u) => u.measureType || 'other'))
    return set.size
  }, [uoms])

  const getMeasureTypeBadge = (type?: string | null) => {
    switch (type?.toLowerCase()) {
      case 'weight':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            Weight / Mass
          </span>
        )
      case 'volume':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            Volume / Liquid
          </span>
        )
      case 'length':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Length
          </span>
        )
      case 'time':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Time
          </span>
        )
      case 'unit':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {type ? type.toUpperCase() : 'UNIT / COUNT'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-[fadeIn_200ms_ease-out]">
      {/* ── Breadcrumb & Page Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
            <span>Settings</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">Units of Measure</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
              Units of Measure (UOM)
            </h1>
            <Badge variant="neutral" size="sm">
              Live API
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage standard quantity measurement units, mass, volume, and packaging dimensions across products.
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
              New Unit
            </Button>
          </div>
        )}
      </div>

      {/* ── Metric Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Units</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Configured measurement units</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Active Status</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 block">
            {activeCount} Active
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Available for stock balances</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Inactive / Archived</span>
          <span className="text-lg font-bold font-mono text-slate-500 mt-0.5 block">
            {inactiveCount} Inactive
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Preserved for historical ledger</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Measure Types</span>
          <span className="text-lg font-bold font-mono text-brand-dark mt-0.5 block">
            {distinctTypes} Dimensions
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Count, weight, volume, length</span>
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
                placeholder="Search UOM by name, symbol, desc..."
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

            {/* Measure Type Filter */}
            <select
              value={measureTypeFilter}
              onChange={(e) => setMeasureTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Dimension Types</option>
              <option value="unit">Unit / Count</option>
              <option value="weight">Weight / Mass</option>
              <option value="volume">Volume / Liquid</option>
              <option value="length">Length</option>
              <option value="time">Time</option>
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
              <strong className="text-slate-900">{totalCount}</strong> units
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
              title="Refresh units of measure"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-brand')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table / Content Area ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        {isLoading && uoms.length === 0 ? (
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
              <h3 className="font-semibold text-slate-900 text-sm">Failed to Load Units</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={refetch}>
              Retry Load
            </Button>
          </div>
        ) : uoms.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Scale}
              title={isFiltered ? 'No matching units of measure' : 'No units of measure registered'}
              description={
                isFiltered
                  ? 'Try clearing your search query or setting the status and dimension filters to all.'
                  : 'Get started by creating standard units of measure like Kilograms, Liters, or Pieces.'
              }
              action={
                isFiltered ? (
                  <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                ) : canManage ? (
                  <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                    Create First Unit
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
                  <th className="py-2.5 px-4 sm:pl-5">Unit Name & Symbol</th>
                  <th className="py-2.5 px-3.5">Dimension Type</th>
                  <th className="py-2.5 px-3.5">Description</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Created</th>
                  <th className="py-2.5 px-4 text-right sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {uoms.map((uom) => (
                  <tr key={uom.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Unit Name & Abbreviation Badge */}
                    <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {uom.abbreviation}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-xs">
                            {uom.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Symbol: {uom.abbreviation}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Dimension / Measure Type */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {getMeasureTypeBadge(uom.measureType)}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3.5 text-slate-600 max-w-[280px] truncate">
                      {uom.description || <span className="text-slate-400 italic">No description provided</span>}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <Badge variant={uom.isActive ? 'ready' : 'draft'} dot>
                        {uom.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(uom.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 sm:pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(uom)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit unit of measure"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}

                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => setDeletingUom(uom)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete or deactivate unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
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
                <Scale className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  {editingUom ? 'Edit Unit of Measure' : 'Create Unit of Measure'}
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
              {/* Unit Name and Abbreviation Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Unit Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    placeholder="e.g. Kilogram, Box, Liter, Piece"
                    className={cn(
                      'w-full px-3 py-2 text-xs bg-white border rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1',
                      formErrors.name
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-brand focus:ring-brand/20'
                    )}
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Symbol / Abbr <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.abbreviation}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, abbreviation: e.target.value }))
                      if (formErrors.abbreviation) setFormErrors((prev) => ({ ...prev, abbreviation: '' }))
                    }}
                    placeholder="e.g. kg, box, L"
                    className={cn(
                      'w-full px-3 py-2 text-xs font-mono bg-white border rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1',
                      formErrors.abbreviation
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-brand focus:ring-brand/20'
                    )}
                  />
                  {formErrors.abbreviation && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.abbreviation}</p>
                  )}
                </div>
              </div>

              {/* Measure / Dimension Type */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">Dimension / Measure Type</label>
                <select
                  value={formData.measureType || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, measureType: e.target.value || null }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:border-brand focus:ring-brand/20 cursor-pointer"
                >
                  <option value="">None / Custom</option>
                  {COMMON_MEASURE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Select the physical measurement dimension this unit represents.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional details about conversion factors or packaging standards..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-brand focus:ring-brand/20 resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Active Status</span>
                  <span className="text-[11px] text-slate-400 block">
                    Inactive units remain archived without breaking product historical ledger
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
                  {isSubmitting ? 'Saving...' : editingUom ? 'Save Changes' : 'Create Unit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      {deletingUom && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => !isDeleting && setDeletingUom(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 z-10 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 font-heading">
                  Delete Unit of Measure?
                </h3>
                <p className="text-slate-500 leading-normal">
                  Are you sure you want to delete unit{' '}
                  <strong className="text-slate-800">
                    "{deletingUom.name}" ({deletingUom.abbreviation})
                  </strong>
                  ? If products are currently linked to this UOM, it will be safely deactivated instead of deleted to protect stock movements and ledger integrity.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingUom(null)}
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
