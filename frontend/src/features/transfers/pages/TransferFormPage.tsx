import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  ArrowLeftRight,
  Info,
  Package,
  MapPin,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/context/ToastContext'
import { TRANSFER_WAREHOUSES, createMockTransfer } from '../mockTransfers'
import { getMockProducts } from '@/features/products/mockProducts'
import { cn } from '@/lib/cn'

interface ProductLineForm {
  productId: string
  productSku: string
  productName: string
  quantity: number
  unit: string
}

export function TransferFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const catalog = getMockProducts()

  // ── Header State ──────────────────────────────────────────────────────────
  const [sourceWarehouseId, setSourceWarehouseId] = useState(TRANSFER_WAREHOUSES[0].id)
  const [sourceLocation, setSourceLocation] = useState(TRANSFER_WAREHOUSES[0].locations[0])

  const [destinationWarehouseId, setDestinationWarehouseId] = useState(TRANSFER_WAREHOUSES[1].id)
  const [destinationLocation, setDestinationLocation] = useState(TRANSFER_WAREHOUSES[1].locations[0])

  const [scheduledDate, setScheduledDate] = useState('Today, 16:00')
  const [notes, setNotes] = useState('')

  // ── Multiple Product Lines State ──────────────────────────────────────────
  const [lines, setLines] = useState<ProductLineForm[]>([
    {
      productId: catalog[0]?.id || 'prod-001',
      productSku: catalog[0]?.sku || 'SKU-ERG-904',
      productName: catalog[0]?.name || 'Ergonomic Task Chair (Mesh Black)',
      quantity: 25,
      unit: catalog[0]?.unit || 'pcs',
    },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeSrcWh = TRANSFER_WAREHOUSES.find((w) => w.id === sourceWarehouseId) || TRANSFER_WAREHOUSES[0]
  const activeDstWh = TRANSFER_WAREHOUSES.find((w) => w.id === destinationWarehouseId) || TRANSFER_WAREHOUSES[1]

  // Handle warehouse changes and update default locations
  const handleSourceWarehouseChange = (whId: string) => {
    setSourceWarehouseId(whId)
    const wh = TRANSFER_WAREHOUSES.find((w) => w.id === whId)
    if (wh && wh.locations.length > 0) {
      setSourceLocation(wh.locations[0])
    }
  }

  const handleDestinationWarehouseChange = (whId: string) => {
    setDestinationWarehouseId(whId)
    const wh = TRANSFER_WAREHOUSES.find((w) => w.id === whId)
    if (wh && wh.locations.length > 0) {
      setDestinationLocation(wh.locations[0])
    }
  }

  const handleAddLine = () => {
    const nextProd = catalog[lines.length % catalog.length] || catalog[0]
    setLines((prev) => [
      ...prev,
      {
        productId: nextProd.id,
        productSku: nextProd.sku,
        productName: nextProd.name,
        quantity: 10,
        unit: nextProd.unit,
      },
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      toast.warning('Minimum Item Required', 'A transfer must have at least one product line.')
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

  // Validation
  const isLocationsIdentical = sourceLocation === destinationLocation
  const hasValidLines =
    lines.length > 0 && lines.every((l) => l.productId && l.quantity > 0)
  const isValid = !isLocationsIdentical && hasValidLines

  const handleSubmit = (statusToSave: 'draft' | 'ready' | 'done') => {
    if (isLocationsIdentical) {
      toast.error('Invalid Routing', 'Source and destination locations cannot be identical.')
      return
    }

    if (!hasValidLines) {
      toast.error('Validation Error', 'Please ensure all product lines have valid quantities.')
      return
    }

    setIsSubmitting(true)

    setTimeout(() => {
      setIsSubmitting(false)
      const created = createMockTransfer({
        sourceWarehouseId,
        sourceLocation,
        destinationWarehouseId,
        destinationLocation,
        scheduledDate,
        notes: notes.trim() || undefined,
        status: statusToSave,
        lines: lines.map((l) => ({
          productId: l.productId,
          productSku: l.productSku,
          productName: l.productName,
          sourceLocation,
          destinationLocation,
          quantity: l.quantity,
          unit: l.unit,
        })),
      })

      toast.success(
        statusToSave === 'done' ? 'Transfer Validated' : 'Transfer Created',
        `${created.transferNumber} recorded successfully. Total inventory unchanged.`
      )
      navigate(`/operations/transfers/${created.id}`)
    }, 250)
  }

  const totalTransferUnits = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/transfers"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Back to transfers list"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
              New Internal Transfer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft an internal movement between warehouse facilities or rack locations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSubmit('draft')}
            disabled={!isValid || isSubmitting}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSubmit('ready')}
            disabled={!isValid || isSubmitting}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Mark Ready
          </Button>
        </div>
      </div>

      {/* ── Explicit Stock Semantics Callout ────────────────────────── */}
      <div className="bg-[#ede9fe]/40 border border-[#71639e]/25 rounded-lg p-3.5 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-brand-dark font-semibold">Important Inventory Rule: </strong>
          Internal transfers change location, not total inventory. When validated, items will be deducted from{' '}
          <span className="font-mono font-medium text-slate-900">{sourceLocation}</span> and credited to{' '}
          <span className="font-mono font-medium text-slate-900">{destinationLocation}</span> with zero impact on company aggregate stock.
        </div>
      </div>

      {/* ── Form Card ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 sm:p-6 shadow-2xs space-y-6">
        {/* Routing Configuration Grid */}
        <div>
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-brand" />
            <span>Origin & Destination Routing</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-lg bg-slate-50/60 border border-slate-200/70">
            {/* Source Warehouse & Location */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Source Location (From)
              </label>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Facility / Warehouse</label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => handleSourceWarehouseChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
                >
                  {TRANSFER_WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Specific Bin / Rack Location</label>
                <select
                  value={sourceLocation}
                  onChange={(e) => setSourceLocation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
                >
                  {activeSrcWh.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination Warehouse & Location */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-brand" />
                Destination Location (To)
              </label>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Facility / Warehouse</label>
                <select
                  value={destinationWarehouseId}
                  onChange={(e) => handleDestinationWarehouseChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
                >
                  {TRANSFER_WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Specific Bin / Rack Location</label>
                <select
                  value={destinationLocation}
                  onChange={(e) => setDestinationLocation(e.target.value)}
                  className={cn(
                    'w-full px-3 py-1.5 text-xs bg-white border rounded-md font-mono text-slate-800 focus:outline-none focus:ring-1',
                    isLocationsIdentical
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-700'
                      : 'border-slate-200 focus:ring-brand/30 focus:border-brand'
                  )}
                >
                  {activeDstWh.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isLocationsIdentical && (
            <div className="mt-2 text-xs text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Source and Destination locations must be different.
            </div>
          )}
        </div>

        {/* Schedule & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Scheduled Transfer Time</label>
            <Input
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              placeholder="e.g. Today, 16:30 or 2026-09-28"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Operational Transfer Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Replenish high-velocity staging buffer"
            />
          </div>
        </div>

        {/* ── Product Lines Section (Supports Multiple Lines) ──────── */}
        <div className="pt-2 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-brand" />
                <span>Product Lines</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Specify items and quantities being relocated in this transfer order.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={handleAddLine}
              leftIcon={<Plus className="w-3 h-3" />}
            >
              Add Product Line
            </Button>
          </div>

          {/* Lines Table */}
          <div className="border border-slate-200/80 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold select-none">
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3">Product Name & SKU</th>
                  <th className="py-2 px-3 w-36 text-right">Transfer Quantity</th>
                  <th className="py-2 px-3 w-20">Unit</th>
                  <th className="py-2 px-3 w-14 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Product Selector */}
                    <td className="py-2 px-3">
                      <select
                        value={line.productId}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
                      >
                        {catalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} ({p.onHand} on hand)
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-right text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3 text-slate-500 font-mono text-xs">
                      {line.unit}
                    </td>

                    {/* Remove Line */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 1}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          lines.length <= 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                        )}
                        title={lines.length <= 1 ? 'Minimum 1 line required' : 'Remove product line'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Footer */}
            <div className="bg-slate-50/70 border-t border-slate-200/80 px-4 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Total Line Items: <strong className="text-slate-800">{lines.length}</strong>
              </span>
              <div className="text-slate-700">
                Sum Total Units:{' '}
                <strong className="font-mono text-slate-900 text-sm">
                  {totalTransferUnits.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Actions ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
          <Link to="/operations/transfers">
            <Button variant="ghost" size="sm">
              Cancel & Return
            </Button>
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit('draft')}
              disabled={!isValid || isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              Save as Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit('ready')}
              disabled={!isValid || isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              {isSubmitting ? 'Recording...' : 'Create & Mark Ready'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit('done')}
              disabled={!isValid || isSubmitting}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex-1 sm:flex-initial"
            >
              Validate Immediately
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
