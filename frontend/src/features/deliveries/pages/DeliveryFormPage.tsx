import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, ArrowUpFromLine, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/context/ToastContext'
import { deliveriesApi, CreateDeliveryPayload } from '../api'
import { ApiError, apiClient } from '@/lib/apiClient'
import { getMockProducts } from '@/features/products/mockProducts'

interface ProductOption {
  id: string
  name: string
  sku: string
  unit: string
}

interface ProductLineForm {
  productId: string
  productSku: string
  productName: string
  sourceLocationId?: string
  quantity: number
  unitPrice?: number
  unit: string
}

export function DeliveryFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const defaultCatalog: ProductOption[] = getMockProducts().map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
  }))

  const [catalog, setCatalog] = useState<ProductOption[]>(defaultCatalog)

  // ── Header State ──────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState('Global Logistics Direct')
  const [customerReference, setCustomerReference] = useState('')
  const [warehouseId, setWarehouseId] = useState('64a05d3b-e307-4a31-a335-029ecc4273ff')
  const [notes, setNotes] = useState('')

  // ── Lines State ───────────────────────────────────────────────────────────
  const [lines, setLines] = useState<ProductLineForm[]>([
    {
      productId: defaultCatalog[0]?.id || 'prod-001',
      productSku: defaultCatalog[0]?.sku || 'SKU-ERG-904',
      productName: defaultCatalog[0]?.name || 'Ergonomic Task Chair (Mesh Black)',
      quantity: 10,
      unit: defaultCatalog[0]?.unit || 'pcs',
    },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Try to load real products from /api/products
  useEffect(() => {
    let isMounted = true
    async function loadProducts() {
      try {
        const res = await apiClient.get<{ data: Array<{ id: string; name: string; sku: string; uom?: { symbol?: string } }> }>('/api/products')
        if (isMounted && res.data && res.data.length > 0) {
          const apiProducts: ProductOption[] = res.data.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: p.uom?.symbol || 'pcs',
          }))
          setCatalog(apiProducts)
          if (apiProducts[0]) {
            setLines((prev) => [
              {
                productId: apiProducts[0]!.id,
                productSku: apiProducts[0]!.sku,
                productName: apiProducts[0]!.name,
                quantity: prev[0]?.quantity || 10,
                unit: apiProducts[0]!.unit,
              },
            ])
          }
        }
      } catch {
        // Fall back to default catalog if offline or API empty
      }
    }
    loadProducts()
    return () => {
      isMounted = false
    }
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddLine = () => {
    const nextProd = catalog[lines.length % catalog.length] || catalog[0]!
    setLines((prev) => [
      ...prev,
      {
        productId: nextProd.id,
        productSku: nextProd.sku,
        productName: nextProd.name,
        quantity: 5,
        unit: nextProd.unit,
      },
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      toast.warning(
        'Minimum Item Required',
        'A delivery order must have at least one product line.'
      )
      return
    }
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = catalog.find((p) => p.id === prodId)
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

  const handleUnitPriceChange = (index: number, price: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, unitPrice: price } : l))
    )
  }

  const isValid =
    customer.trim().length > 0 &&
    warehouseId.trim().length > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.productId && l.quantity > 0)

  const handleSubmit = async (confirmWorkflow: boolean) => {
    if (!isValid) {
      toast.error(
        'Validation Error',
        'Please complete all required fields and verify demand quantities.'
      )
      return
    }

    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const payload: CreateDeliveryPayload = {
        customerName: customer.trim() || undefined,
        customerReference: customerReference.trim() || undefined,
        warehouseId: warehouseId.trim(),
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      }

      // 1. Create delivery in backend
      const created = await deliveriesApi.create(payload)

      if (confirmWorkflow) {
        try {
          // Progress through workflow: pick -> pack
          await deliveriesApi.pick(created.id)
          await deliveriesApi.pack(created.id)
          toast.success(
            'Delivery Confirmed & Ready',
            `${created.deliveryNumber} confirmed, picked, and staged for dispatch.`
          )
        } catch (actionErr: unknown) {
          const msg =
            actionErr instanceof ApiError
              ? actionErr.message
              : 'Delivery created as draft, but workflow confirmation had an issue.'
          toast.warning('Delivery Saved as Draft', msg)
        }
      } else {
        toast.success(
          'Delivery Order Created',
          `${created.deliveryNumber} generated as draft with ${created.items.length} line item(s).`
        )
      }

      navigate(`/operations/deliveries/${created.id}`)
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to create delivery. Please check required fields.'
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
            to="/operations/deliveries"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Back to deliveries"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
              New Delivery Order
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Prepare and process outgoing stock.
            </p>
          </div>
        </div>

        <Link
          to="/operations/deliveries"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Cancel
        </Link>
      </div>

      {/* ── Form Card ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden space-y-6 p-5 sm:p-6">
        {/* Step 1: Customer & Warehouse Routing */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Delivery Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 select-none tracking-tight">
                Customer <span className="text-brand ml-1">*</span>
              </label>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="mt-1.5"
                required
              />
            </div>

            {/* Customer Reference */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 select-none tracking-tight">
                Source Document
              </label>
              <Input
                value={customerReference}
                onChange={(e) => setCustomerReference(e.target.value)}
                placeholder="e.g. SO-2026-904"
                className="mt-1.5 font-mono"
              />
            </div>

            {/* Warehouse ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 select-none tracking-tight">
                Warehouse ID <span className="text-brand ml-1">*</span>
              </label>
              <Input
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                placeholder="Warehouse UUID"
                className="mt-1.5 font-mono text-xs"
                required
              />
              <span className="text-[10.5px] text-slate-400 mt-1 block">
                Source warehouse identifier
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 select-none tracking-tight">
                Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Protective wrap required"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Product Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Products ({lines.length})
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddLine}
              className="text-xs py-1"
            >
              Add Product Line
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Line #{idx + 1}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Remove product line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Product Selector */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Product
                    </label>
                    <select
                      value={line.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full h-8 px-2.5 text-xs text-slate-800 bg-white border border-slate-300 rounded shadow-xs focus:border-brand focus:ring-1 focus:ring-brand/30"
                    >
                      {catalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Quantity ({line.unit})
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        handleQuantityChange(idx, parseInt(e.target.value) || 1)
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Total Demand:{' '}
            <strong className="text-slate-800">
              {lines.reduce((acc, l) => acc + l.quantity, 0)} units
            </strong>{' '}
            across {lines.length} item{lines.length !== 1 ? 's' : ''}
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
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !isValid}
              className="flex-1 sm:flex-none justify-center"
            >
              {isSubmitting ? 'Confirming…' : 'Confirm & Reserve'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
