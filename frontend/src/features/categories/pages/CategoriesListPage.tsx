import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Tag,
  Edit2,
  Trash2,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  FolderTree,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TablePagination } from '@/components/common/TablePagination'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useCategories } from '../hooks/useCategories'
import { ApiCategory, CreateCategoryPayload, UpdateCategoryPayload } from '../types'
import { ApiError } from '@/lib/apiClient'
import { cn } from '@/lib/cn'

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
]

export function CategoriesListPage() {
  const toast = useToast()
  const { user } = useAuth()

  // RBAC checks
  const isAdmin = user?.role === 'admin'
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [parentFilter, setParentFilter] = useState<string>('all')

  const {
    categories,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories({
    search,
    status: statusFilter,
    parentCategoryId: parentFilter !== 'all' ? parentFilter : undefined,
    pageSize: 15,
  })

  // Modal / Drawer state for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null)
  const [formData, setFormData] = useState<CreateCategoryPayload>({
    name: '',
    code: '',
    description: '',
    color: '#3B82F6',
    parentCategoryId: null,
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete confirmation state
  const [deletingCategory, setDeletingCategory] = useState<ApiCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isFiltered = Boolean(search.trim()) || statusFilter !== 'all' || parentFilter !== 'all'

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setParentFilter('all')
    toast.info('Filters Reset', 'Showing all product categories.')
  }

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      color: '#3B82F6',
      parentCategoryId: null,
      isActive: true,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEdit = (cat: ApiCategory) => {
    setEditingCategory(cat)
    setFormData({
      name: cat.name,
      code: cat.code || '',
      description: cat.description || '',
      color: cat.color || '#3B82F6',
      parentCategoryId: cat.parentCategoryId || null,
      isActive: cat.isActive,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Validate form client-side
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) {
      errors.name = 'Category name is required'
    } else if (formData.name.trim().length > 255) {
      errors.name = 'Category name cannot exceed 255 characters'
    }
    if (formData.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.color)) {
      errors.color = 'Invalid hex color code format (e.g. #3B82F6)'
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
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name,
          code: formData.code?.trim() || undefined,
          description: formData.description,
          color: formData.color,
          parentCategoryId: formData.parentCategoryId || null,
          isActive: formData.isActive,
        })
        toast.success('Category Updated', `Category "${formData.name}" was successfully updated.`)
      } else {
        await createCategory({
          name: formData.name,
          code: formData.code?.trim() || undefined,
          description: formData.description,
          color: formData.color,
          parentCategoryId: formData.parentCategoryId || null,
          isActive: formData.isActive,
        })
        toast.success('Category Created', `Category "${formData.name}" was created successfully.`)
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
    if (!deletingCategory) return

    setIsDeleting(true)
    try {
      const res = await deleteCategory(deletingCategory.id)
      if (res.mode === 'deactivated') {
        toast.info('Category Deactivated', res.message)
      } else {
        toast.success('Category Deleted', res.message)
      }
      setDeletingCategory(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete category'
      toast.error('Delete Failed', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Aggregate metric counts
  const totalCount = pagination?.total ?? categories.length
  const activeCount = useMemo(
    () => categories.filter((c) => c.isActive).length,
    [categories]
  )
  const inactiveCount = useMemo(
    () => categories.filter((c) => !c.isActive).length,
    [categories]
  )
  const subcategoryCount = useMemo(
    () => categories.filter((c) => Boolean(c.parentCategoryId)).length,
    [categories]
  )

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage product categories and hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Category
            </Button>
          )}
        </div>
      </div>

      {/* ── Top Metric Summary Strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Categories</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {totalCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Configured categories</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Active</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 block">
            {activeCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">In active use</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Subcategories</span>
          <span className="text-lg font-bold font-mono text-brand-dark mt-0.5 block">
            {subcategoryCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Nested under parents</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Inactive</span>
          <span className="text-lg font-bold font-mono text-slate-500 mt-0.5 block">
            {inactiveCount}
          </span>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">Archived</span>
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
                placeholder="Search categories by name, description..."
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
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Parent Category Filter */}
            <select
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer max-w-[160px] truncate"
            >
              <option value="all">All Parent Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Counter, Reset & Refresh */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-slate-500 font-mono">
              <strong className="text-slate-900">{totalCount}</strong> categories
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
              title="Refresh categories"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-brand')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            onClick={refetch}
            className="font-semibold underline hover:no-underline cursor-pointer text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Category Table ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span>Loading category taxonomy...</span>
          </div>
        )}

        {!isLoading && !error && categories.length === 0 && (
          <EmptyState
            icon={FolderTree}
            title={isFiltered ? 'No categories match your filters' : 'No categories created yet'}
            description={
              isFiltered
                ? 'Try resetting your search or status criteria to inspect all categories.'
                : 'Create categories to classify products into inventory groups, procurement hierarchies, and tax families.'
            }
            actionLabel={isFiltered ? 'Reset Filters' : canManage ? 'Create Category' : undefined}
            onAction={isFiltered ? handleResetFilters : canManage ? handleOpenCreate : undefined}
          />
        )}

        {!isLoading && !error && categories.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600 font-semibold select-none">
                  <th className="py-2.5 px-4 sm:px-5">Category Name</th>
                  <th className="py-2.5 px-3.5">Description</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Created Date</th>
                  <th className="py-2.5 px-4 text-right sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Category Name & Color Pill */}
                    <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-black/10"
                          style={{ backgroundColor: cat.color || '#3B82F6' }}
                          title={`Color: ${cat.color || '#3B82F6'}`}
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 text-xs">
                              {cat.name}
                            </span>
                            {cat.code && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {cat.code}
                              </span>
                            )}
                          </div>
                          {(cat.parentCategory?.name || (cat.parentCategoryId && categories.find((c) => c.id === cat.parentCategoryId)?.name)) && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <FolderTree className="w-2.5 h-2.5" />
                              Sub of {cat.parentCategory?.name || categories.find((c) => c.id === cat.parentCategoryId)?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3.5 text-slate-600 max-w-[320px] truncate">
                      {cat.description || <span className="text-slate-400 italic">No description provided</span>}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <Badge variant={cat.isActive ? 'ready' : 'draft'} dot>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(cat.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 sm:pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}

                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete category"
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

        {/* ── Table Footer & Pagination ─────────────────────────────── */}
        {!isLoading && !error && categories.length > 0 && pagination && (
          <TablePagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={15}
            onPageChange={setCurrentPage}
            itemLabel="categories"
          />
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
                <Tag className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  {editingCategory ? 'Edit Product Category' : 'Create New Category'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Category Name & Code Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    placeholder="e.g. Raw Materials, Electronics"
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
                    Category Code
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g. CAT-RAW"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-brand focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* Parent Category Hierarchy */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Parent Category
                </label>
                <select
                  value={formData.parentCategoryId || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentCategoryId: e.target.value ? e.target.value : null,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:border-brand focus:ring-brand/20 cursor-pointer"
                >
                  <option value="">None (Root Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Select a parent category to create a sub-category hierarchy, or leave as Root Category.
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
                  placeholder="Briefly describe what inventory belongs to this classification..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-brand focus:ring-brand/20 resize-none"
                />
              </div>

              {/* Color Identifier */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">Color Tag</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color: hex }))}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-transform cursor-pointer',
                        formData.color === hex
                          ? 'border-slate-900 scale-110 shadow-xs'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: hex }}
                      title={`Select ${hex}`}
                    />
                  ))}
                  <input
                    type="text"
                    value={formData.color || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    placeholder="#3B82F6"
                    className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded text-slate-700"
                  />
                </div>
                {formErrors.color && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.color}</p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Active Status</span>
                  <span className="text-[11px] text-slate-400 block">
                    Inactive categories remain archived without breaking product history
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
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => !isDeleting && setDeletingCategory(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 z-10 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 font-heading">
                  Delete Category?
                </h3>
                <p className="text-slate-500 leading-normal">
                  Are you sure you want to delete category{' '}
                  <strong className="text-slate-800">"{deletingCategory.name}"</strong>? If products are currently linked to this category, it will be safely deactivated instead of deleted to protect data integrity.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingCategory(null)}
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
