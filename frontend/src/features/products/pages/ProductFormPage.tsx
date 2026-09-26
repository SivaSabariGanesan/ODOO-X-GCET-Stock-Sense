import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/context/ToastContext'
import {
  PRODUCT_CATEGORIES,
  UNITS_OF_MEASURE,
  WAREHOUSE_LOCATIONS,
  getMockProductById,
  createMockProduct,
  updateMockProduct,
} from '../mockProducts'
import { ProductFormData } from '../types'
import { cn } from '@/lib/cn'

interface ProductFormPageProps {
  isEdit?: boolean
}

export function ProductFormPage({ isEdit = false }: ProductFormPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const existingProduct = isEdit && id ? getMockProductById(id) : undefined

  // Form State
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    category: PRODUCT_CATEGORIES[0],
    unit: UNITS_OF_MEASURE[0],
    initialStock: 0,
    initialLocation: WAREHOUSE_LOCATIONS[0].label,
  })

  // Validation Errors
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof ProductFormData, boolean>>>({})

  // Populate data when editing
  useEffect(() => {
    if (isEdit && existingProduct) {
      setFormData({
        name: existingProduct.name,
        sku: existingProduct.sku,
        category: existingProduct.category,
        unit: existingProduct.unit,
        initialStock: existingProduct.onHand,
        initialLocation: existingProduct.initialLocation || WAREHOUSE_LOCATIONS[0].label,
      })
    }
  }, [isEdit, existingProduct])

  // Validate fields
  const validate = (): boolean => {
    const errs: Partial<Record<keyof ProductFormData, string>> = {}

    if (!formData.name.trim()) {
      errs.name = 'Product name is required'
    } else if (formData.name.trim().length < 3) {
      errs.name = 'Product name must be at least 3 characters'
    }

    if (!formData.sku.trim()) {
      errs.sku = 'SKU is required'
    } else if (!/^[A-Za-z0-9-_]+$/.test(formData.sku.trim())) {
      errs.sku = 'SKU can only contain letters, numbers, hyphens, and underscores'
    }

    if (!formData.category) {
      errs.category = 'Please select a product category'
    }

    if (!formData.unit) {
      errs.unit = 'Please select a unit of measure'
    }

    if (!isEdit && (formData.initialStock === undefined || formData.initialStock < 0)) {
      errs.initialStock = 'Initial stock cannot be negative'
    }

    if (!isEdit && !formData.initialLocation) {
      errs.initialLocation = 'Please select an initial stock location'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))

    // Clear error immediately on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleBlur = (field: keyof ProductFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validate()
  }

  const isValid =
    formData.name.trim().length >= 3 &&
    formData.sku.trim().length > 0 &&
    Boolean(formData.category) &&
    Boolean(formData.unit) &&
    (isEdit || formData.initialStock >= 0) &&
    (isEdit || Boolean(formData.initialLocation))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast.error('Validation Error', 'Please correct the highlighted fields.')
      return
    }

    setIsSubmitting(true)

    setTimeout(() => {
      setIsSubmitting(false)

      if (isEdit && id) {
        updateMockProduct(id, formData)
        toast.success('Product Updated', `${formData.sku} — ${formData.name} was successfully updated.`)
        navigate(`/products/${id}`)
      } else {
        const created = createMockProduct(formData)
        toast.success('Product Created', `${created.sku} added to catalog with ${created.onHand} ${created.unit}.`)
        navigate(`/products/${created.id}`)
      }
    }, 350)
  }

  if (isEdit && !existingProduct) {
    return (
      <div className="w-full max-w-2xl mx-auto p-12 text-center bg-white border border-slate-200/80 rounded-lg shadow-2xs space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-semibold text-slate-800">Product Not Found</h2>
        <p className="text-xs text-slate-500">The product identifier #{id} does not exist or was removed.</p>
        <Link to="/products">
          <Button variant="secondary" size="sm">
            Back to Products
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-16">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={isEdit && id ? `/products/${id}` : '/products'}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Go back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
              {isEdit ? `Edit Product: ${existingProduct?.sku}` : 'New Product'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Update master product classification and SKU identifiers.'
                : 'Define SKU parameters, category grouping, and initial warehouse stock placement.'}
            </p>
          </div>
        </div>

        <Link
          to={isEdit && id ? `/products/${id}` : '/products'}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Cancel
        </Link>
      </div>

      {/* ── Form Card ──────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 space-y-6">

          {/* Section 1: General Product Information */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              General Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <Input
                  label="Product Name"
                  required
                  id="product-name"
                  placeholder="e.g. Ergonomic Task Chair (Mesh Black)"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  error={touched.name ? errors.name : undefined}
                />
              </div>

              {/* SKU */}
              <div>
                <Input
                  label="Stock Keeping Unit (SKU)"
                  required
                  id="product-sku"
                  placeholder="e.g. SKU-ERG-904"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  onBlur={() => handleBlur('sku')}
                  error={touched.sku ? errors.sku : undefined}
                  className="font-mono uppercase"
                  hint="Unique product identifier code"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label
                  htmlFor="product-category"
                  className="block text-xs font-semibold text-gray-700 select-none tracking-tight"
                >
                  Category <span className="text-brand ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    id="product-category"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    onBlur={() => handleBlur('category')}
                    className={cn(
                      'w-full h-9 px-3 text-sm text-gray-800 bg-view border rounded shadow-xs appearance-none pr-8 transition-colors',
                      errors.category && touched.category
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200'
                        : 'border-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/20'
                    )}
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                {errors.category && touched.category && (
                  <p className="text-[11px] text-rose-600 font-medium">{errors.category}</p>
                )}
              </div>

              {/* Unit of Measure */}
              <div>
                <label
                  htmlFor="product-uom"
                  className="block text-xs font-semibold text-gray-700 select-none tracking-tight"
                >
                  Unit of Measure <span className="text-brand ml-1">*</span>
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="product-uom"
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    onBlur={() => handleBlur('unit')}
                    className="w-full h-9 px-3 text-sm text-gray-800 bg-view border border-gray-300 rounded shadow-xs appearance-none pr-8 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
                  >
                    {UNITS_OF_MEASURE.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Initial Inventory Placement */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              {isEdit ? 'Current Stock Summary' : 'Initial Stock Placement'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Initial Stock */}
              <div>
                <Input
                  label={isEdit ? 'Current On-Hand Balance' : 'Initial Stock Quantity'}
                  type="number"
                  min="0"
                  required={!isEdit}
                  disabled={isEdit}
                  id="initial-stock"
                  placeholder="0"
                  value={formData.initialStock}
                  onChange={(e) => handleChange('initialStock', Math.max(0, parseInt(e.target.value) || 0))}
                  onBlur={() => handleBlur('initialStock')}
                  error={touched.initialStock ? errors.initialStock : undefined}
                  hint={isEdit ? 'Stock adjustments are recorded via operations' : 'Opening stock units on hand'}
                />
              </div>

              {/* Initial Location */}
              <div>
                <label
                  htmlFor="initial-location"
                  className="block text-xs font-semibold text-gray-700 select-none tracking-tight"
                >
                  {isEdit ? 'Primary Location' : 'Initial Location'} <span className="text-brand ml-1">*</span>
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="initial-location"
                    disabled={isEdit}
                    value={formData.initialLocation}
                    onChange={(e) => handleChange('initialLocation', e.target.value)}
                    onBlur={() => handleBlur('initialLocation')}
                    className="w-full h-9 px-3 text-sm text-gray-800 bg-view border border-gray-300 rounded shadow-xs appearance-none pr-8 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    {WAREHOUSE_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.label}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                {errors.initialLocation && touched.initialLocation && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.initialLocation}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Actions Bar ────────────────────────────────────────── */}
        <div className="px-5 py-3.5 sm:px-6 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="text-brand">*</span> Required catalog attributes
          </div>

          <div className="flex items-center gap-2">
            <Link to={isEdit && id ? `/products/${id}` : '/products'}>
              <Button type="button" variant="secondary" size="sm">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!isValid || isSubmitting}
              isLoading={isSubmitting}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
