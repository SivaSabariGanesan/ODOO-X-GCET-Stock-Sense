import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Printer,
  XCircle,
  Copy,
  ChevronRight,
  Warehouse,
  History,
  AlertCircle,
  Check,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { getMockReceiptById, updateReceiptStatus } from '../mockReceipts'
import { Receipt, ReceiptStatus } from '../types'
import { cn } from '@/lib/cn'

export function ReceiptDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()

  const [receipt, setReceipt] = useState<Receipt | undefined>(
    id ? getMockReceiptById(id) : undefined
  )

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  const handlePrintSlip = () => {
    toast.info('Printing Slip', `Goods Receipt Note ${receipt?.receiptNumber} sent to printer.`)
  }

  const handleStatusChange = (newStatus: ReceiptStatus) => {
    if (!receipt) return
    const updated = updateReceiptStatus(receipt.id, newStatus)
    if (updated) {
      setReceipt({ ...updated })
      if (newStatus === 'done') {
        toast.success('Receipt Validated', `${receipt.receiptNumber} inventory booked to warehouse stock.`)
      } else if (newStatus === 'ready') {
        toast.info('Marked as Ready', 'Inbound staging and dock assignment confirmed.')
      } else if (newStatus === 'cancelled') {
        toast.warning('Receipt Canceled', `${receipt.receiptNumber} marked as canceled.`)
      }
    }
  }

  if (!receipt) {
    return (
      <EmptyState
        icon={ArrowDownToLine}
        title="Receipt Not Found"
        description={`The receipt identifier #${id} does not exist.`}
        actionLabel="Back to Receipts"
        onAction={() => navigate('/operations/receipts')}
      />
    )
  }

  const stages: { key: ReceiptStatus; label: string }[] = [
    { key: 'draft', label: 'Draft' },
    { key: 'ready', label: 'Ready' },
    { key: 'done', label: 'Done' },
  ]

  const currentStageIndex =
    receipt.status === 'cancelled'
      ? -1
      : stages.findIndex((s) => s.key === receipt.status)

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* ── Header & Action Controls ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/operations/receipts"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mt-0.5"
            title="Back to receipts"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {receipt.receiptNumber}
              </span>
              <button
                type="button"
                onClick={() => copyText(receipt.receiptNumber, 'Receipt number')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Copy reference"
              >
                <Copy className="w-3 h-3" />
              </button>
              <Badge
                variant={
                  receipt.status === 'done'
                    ? 'done'
                    : receipt.status === 'ready'
                    ? 'ready'
                    : receipt.status === 'cancelled'
                    ? 'cancelled'
                    : 'draft'
                }
                dot
              >
                {receipt.status.toUpperCase()}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {receipt.supplier}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              PO Ref: <span className="font-mono font-medium text-slate-700">{receipt.supplierReference || 'None'}</span> · Destination: <span className="font-medium text-slate-700">{receipt.destinationLocation}</span>
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

          {receipt.status === 'draft' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange('ready')}
            >
              Mark as Ready
            </Button>
          )}

          {receipt.status === 'ready' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => handleStatusChange('done')}
            >
              Validate & Receive
            </Button>
          )}

          {receipt.status !== 'done' && receipt.status !== 'cancelled' && (
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
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {stages.map((stg, idx) => {
            const isCompleted = currentStageIndex > idx || receipt.status === 'done'
            const isCurrent = currentStageIndex === idx && receipt.status !== 'done'

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

        {receipt.status === 'cancelled' && (
          <div className="mt-2 text-center text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span>This receipt has been canceled. No stock balance changes applied.</span>
          </div>
        )}
      </div>

      {/* ── Key Metadata Strip ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs">
        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Expected Qty
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {receipt.totalQuantity}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">units</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {receipt.itemCount} SKU line{receipt.itemCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Target Warehouse
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 truncate">
            {receipt.warehouseId}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {receipt.warehouseName.split(' — ')[1] || receipt.warehouseName}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Scheduled Date
          </div>
          <div className="text-base font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{receipt.scheduledDate}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Created on {receipt.createdDate}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Intake Bay Location
          </div>
          <div className="text-xs font-mono font-semibold text-brand mt-1 truncate">
            {receipt.destinationLocation}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Primary storage bay
          </div>
        </div>
      </div>

      {/* ── Product Lines Table ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Receipt Product Lines ({receipt.lines.length})
            </h2>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500">
            {receipt.totalQuantity} total units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 sm:px-5">Product SKU</th>
                <th className="px-3 py-2.5">Product Name</th>
                <th className="px-3 py-2.5">Destination Bay</th>
                <th className="px-3 py-2.5 text-right">Expected Qty</th>
                <th className="px-3 py-2.5 text-right">Received Qty</th>
                <th className="px-4 py-2.5 text-right sm:pr-5">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.lines.map((line) => {
                const isFullyReceived = line.receivedQuantity === line.quantity

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

                    {/* Destination */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-600 text-[11.5px]">
                      {line.destinationLocation}
                    </td>

                    {/* Expected Qty */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                      {line.quantity} <span className="font-normal font-sans text-slate-400 text-[11px]">{line.unit}</span>
                    </td>

                    {/* Received Qty */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold">
                      <span className={receipt.status === 'done' ? 'text-emerald-700' : 'text-slate-500'}>
                        {line.receivedQuantity || 0}
                      </span>{' '}
                      <span className="font-normal font-sans text-slate-400 text-[11px]">{line.unit}</span>
                    </td>

                    {/* Fulfillment */}
                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      {receipt.status === 'done' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" />
                          100%
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {receipt.notes && (
          <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Receiving Instructions: </span>
            {receipt.notes}
          </div>
        )}
      </div>

      {/* ── Activity / Timeline Log ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Receipt Activity & Audit Trail
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {receipt.timeline.length} events logged
          </span>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {receipt.timeline.map((evt, idx) => (
            <div key={evt.id} className="flex items-start gap-3 relative">
              {idx < receipt.timeline.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-200 -z-10" />
              )}
              <div className="w-5 h-5 rounded-full bg-brand-light text-brand-dark flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
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
