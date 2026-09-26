import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpFromLine,
  Clock,
  Printer,
  XCircle,
  Copy,
  History,
  Check,
  PackageCheck,
  Truck,
  Box,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { getMockDeliveryById, updateDeliveryStatus, updateDeliveryPicking } from '../mockDeliveries'
import { Delivery, DeliveryStatus } from '../types'
import { cn } from '@/lib/cn'

export function DeliveryDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [delivery, setDelivery] = useState<Delivery | undefined>(
    id ? getMockDeliveryById(id) : undefined
  )

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  const handlePrintSlip = () => {
    toast.info('Printing Slip', `Delivery Note & Packing List for ${delivery?.deliveryNumber} sent to printer.`)
  }

  const handleStatusChange = (newStatus: DeliveryStatus) => {
    if (!delivery) return
    const updated = updateDeliveryStatus(delivery.id, newStatus)
    if (updated) {
      setDelivery({ ...updated })
      if (newStatus === 'done') {
        toast.success('Shipment Dispatched', `${delivery.deliveryNumber} has been validated and inventory deducted.`)
      } else if (newStatus === 'ready') {
        toast.info('Order Ready', 'Stock reserved. Staged for vehicle loading.')
      } else if (newStatus === 'waiting') {
        toast.info('Order Confirmed', 'Awaiting allocation check in warehouse.')
      } else if (newStatus === 'cancelled') {
        toast.warning('Delivery Canceled', `${delivery.deliveryNumber} marked as canceled.`)
      }
    }
  }

  const handlePickingAction = (action: 'pick' | 'pack') => {
    if (!delivery) return
    const updated = updateDeliveryPicking(delivery.id, action)
    if (updated) {
      setDelivery({ ...updated })
      toast.success(
        action === 'pick' ? 'Picking Completed' : 'Packing Completed',
        action === 'pick'
          ? 'Forklift route completed and items staged.'
          : 'Cartons sealed and shipping labels affixed.'
      )
    }
  }

  if (!delivery) {
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

  const stages: { key: DeliveryStatus; label: string }[] = [
    { key: 'draft', label: 'Draft' },
    { key: 'waiting', label: 'Waiting Stock' },
    { key: 'ready', label: 'Ready' },
    { key: 'done', label: 'Done' },
  ]

  const currentStageIndex =
    delivery.status === 'cancelled'
      ? -1
      : stages.findIndex((s) => s.key === delivery.status)

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
                  delivery.status === 'done'
                    ? 'done'
                    : delivery.status === 'ready'
                    ? 'ready'
                    : delivery.status === 'waiting'
                    ? 'warning'
                    : delivery.status === 'cancelled'
                    ? 'cancelled'
                    : 'draft'
                }
                dot
              >
                {delivery.status === 'waiting' ? 'WAITING AVAILABILITY' : delivery.status.toUpperCase()}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {delivery.customer}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              SO Ref: <span className="font-mono font-medium text-slate-700">{delivery.customerReference || 'None'}</span> · Source: <span className="font-medium text-slate-700">{delivery.sourceLocation}</span>
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

          {delivery.status === 'draft' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange('waiting')}
            >
              Confirm Order
            </Button>
          )}

          {delivery.status === 'waiting' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange('ready')}
            >
              Check Availability & Reserve
            </Button>
          )}

          {delivery.status === 'ready' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Truck className="w-3.5 h-3.5" />}
              onClick={() => handleStatusChange('done')}
            >
              Validate & Dispatch
            </Button>
          )}

          {delivery.status !== 'done' && delivery.status !== 'cancelled' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleStatusChange('cancelled')}
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
            const isCompleted = currentStageIndex > idx || delivery.status === 'done'
            const isCurrent = currentStageIndex === idx && delivery.status !== 'done'

            return (
              <div key={stg.key} className="flex items-center flex-1 last:flex-none">
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
                      isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
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

        {delivery.status === 'cancelled' && (
          <div className="mt-2 text-center text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span>This delivery order has been canceled. Stock reservations released.</span>
          </div>
        )}
      </div>

      {/* ── Pick & Pack Physical Execution Strip (Interactive Steps) ─── */}
      {delivery.status !== 'cancelled' && (
        <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* Pick Checkbox / Indicator */}
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                  delivery.isPicked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                )}
              >
                <PackageCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">1. Pick Items</div>
                <div className="text-[11px] text-slate-500">
                  {delivery.isPicked ? 'Warehouse bins picked' : 'Pending forklift pick'}
                </div>
              </div>
            </div>

            {/* Pack Checkbox / Indicator */}
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                  delivery.isPacked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                )}
              >
                <Box className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">2. Pack & Label</div>
                <div className="text-[11px] text-slate-500">
                  {delivery.isPacked ? 'Packed and barcoded' : 'Awaiting carton seal'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick toggle actions if order is active */}
          {delivery.status !== 'done' && (
            <div className="flex items-center gap-2">
              {!delivery.isPicked && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePickingAction('pick')}
                  className="text-xs"
                >
                  Mark as Picked
                </Button>
              )}
              {delivery.isPicked && !delivery.isPacked && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePickingAction('pack')}
                  className="text-xs"
                >
                  Mark as Packed
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Key Metadata Strip ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs">
        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Demand Qty
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {delivery.totalQuantity}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">units</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {delivery.itemCount} SKU line{delivery.itemCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Dispatch Hub
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 truncate">
            {delivery.warehouseId}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {delivery.warehouseName.split(' — ')[1] || delivery.warehouseName}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Scheduled Dispatch
          </div>
          <div className="text-base font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{delivery.scheduledDate}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Created on {delivery.createdDate}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Source Pick Staging
          </div>
          <div className="text-xs font-mono font-semibold text-brand mt-1 truncate">
            {delivery.sourceLocation}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Shipping staging zone
          </div>
        </div>
      </div>

      {/* ── Product Demand Lines Table ───────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-600" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Delivery Order Lines ({delivery.lines.length})
            </h2>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500">
            {delivery.totalQuantity} total demand
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 sm:px-5">Product SKU</th>
                <th className="px-3 py-2.5">Product Name</th>
                <th className="px-3 py-2.5">Source Rack</th>
                <th className="px-3 py-2.5 text-right">Demand Qty</th>
                <th className="px-3 py-2.5 text-right">Done Qty</th>
                <th className="px-3 py-2.5 text-center">Stock Availability</th>
                <th className="px-4 py-2.5 text-right sm:pr-5">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {delivery.lines.map((line) => {
                const isFullyDispatched = delivery.status === 'done'

                return (
                  <tr key={line.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* SKU */}
                    <td className="px-4 py-3 sm:px-5 whitespace-nowrap">
                      <Link
                        to={`/products/${line.productId}`}
                        className="font-mono text-xs font-semibold text-brand hover:underline"
                      >
                        {line.productSku}
                      </Link>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {line.productName}
                    </td>

                    {/* Source */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-600 text-[11.5px]">
                      {line.sourceLocation}
                    </td>

                    {/* Demand Qty */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                      {line.demandQuantity} <span className="font-normal font-sans text-slate-400 text-[11px]">{line.unit}</span>
                    </td>

                    {/* Done Qty */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold">
                      <span className={delivery.status === 'done' ? 'text-emerald-700' : 'text-slate-500'}>
                        {line.doneQuantity || (delivery.status === 'done' ? line.demandQuantity : 0)}
                      </span>{' '}
                      <span className="font-normal font-sans text-slate-400 text-[11px]">{line.unit}</span>
                    </td>

                    {/* Stock Availability */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {line.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" />
                          Reserved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          Shortage
                        </span>
                      )}
                    </td>

                    {/* Fulfillment */}
                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      {isFullyDispatched ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" />
                          Shipped
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          {delivery.isPacked ? 'Packed' : delivery.isPicked ? 'Picked' : 'Pending'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {delivery.notes && (
          <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Dispatch Notes: </span>
            {delivery.notes}
          </div>
        )}
      </div>

      {/* ── Activity / Timeline Log ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Delivery Order Timeline & Audit Trail
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {delivery.timeline.length} events logged
          </span>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {delivery.timeline.map((evt, idx) => (
            <div key={evt.id} className="flex items-start gap-3 relative">
              {idx < delivery.timeline.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-200 -z-10" />
              )}
              <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                ●
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{evt.title}</span>
                  <span className="font-mono text-[11px] text-slate-400">{evt.timestamp}</span>
                </div>
                <p className="text-slate-600 mt-0.5">{evt.description}</p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">By {evt.user}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
