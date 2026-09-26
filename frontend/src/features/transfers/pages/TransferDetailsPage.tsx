import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Printer,
  XCircle,
  Copy,
  Warehouse,
  History,
  Info,
  Check,
  Layers,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { getMockTransferById, updateTransferStatus } from '../mockTransfers'
import { Transfer, TransferStatus } from '../types'
import { cn } from '@/lib/cn'

export function TransferDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [transfer, setTransfer] = useState<Transfer | undefined>(
    id ? getMockTransferById(id) : undefined
  )

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  const handlePrintSlip = () => {
    toast.info(
      'Printing Slip',
      `Internal Transfer Note ${transfer?.transferNumber} sent to printer.`
    )
  }

  const handleStatusChange = (newStatus: TransferStatus) => {
    if (!transfer) return
    const updated = updateTransferStatus(transfer.id, newStatus)
    if (updated) {
      setTransfer({ ...updated })
      if (newStatus === 'done') {
        toast.success(
          'Transfer Validated',
          `${transfer.transferNumber} stock relocated to destination. Company total inventory remains unchanged.`
        )
      } else if (newStatus === 'ready') {
        toast.info('Marked as Ready', 'Stock verified at origin rack and staging transport assigned.')
      } else if (newStatus === 'draft') {
        toast.info('Reverted to Draft', 'Movement order reopened for editing.')
      } else if (newStatus === 'cancelled') {
        toast.warning('Transfer Canceled', `${transfer.transferNumber} marked as canceled.`)
      }
    }
  }

  if (!transfer) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="Transfer Not Found"
        description={`The transfer movement identifier #${id} does not exist.`}
        actionLabel="Back to Transfers"
        onAction={() => navigate('/operations/transfers')}
      />
    )
  }

  const stages: { key: TransferStatus; label: string }[] = [
    { key: 'draft', label: 'Draft' },
    { key: 'ready', label: 'Ready' },
    { key: 'done', label: 'Done' },
  ]

  const currentStageIndex =
    transfer.status === 'cancelled'
      ? -1
      : stages.findIndex((s) => s.key === transfer.status)

  const isInterWarehouse = transfer.sourceWarehouseId !== transfer.destinationWarehouseId

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* ── Header & Action Controls ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/operations/transfers"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mt-0.5"
            title="Back to transfers list"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {transfer.transferNumber}
              </span>
              <button
                type="button"
                onClick={() => copyText(transfer.transferNumber, 'Transfer reference')}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Copy reference"
              >
                <Copy className="w-3 h-3" />
              </button>
              <Badge
                variant={
                  transfer.status === 'done'
                    ? 'done'
                    : transfer.status === 'ready'
                    ? 'ready'
                    : transfer.status === 'cancelled'
                    ? 'cancelled'
                    : 'draft'
                }
                dot
              >
                {transfer.status.toUpperCase()}
              </Badge>
              {isInterWarehouse ? (
                <span className="text-[10.5px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-medium">
                  Inter-Warehouse Transit
                </span>
              ) : (
                <span className="text-[10.5px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-medium">
                  Internal Rack Move
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {transfer.sourceLocation} → {transfer.destinationLocation}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled: <span className="font-medium text-slate-700">{transfer.scheduledDate}</span> · Total Units: <span className="font-mono font-medium text-slate-700">{transfer.totalQuantity.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintSlip}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Slip
          </Button>

          {transfer.status === 'draft' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('ready')}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Mark as Ready
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange('done')}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                Validate Directly
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange('cancelled')}
                className="text-rose-600 hover:bg-rose-50"
              >
                Cancel
              </Button>
            </>
          )}

          {transfer.status === 'ready' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('done')}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Validate & Move Stock
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange('draft')}
              >
                Back to Draft
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange('cancelled')}
                className="text-rose-600 hover:bg-rose-50"
              >
                Cancel
              </Button>
            </>
          )}

          {transfer.status === 'cancelled' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange('draft')}
            >
              Reopen Draft
            </Button>
          )}
        </div>
      </div>

      {/* ── Prominent Inventory Rule Notice ──────────────────────────── */}
      <div className="bg-[#ede9fe]/40 border border-[#71639e]/20 rounded-lg p-3 sm:px-4 sm:py-3 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-brand-dark font-semibold">Stock Reallocation Semantics: </strong>
          Internal transfers change location, not total inventory. On validation, recorded quantities move between bins without modifying aggregate company balance.
        </div>
      </div>

      {/* ── Stage Progression Tracker ───────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {stages.map((stg, idx) => {
            const isCompleted = currentStageIndex > idx
            const isCurrent = currentStageIndex === idx
            const isCancelled = transfer.status === 'cancelled'

            return (
              <div key={stg.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-brand text-white ring-4 ring-brand/20'
                        : isCancelled
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    )}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium mt-1',
                      isCurrent
                        ? 'text-brand-dark font-bold'
                        : isCompleted
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    )}
                  >
                    {stg.label}
                  </span>
                </div>

                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 mx-3 -mt-4 transition-colors',
                      currentStageIndex > idx ? 'bg-emerald-500' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {transfer.status === 'cancelled' && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-rose-600 font-medium">
            <XCircle className="w-3.5 h-3.5" />
            <span>This transfer order has been canceled and voided.</span>
          </div>
        )}
      </div>

      {/* ── Metadata Grid ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-2xs">
        <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Warehouse className="w-3.5 h-3.5 text-brand" />
          <span>Routing & Scheduling Overview</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Source Warehouse</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {transfer.sourceWarehouseName}
            </span>
            <span className="font-mono text-slate-600 text-[11px]">
              {transfer.sourceLocation}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Destination Warehouse</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {transfer.destinationWarehouseName}
            </span>
            <span className="font-mono text-slate-600 text-[11px]">
              {transfer.destinationLocation}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Movement Scope</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {isInterWarehouse ? 'Facility to Facility' : 'Internal Rack Replenishment'}
            </span>
            <span className="text-slate-400 text-[11px]">
              {transfer.itemCount} distinct SKU{transfer.itemCount > 1 ? 's' : ''}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Scheduled Timeline</span>
            <span className="font-medium text-slate-900 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {transfer.scheduledDate}
            </span>
            <span className="text-slate-400 text-[11px]">
              Created: {transfer.createdDate}
            </span>
          </div>
        </div>

        {transfer.notes && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block text-[11px]">Operator Instructions / Notes</span>
            <p className="text-slate-700 mt-0.5">{transfer.notes}</p>
          </div>
        )}
      </div>

      {/* ── Product Lines Table ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Product Movement Lines ({transfer.lines.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Total Quantity:{' '}
            <strong className="text-slate-900 font-bold">{transfer.totalQuantity.toLocaleString()}</strong> units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold select-none">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Product SKU</th>
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Source Location</th>
                <th className="py-2.5 px-4">Destination Location</th>
                <th className="py-2.5 px-4 text-right">Transfer Qty</th>
                <th className="py-2.5 px-4 w-20">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {transfer.lines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                    {line.productSku}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    <Link
                      to={`/products/${line.productId}`}
                      className="hover:text-brand transition-colors"
                    >
                      {line.productName}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {line.sourceLocation}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-brand font-medium">
                    {line.destinationLocation}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {line.quantity.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono">
                    {line.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Activity / Timeline Ledger ──────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-2xs">
        <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-brand" />
          <span>Operational Movement History & Audit Log</span>
        </h2>

        <div className="space-y-4">
          {transfer.timeline.map((event, idx) => (
            <div key={event.id} className="flex items-start gap-3 relative">
              {idx < transfer.timeline.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-200" />
              )}
              <div className="w-5 h-5 rounded-full bg-[#ede9fe] text-brand-dark flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-900">
                    {event.title}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {event.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{event.description}</p>
                <span className="text-[10px] text-slate-400 font-mono">
                  Recorded by: {event.user}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
