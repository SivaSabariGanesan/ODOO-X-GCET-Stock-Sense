import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Package,
  MapPin,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { useToast } from '@/context/ToastContext'
import {
  ADJUSTMENT_REASONS,
  ADJUSTMENT_WAREHOUSES,
} from '../mockAdjustments'
import { adjustmentsApi, CreateAdjustmentPayload } from '../api'
import { apiClient, ApiError } from '@/lib/apiClient'
import { getMockProducts } from '@/features/products/mockProducts'
import { cn } from '@/lib/cn'

interface ProductOption {
  id: string
  name: string
  sku: string
  unit: string
  onHand: number
}

interface LocationOption {
  id: string
  name: string
  fullPath: string
}

export function AdjustmentFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const defaultProducts: ProductOption[] = getMockProducts().map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    onHand: p.onHand || 100,
  }))

  const defaultLocations: LocationOption[] = [
    { id: 'loc-001', name: 'Main Stock', fullPath: 'WH/Stock' },
    { id: 'loc-002', name: 'Rack A-12', fullPath: 'WH/Stock/Rack-A12' },
    { id: 'loc-003', name: 'Cold Shelf 2', fullPath: 'WH/Cold/Shelf-2' },
  ]

  const [products, setProducts] = useState<ProductOption[]>(defaultProducts)
  const [locations, setLocations] = useState<LocationOption[]>(defaultLocations)

  const [selectedProductId, setSelectedProductId] = useState(defaultProducts[0]?.id || '')
  const [selectedLocationId, setSelectedLocationId] = useState(defaultLocations[0]?.id || '')

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0]!

  // System & Counted Quantities
  const [systemQuantity, setSystemQuantity] = useState<number>(activeProduct.onHand || 100)
  const [countedQuantity, setCountedQuantity] = useState<number>(
    Math.max(0, (activeProduct.onHand || 100) - 3)
  )

  const [reason, setReason] = useState<string>(ADJUSTMENT_REASONS[0]!)
  const [notes, setNotes] = useState('')

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load real products & locations from backend APIs
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const prodRes = await apiClient.get<{ data: Array<{ id: string; name: string; sku: string; uom?: { abbreviation?: string; symbol?: string } }> }>('/api/products')
        if (isMounted && prodRes.data && prodRes.data.length > 0) {
          const mapped = prodRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: p.uom?.abbreviation || p.uom?.symbol || 'pcs',
            onHand: 100,
          }))
          setProducts(mapped)
          setSelectedProductId(mapped[0]!.id)
        }
      } catch {
        // Fallback to sample catalog
      }

      try {
        const locRes = await apiClient.get<{ data: Array<{ id: string; name: string; fullPath: string }> }>('/api/locations')
        if (isMounted && locRes.data && locRes.data.length > 0) {
          const mapped = locRes.data.map((l) => ({
            id: l.id,
            name: l.name,
            fullPath: l.fullPath,
          }))
          setLocations(mapped)
          setSelectedLocationId(mapped[0]!.id)
        }
      } catch {
        // Fallback to default locations
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Derived Difference: Counted - System
  const difference = countedQuantity - systemQuantity
  const isNegative = difference < 0
  const isPositive = difference > 0
  const isZero = difference === 0

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId)
    const p = products.find((prod) => prod.id === prodId)
    if (p) {
      setSystemQuantity(p.onHand)
      setCountedQuantity(p.onHand)
    }
  }

  const isValid =
    selectedProductId.trim().length > 0 &&
    selectedLocationId.trim().length > 0 &&
    !isNaN(countedQuantity) &&
    countedQuantity >= 0

  const handleSubmit = async (applyNow: boolean) => {
    if (!isValid) {
      toast.error('Validation Error', 'Please select a product, location, and non-negative counted quantity.')
      return
    }

    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const payload: CreateAdjustmentPayload = {
        reason: reason.trim() || undefined,
        locationId: selectedLocationId,
        items: [
          {
            productId: selectedProductId,
            countedQuantity,
          },
        ],
      }

      const created = await adjustmentsApi.create(payload)

      if (applyNow) {
        try {
          await adjustmentsApi.process(created.id)
          toast.success(
            'Adjustment Applied to Inventory',
            `${created.adjustmentNumber} reconciled. Stock balance adjusted by ${difference >= 0 ? '+' : ''}${difference} ${activeProduct.unit}.`
          )
        } catch (procErr: unknown) {
          const msg = procErr instanceof ApiError ? procErr.message : 'Created draft, but failed to apply immediately.'
          toast.warning('Draft Saved', msg)
        }
      } else {
        toast.success(
          'Adjustment Saved as Draft',
          `${created.adjustmentNumber} created. Awaiting physical audit signoff.`
        )
      }

      navigate(`/operations/adjustments/${created.id}`)
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create adjustment. Please try again.'
      toast.error('Creation Failed', msg)
    } finally {
      setIsSubmitting(false)
      setShowConfirmModal(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/adjustments"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Back to adjustments"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
              Record Physical Inventory Adjustment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Input physical cycle count results to reconcile warehouse stock differences.
            </p>
          </div>
        </div>

        <Link to="/operations/adjustments" className="text-xs text-slate-500 hover:text-slate-800">
          Cancel
        </Link>
      </div>

      {/* ── Form Card ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-5 sm:p-6 space-y-6">
        {/* Section 1: Item & Location */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-brand" />
            <span>1. Target Product & Audit Location</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 select-none">
                Audited Product <span className="text-brand ml-0.5">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="mt-1.5 w-full h-9 px-3 text-xs text-slate-800 bg-white border border-slate-300 rounded shadow-xs focus:border-brand focus:ring-1 focus:ring-brand/30 cursor-pointer"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Location Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 select-none">
                Warehouse Location <span className="text-brand ml-0.5">*</span>
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="mt-1.5 w-full h-9 px-3 text-xs text-slate-800 bg-white border border-slate-300 rounded shadow-xs focus:border-brand focus:ring-1 focus:ring-brand/30 cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.fullPath})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Counted Quantities & Live Variance Calculation */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            <span>2. Quantities & Discrepancy Reconciliation</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Theoretical System Qty (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 select-none">
                System Theoretical Quantity ({activeProduct.unit})
              </label>
              <Input
                type="number"
                value={systemQuantity}
                disabled
                className="mt-1.5 font-mono bg-slate-50/80 text-slate-700 cursor-not-allowed"
              />
              <span className="text-[10.5px] text-slate-400 mt-1 block">
                Theoretical ledger balance resolved by Inventory Engine
              </span>
            </div>

            {/* Physical Counted Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 select-none">
                Physical Counted Quantity ({activeProduct.unit}) <span className="text-brand ml-0.5">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={countedQuantity}
                onChange={(e) => setCountedQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mt-1.5 font-mono text-slate-900 font-bold border-brand focus:ring-brand/20"
                placeholder="0"
                required
              />
              <span className="text-[10.5px] text-slate-400 mt-1 block">
                Audited stock physically counted on shelves (must be ≥ 0)
              </span>
            </div>
          </div>

          {/* Live Variance Preview Strip */}
          <div
            className={cn(
              'p-4 rounded-lg border flex items-center justify-between transition-colors shadow-2xs',
              isNegative && 'bg-rose-50 border-rose-200 text-rose-900',
              isPositive && 'bg-emerald-50 border-emerald-200 text-emerald-900',
              isZero && 'bg-slate-50 border-slate-200 text-slate-800'
            )}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                {isNegative && <TrendingDown className="w-4 h-4 text-rose-600" />}
                {isPositive && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                {isZero && <Minus className="w-4 h-4 text-slate-400" />}
                <span>
                  {isNegative && 'Stock Deficit (Loss / Shrinkage)'}
                  {isPositive && 'Stock Surplus (Unrecorded Stock Found)'}
                  {isZero && 'Exact Physical Match (No Variance)'}
                </span>
              </div>
              <div className="text-[11px] opacity-75 mt-0.5">
                Calculated adjustment delta: counted ({countedQuantity}) − system ({systemQuantity})
              </div>
            </div>

            <div className="text-right font-mono font-bold text-2xl">
              {isPositive ? '+' : ''}
              {difference.toLocaleString()} <span className="text-sm font-normal opacity-70">{activeProduct.unit}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Reason & Notes */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            3. Audit Classification & Documentation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 select-none">
                Adjustment Reason <span className="text-brand ml-0.5">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5 w-full h-9 px-3 text-xs text-slate-800 bg-white border border-slate-300 rounded shadow-xs focus:border-brand focus:ring-1 focus:ring-brand/30 cursor-pointer"
              >
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 select-none">
                Audit Notes / Investigation
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Broken box found in aisle 3"
                className="mt-1.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Net adjustment effect:{' '}
            <strong className="font-mono text-slate-800">
              {isPositive ? '+' : ''}{difference} {activeProduct.unit}
            </strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !isValid}
              className="flex-1 sm:flex-none justify-center"
            >
              {isSubmitting ? 'Saving…' : 'Save as Draft'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting || !isValid}
              className="flex-1 sm:flex-none justify-center"
            >
              Validate & Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => handleSubmit(true)}
        title="Confirm Inventory Adjustment"
        message={`This will immediately record the count of ${countedQuantity} ${activeProduct.unit} and update theoretical warehouse stock by ${isPositive ? '+' : ''}${difference} ${activeProduct.unit}.`}
        confirmLabel="Confirm & Apply to Stock"
        confirmVariant="primary"
        isLoading={isSubmitting}
      />
    </div>
  )
}
