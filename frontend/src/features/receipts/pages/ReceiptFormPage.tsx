import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/context/ToastContext'
import { receiptsApi, CreateReceiptPayload } from '../api'
import { ApiError } from '@/lib/apiClient'
import { getMockProducts } from '@/features/products/mockProducts'
import { RECEIPT_WAREHOUSES } from '../mockReceipts'

interface ProductLineForm {
  productId: string
  productSku: string
  productName: string
  destinationLocation: string
  quantity: number
  unit: string
}

export function ReceiptFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const catalog = getMockProducts()

  // ── Header State ──────────────────────────────────────────────────────────
  const [supplierName, setSupplierName] = useState('')
  const [supplierReference, setSupplierReference] = useState('')
  const [warehouseId, setWarehouseId] = useState(RECEIPT_WAREHOUSES[0]!.id)
  const [notes, setNotes] = useState('')

  const activeWarehouse = (RECEIPT_WAREHOUSES.find((w) => w.id === warehouseId) || RECEIPT_WAREHOUSES[0])!

  // ── Lines State (Supports multiple product lines) ──────────────────────────
  const [lines, setLines] = useState<ProductLineForm[]>([
    {
      productId: catalog[0]?.id || 'prod-001',
      productSku: catalog[0]?.sku || 'SKU-ERG-904',
      productName: catalog[0]?.name || 'Ergonomic Task Chair (Mesh Black)',
      destinationLocation: activeWarehouse.defaultLocation,
      quantity: 50,
      unit: catalog[0]?.unit || 'pcs',
    },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleWarehouseChange = (whId: string) => {
    setWarehouseId(whId)
    const wh = RECEIPT_WAREHOUSES.find((w) => w.id === whId)
    if (wh) {
      setLines((prev) =>
        prev.map((l) => ({ ...l, destinationLocation: wh.defaultLocation }))
      )
    }
  }

  const handleAddLine = () => {
    const nextProd = (catalog[lines.length % catalog.length] || catalog[0])!
    setLines((prev) => [
      ...prev,
      {
        productId: nextProd.id,
        productSku: nextProd.sku,
        productName: nextProd.name,
        destinationLocation: activeWarehouse.defaultLocation,
        quantity: 25,
        unit: nextProd.unit,
      },
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      toast.warning('Minimum Item Required', 'A receipt must have at least one product line.')
      return
    }
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index: number, productId: string) => {
    const prod = catalog.find((p) => p.id === productId)
    if (!prod) return

    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              productId: prod.id,
              productSku: prod.sku,
              productName: prod.name,
              unit: prod.unit,
            }
          : l
      )
    )
  }

  const handleQuantityChange = (index: number, qty: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, qty) } : l))
    )
  }

  const handleLocationChange = (index: number, loc: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, destinationLocation: loc } : l))
    )
  }

  const isValid =
    warehouseId.trim().length > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.productId && l.quantity > 0)

  // ── Submit → POST /api/receipts ────────────────────────────────────────────
  const handleSubmit = async (validate: boolean) => {
    if (!isValid) {
      toast.error('Validation Error', 'Please complete all required fields and ensure product lines have valid quantities.')
      return
    }

    setIsSubmitting(true)

    try {
      // Build payload matching the backend CreateReceiptInput schema
      const payload: CreateReceiptPayload = {
        supplierName: supplierName.trim() || undefined,
        supplierReference: supplierReference.trim() || undefined,
        warehouseId,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          // destinationLocationId: left out; backend will resolve from warehouseId default
        })),
      }

      // Create the draft receipt
      const created = await receiptsApi.create(payload)

      // If user clicked "Validate & Receive", also trigger validate → process
      if (validate) {
        try {
          await receiptsApi.validate(created.id)
          await receiptsApi.process(created.id)
          toast.success(
            'Receipt Validated & Received',
            `${created.receiptNumber} created and stock booked into warehouse inventory.`
          )
        } catch (actionErr: unknown) {
          // Receipt was created even if validate/process failed — navigate to it
          const msg = actionErr instanceof ApiError ? actionErr.message : 'Created but validation failed.'
          toast.warning('Receipt Created', `${created.receiptNumber} saved as draft. ${msg}`)
        }
      } else {
        toast.success(
          'Draft Saved',
          `${created.receiptNumber} saved as draft with ${created.items.length} product line${created.items.length !== 1 ? 's' : ''}.`
        )
      }

      navigate(`/operations/receipts/${created.id}`)
    } catch (err: unknown) {
      const message = err instanceof ApiError
        ? err.message
        : 'Failed to create receipt. Please try again.'
      toast.error('Creation Failed', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-16">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/receipts"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Back to receipts"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
              New Receipt
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Record incoming stock from suppliers.
            </p>
          </div>
        </div>

        <Link to="/operations/receipts" className="text-xs text-slate-500 hover:text-slate-800">
          Cancel
        </Link>
      </div>

      {/* ── Form Card ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden space-y-6 p-5 sm:p-6">
        {/* Step 1: Supplier & Warehouse Routing */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Receipt Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Supplier Name */}
            <div>
              <Input
                label="Supplier"
                placeholder="e.g. Acme Corp"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                hint="Vendor or supplier name"
              />
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 select-none tracking-tight">
                Warehouse <span className="text-brand ml-1">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  value={warehouseId}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  className="w-full h-9 px-3 text-sm text-gray-800 bg-view border border-gray-300 rounded shadow-xs appearance-none pr-8 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
                >
                  {RECEIPT_WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>

            {/* Supplier PO Reference */}
            <div>
              <Input
                label="Source Document"
                placeholder="e.g. PO-8842"
                value={supplierReference}
                onChange={(e) => setSupplierReference(e.target.value)}
                hint="Purchase order or delivery slip number"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Multiple Product Lines */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Products ({lines.length})
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5 text-brand" />}
              onClick={handleAddLine}
              className="text-xs py-1"
            >
              Add Product Line
            </Button>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-md grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                {/* Product Select */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">
                    Product
                  </label>
                  <div className="relative">
                    <select
                      value={line.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full h-8 px-2.5 text-xs text-gray-800 bg-white border border-gray-300 rounded shadow-2xs appearance-none pr-7 focus:border-brand focus:ring-1 focus:ring-brand/30"
                    >
                      {catalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                  </div>
                </div>

                {/* Destination Location */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">
                    Destination Location
                  </label>
                  <input
                    type="text"
                    value={line.destinationLocation}
                    onChange={(e) => handleLocationChange(idx, e.target.value)}
                    placeholder="e.g. WH01/Inbound Staging"
                    className="w-full h-8 px-2.5 text-xs text-gray-800 bg-white border border-gray-300 rounded shadow-2xs focus:border-brand focus:ring-1 focus:ring-brand/30 font-mono"
                  />
                </div>

                {/* Quantity & Unit */}
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                    className="w-full h-8 px-2 text-xs font-mono font-bold text-slate-900 bg-white border border-gray-300 rounded shadow-2xs focus:border-brand text-right"
                  />
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {line.unit}
                  </span>
                </div>

                {/* Delete button */}
                <div className="sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={lines.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer rounded"
                    title="Remove item line"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-mono">
            <span>{lines.length} lines total</span>
            <span>
              Total Units:{' '}
              <strong className="text-slate-900 font-bold">
                {lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)}
              </strong>
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-gray-700 tracking-tight">
            Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or instructions..."
            className="w-full p-2.5 text-xs text-gray-800 bg-view border border-gray-300 rounded shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
          />
        </div>

        {/* ── Actions Bar ────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="text-brand">*</span> Validating will update warehouse stock balances immediately.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!isValid || isSubmitting}
              isLoading={isSubmitting}
              onClick={() => handleSubmit(false)}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!isValid || isSubmitting}
              isLoading={isSubmitting}
              onClick={() => handleSubmit(true)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Validate & Receive
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
