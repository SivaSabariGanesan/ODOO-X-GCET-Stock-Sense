import { useState } from 'react'
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
  createMockAdjustment,
} from '../mockAdjustments'
import { AdjustmentReason } from '../types'
import { getMockProducts } from '@/features/products/mockProducts'
import { cn } from '@/lib/cn'

export function AdjustmentFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const catalog = getMockProducts()

  // Selected Product
  const [selectedProductId, setSelectedProductId] = useState(catalog[0]?.id || 'prod-001')
  const activeProduct = (catalog.find((p) => p.id === selectedProductId) || catalog[0])!

  // Warehouse & Location
  const [warehouseId, setWarehouseId] = useState(ADJUSTMENT_WAREHOUSES[0]!.id)
  const activeWarehouse = (
    ADJUSTMENT_WAREHOUSES.find((w) => w.id === warehouseId) || ADJUSTMENT_WAREHOUSES[0]
  )!

  const [location, setLocation] = useState(activeWarehouse.locations[0]!)

  // Quantities
  // Initial system quantity is derived from product onHand or default
  const [systemQuantity, setSystemQuantity] = useState<number>(activeProduct.onHand || 100)
  const [countedQuantity, setCountedQuantity] = useState<number>(
    Math.max(0, (activeProduct.onHand || 100) - 3)
  )

  const [reason, setReason] = useState<AdjustmentReason>(ADJUSTMENT_REASONS[0]!)
  const [notes, setNotes] = useState('')

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived Difference: Counted - System
  const difference = countedQuantity - systemQuantity
  const isNegative = difference < 0
  const isPositive = difference > 0
  const isZero = difference === 0

  // Handle product change
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId)
    const p = catalog.find((prod) => prod.id === prodId)
    if (p) {
      setSystemQuantity(p.onHand)
      setCountedQuantity(p.onHand) // defaults to match, user can adjust
    }
  }

  // Handle warehouse change
  const handleWarehouseChange = (whId: string) => {
    setWarehouseId(whId)
    const wh = ADJUSTMENT_WAREHOUSES.find((w) => w.id === whId)
    if (wh && wh.locations.length > 0) {
      setLocation(wh.locations[0]!)
    }
  }

  const isValid =
    selectedProductId &&
    location &&
    !isNaN(systemQuantity) &&
    !isNaN(countedQuantity) &&
    countedQuantity >= 0

  const handleExecuteSave = (statusToSave: 'draft' | 'done') => {
    setIsSubmitting(true)

    setTimeout(() => {
      setIsSubmitting(false)
      setShowConfirmModal(false)

      const created = createMockAdjustment({
        productId: activeProduct.id,
        productSku: activeProduct.sku,
        productName: activeProduct.name,
        warehouseId: activeWarehouse.id,
        warehouseName: activeWarehouse.name,
        location,
        systemQuantity,
        countedQuantity,
        unit: activeProduct.unit || 'pcs',
        reason,
        notes: notes.trim() || undefined,
        status: statusToSave,
      })

      toast.success(
        statusToSave === 'done' ? 'Adjustment Validated' : 'Draft Saved',
        `${created.adjustmentNumber} recorded. Difference of ${difference >= 0 ? '+' : ''}${difference} ${activeProduct.unit} logged.`
      )
      navigate(`/operations/adjustments/${created.id}`)
    }, 200)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/adjustments"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Back to adjustments list"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
              New Inventory Adjustment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Reconcile physical stock counts with theoretical ledger balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExecuteSave('draft')}
            disabled={!isValid || isSubmitting}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowConfirmModal(true)}
            disabled={!isValid || isSubmitting}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Validate Adjustment
          </Button>
        </div>
      </div>

      {/* ── VISUALLY PROMINENT DIFFERENCE CARD ───────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>Live Stock Reconciliation Metric</span>
          <span className="font-mono text-slate-500">Unit: {activeProduct.unit}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
          {/* System Quantity */}
          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">System Theoretical Quantity</span>
            <div className="mt-2 font-mono font-bold text-2xl text-slate-900">
              {systemQuantity.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">{activeProduct.unit}</span>
            </div>
            <span className="text-[10.5px] text-slate-400 mt-1">Recorded on-hand balance</span>
          </div>

          {/* Counted Quantity */}
          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-700">Physical Counted Quantity</span>
            <div className="mt-2 font-mono font-bold text-2xl text-slate-900">
              {countedQuantity.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">{activeProduct.unit}</span>
            </div>
            <span className="text-[10.5px] text-slate-400 mt-1">Verified on warehouse floor</span>
          </div>

          {/* Prominent Difference Display */}
          <div
            className={cn(
              'p-3.5 rounded-lg border flex flex-col justify-between transition-all duration-200 shadow-xs select-none',
              isNegative && 'bg-rose-50/90 border-rose-200 text-rose-900',
              isPositive && 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
              isZero && 'bg-slate-100/90 border-slate-200 text-slate-800'
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  isNegative && 'text-rose-700',
                  isPositive && 'text-emerald-700',
                  isZero && 'text-slate-600'
                )}
              >
                Calculated Difference
              </span>
              {isNegative && <TrendingDown className="w-4 h-4 text-rose-600" />}
              {isPositive && <TrendingUp className="w-4 h-4 text-emerald-600" />}
              {isZero && <Minus className="w-4 h-4 text-slate-500" />}
            </div>

            <div
              className={cn(
                'mt-2 font-mono font-black text-2xl tracking-tight',
                isNegative && 'text-rose-600',
                isPositive && 'text-emerald-600',
                isZero && 'text-slate-700'
              )}
            >
              {isPositive ? '+' : ''}
              {difference.toLocaleString()}{' '}
              <span className="text-xs font-bold">{activeProduct.unit}</span>
            </div>

            <div
              className={cn(
                'text-[10.5px] font-semibold mt-1',
                isNegative && 'text-rose-700',
                isPositive && 'text-emerald-700',
                isZero && 'text-slate-500'
              )}
            >
              {isNegative && 'Deficit / Shortage (Stock will decrease)'}
              {isPositive && 'Surplus / Overage (Stock will increase)'}
              {isZero && 'Exact Match (Zero Discrepancy)'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Inputs Card ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 sm:p-6 shadow-2xs space-y-6">
        {/* Product Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
            <Package className="w-3.5 h-3.5 text-brand" />
            Product Item
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => handleProductSelect(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
          >
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.name} ({p.onHand} {p.unit} on hand)
              </option>
            ))}
          </select>
        </div>

        {/* Warehouse & Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Facility / Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
            >
              {ADJUSTMENT_WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              Audited Bin / Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
            >
              {activeWarehouse.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantities Editor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Theoretical System Quantity ({activeProduct.unit})
            </label>
            <input
              type="number"
              min="0"
              value={systemQuantity}
              onChange={(e) => setSystemQuantity(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
            />
            <span className="text-[10.5px] text-slate-400 mt-0.5 block">
              Defaulted to product recorded balance.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-900 block mb-1">
              Physical Counted Quantity ({activeProduct.unit}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={countedQuantity}
              onChange={(e) => setCountedQuantity(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-1.5 text-xs bg-white border border-brand/40 rounded-md font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            <span className="text-[10.5px] text-slate-500 mt-0.5 block">
              Enter verified physical count from shelf inspection.
            </span>
          </div>
        </div>

        {/* Reason & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Adjustment Reason Code <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
            >
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Audit Notes & Justification
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 3 damaged units found during floor count in aisle 4"
            />
          </div>
        </div>

        {/* ── Form Actions ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
          <Link to="/operations/adjustments">
            <Button variant="ghost" size="sm">
              Cancel & Return
            </Button>
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExecuteSave('draft')}
              disabled={!isValid || isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              Save as Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowConfirmModal(true)}
              disabled={!isValid || isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              Validate Adjustment
            </Button>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal Before Validation ────────────────────── */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        variant="warning"
        title="Confirm Stock Adjustment Validation"
        description="You are about to officially reconcile the theoretical inventory balance with the physical count."
        confirmLabel="Confirm & Validate"
        isLoading={isSubmitting}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => handleExecuteSave('done')}
      >
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Product:</span>
            <span className="font-semibold text-slate-900 text-right truncate max-w-[220px]">
              {activeProduct.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Location:</span>
            <span className="font-mono text-slate-800">{location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">System Quantity:</span>
            <span className="font-mono text-slate-800">{systemQuantity} {activeProduct.unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Physical Counted:</span>
            <span className="font-mono font-bold text-slate-900">{countedQuantity} {activeProduct.unit}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            <span className="font-bold text-slate-700">Net Variance:</span>
            <span
              className={cn(
                'font-mono font-bold text-sm px-2.5 py-0.5 rounded border',
                isNegative && 'bg-rose-50 text-rose-700 border-rose-200',
                isPositive && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                isZero && 'bg-slate-100 text-slate-700 border-slate-200'
              )}
            >
              {isPositive ? '+' : ''}{difference} {activeProduct.unit}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-normal">
          Reason: <strong className="text-slate-800">{reason}</strong>. This adjustment will permanently update on-hand inventory levels for this SKU.
        </p>
      </ConfirmationModal>
    </div>
  )
}
