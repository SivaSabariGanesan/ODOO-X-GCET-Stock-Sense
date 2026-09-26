import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpFromLine,
  Clock,
  Printer,
  XCircle,
  Copy,
  Check,
  PackageCheck,
  Truck,
  Box,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useDelivery } from '../hooks/useDelivery'
import { ApiDeliveryStatus } from '../api'
import { cn } from '@/lib/cn'

export function DeliveryDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const {
    delivery,
    isLoading,
    error,
    isActioning,
    pick,
    pack,
    process: processDelivery,
    cancel: cancelDelivery,
    refetch,
  } = useDelivery(id)

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  const handlePrintSlip = () => {
    toast.info(
      'Printing Slip',
      `Delivery Note & Packing List for ${delivery?.deliveryNumber} sent to printer.`
    )
  }

  const handlePick = async () => {
    if (!delivery || isActioning) return
    try {
      await pick()
      toast.success(
        'Picking Completed',
        `${delivery.deliveryNumber} moved to WAITING state. Items staged for packing.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pick delivery.'
      toast.error('Pick Failed', msg)
    }
  }

  const handlePack = async () => {
    if (!delivery || isActioning) return
    try {
      await pack()
      toast.info(
        'Packing Completed',
        `${delivery.deliveryNumber} is now READY. Cartons sealed and staged for dispatch.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pack delivery.'
      toast.error('Pack Failed', msg)
    }
  }

  const handleProcess = async () => {
    if (!delivery || isActioning) return
    try {
      await processDelivery()
      toast.success(
        'Shipment Dispatched',
        `${delivery.deliveryNumber} has been validated, stock deducted, and marked DONE.`
      )
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to process and dispatch delivery.'
      toast.error('Dispatch Failed', msg)
    }
  }

  const handleCancel = async () => {
    if (!delivery || isActioning) return
    try {
      await cancelDelivery()
      toast.warning(
        'Delivery Canceled',
        `${delivery.deliveryNumber} has been marked as canceled.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel delivery.'
      toast.error('Cancel Failed', msg)
    }
  }

  // ── Loading State ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <span className="text-sm">Loading delivery details…</span>
      </div>
    )
  }

  // ── Error State / 404 ─────────────────────────────────────────────────────
  if (error === 'not_found' || !delivery) {
    return (
      <EmptyState
        icon={ArrowUpFromLine}
        title="Delivery Not Found"
        description={`The delivery order identifier #${id} does not exist.`}
        actionLabel="Back to Deliveries"
        onAction={() => navigate('/operations/deliveries')}
      />
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 space-y-4">
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="secondary" size="sm" onClick={refetch}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
        <div>
          <Link
            to="/operations/deliveries"
            className="text-xs text-brand hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Deliveries
          </Link>
        </div>
      </div>
    )
  }

  const stages: { key: ApiDeliveryStatus; label: string }[] = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'WAITING', label: 'Waiting Stock' },
    { key: 'READY', label: 'Ready' },
    { key: 'DONE', label: 'Done' },
  ]

  const currentStageIndex =
    delivery.status === 'CANCELED'
      ? -1
      : stages.findIndex((s) => s.key === delivery.status)

  const items = delivery.items || []
  const totalQuantity = items.reduce(
    (sum, it) => sum + (parseFloat(it.quantity) || 0),
    0
  )

  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return '—'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* ── Header & Action Controls ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/operations/deliveries"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mt-0.5"
            title="Back to deliveries"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {delivery.deliveryNumber}
              </span>
              <button
                type="button"
                onClick={() => copyText(delivery.deliveryNumber, 'Delivery number')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Copy reference"
              >
                <Copy className="w-3 h-3" />
              </button>
              <Badge
                variant={
                  delivery.status === 'DONE'
                    ? 'done'
                    : delivery.status === 'READY'
                    ? 'ready'
                    : delivery.status === 'WAITING'
                    ? 'warning'
                    : delivery.status === 'CANCELED'
                    ? 'cancelled'
                    : 'draft'
                }
                dot
              >
                {delivery.status === 'WAITING'
                  ? 'WAITING AVAILABILITY'
                  : delivery.status}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {delivery.customerName || 'No Customer Specified'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              SO Ref:{' '}
              <span className="font-mono font-medium text-slate-700">
                {delivery.customerReference || 'None'}
              </span>{' '}
              · Source:{' '}
              <span className="font-medium text-slate-700">
                {delivery.defaultSourceLocation?.name ||
                  delivery.defaultSourceLocation?.fullPath ||
                  'Default Source'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons based on status */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={handlePrintSlip}
          >
            Print Slip
          </Button>

          {delivery.status === 'DRAFT' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePick}
              disabled={isActioning}
            >
              {isActioning ? 'Updating…' : 'Confirm Order'}
            </Button>
          )}

          {delivery.status === 'WAITING' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePack}
              disabled={isActioning}
            >
              {isActioning ? 'Updating…' : 'Check Availability & Reserve'}
            </Button>
          )}

          {delivery.status === 'READY' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Truck className="w-3.5 h-3.5" />}
              onClick={handleProcess}
              disabled={isActioning}
            >
              {isActioning ? 'Dispatching…' : 'Validate & Dispatch'}
            </Button>
          )}

          {delivery.status !== 'DONE' && delivery.status !== 'CANCELED' && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              disabled={isActioning}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ── Visual Stage Progress Tracker ────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-6 sm:py-3.5 shadow-2xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {stages.map((stg, idx) => {
            const isCompleted =
              currentStageIndex > idx || delivery.status === 'DONE'
            const isCurrent =
              currentStageIndex === idx && delivery.status !== 'DONE'

            return (
              <div
                key={stg.key}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-brand text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    )}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isCurrent
                        ? 'text-slate-900 font-bold'
                        : isCompleted
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    )}
                  >
                    {stg.label}
                  </span>
                </div>

                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-3',
                      currentStageIndex > idx ? 'bg-emerald-500' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {delivery.status === 'CANCELED' && (
          <div className="mt-2 text-center text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span>
              This delivery order has been canceled. Stock reservations released.
            </span>
          </div>
        )}
      </div>

      {/* ── Pick & Pack Physical Execution Strip (Interactive Steps) ─── */}
      {delivery.status !== 'CANCELED' && (
        <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  delivery.status === 'WAITING' ||
                    delivery.status === 'READY' ||
                    delivery.status === 'DONE'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                )}
              >
                <Box className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Step 1: Warehouse Picking
                </div>
                <div className="text-[11px] text-slate-500">
                  {delivery.status === 'DRAFT'
                    ? 'Awaiting pick execution'
                    : 'Items picked from racks'}
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  delivery.status === 'READY' || delivery.status === 'DONE'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                )}
              >
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Step 2: Carton Packing
                </div>
                <div className="text-[11px] text-slate-500">
                  {delivery.status === 'READY' || delivery.status === 'DONE'
                    ? 'Packed & labeled for shipment'
                    : 'Cartons pending seal'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {delivery.status === 'DRAFT' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePick}
                disabled={isActioning}
              >
                {isActioning ? 'Updating…' : 'Complete Picking'}
              </Button>
            )}
            {delivery.status === 'WAITING' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePack}
                disabled={isActioning}
              >
                {isActioning ? 'Updating…' : 'Seal Cartons (Pack)'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Product Demand & Pick Lines */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-brand" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Outbound Product Lines ({items.length})
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-500">
                <strong className="text-slate-900 font-sans">{totalQuantity}</strong> total units
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5">Item & SKU</th>
                    <th className="px-3 py-2.5">Source Location</th>
                    <th className="px-3 py-2.5 text-right font-mono">Demand Qty</th>
                    <th className="px-4 py-2.5 text-right font-mono">Done Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                        No product lines in this delivery order.
                      </td>
                    </tr>
                  ) : (
                    items.map((line) => {
                      const qty = parseFloat(line.quantity) || 0
                      const doneQty = delivery.status === 'DONE' ? qty : 0

                      return (
                        <tr
                          key={line.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {line.product?.name || line.productId}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                              {line.product?.sku || 'SKU'}
                            </div>
                          </td>

                          <td className="px-3 py-3 font-mono text-slate-600">
                            {line.sourceLocation?.name ||
                              line.sourceLocation?.fullPath ||
                              delivery.defaultSourceLocation?.name ||
                              'Warehouse Stock'}
                          </td>

                          <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900">
                            {qty}{' '}
                            <span className="text-[10.5px] font-normal text-slate-400">
                              units
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-mono">
                            <span
                              className={cn(
                                'font-bold',
                                doneQty > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              )}
                            >
                              {doneQty}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Shipment & Warehouse Logistics */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Shipment Logistics
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Warehouse</span>
                <span className="font-semibold text-slate-800">
                  {delivery.warehouse?.name || delivery.warehouseId}
                </span>
                {delivery.warehouse?.shortCode && (
                  <span className="font-mono text-slate-500 block text-[11px]">
                    Code: {delivery.warehouse.shortCode}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Staging Source</span>
                <span className="font-mono text-slate-700">
                  {delivery.defaultSourceLocation?.fullPath ||
                    delivery.defaultSourceLocation?.name ||
                    'Standard Outbound Bay'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Created Date</span>
                <div className="flex items-center gap-1.5 font-medium text-slate-700 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(delivery.createdAt)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Validated / Processed</span>
                <span className="text-slate-700 font-medium">
                  {formatDate(delivery.validatedAt)}
                </span>
              </div>

              {delivery.creator && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Created By</span>
                  <span className="text-slate-700 font-medium">
                    {delivery.creator.name} ({delivery.creator.email})
                  </span>
                </div>
              )}
            </div>

            {delivery.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[11px] mb-1">
                  Dispatch Instructions
                </span>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                  "{delivery.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
