import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Printer,
  XCircle,
  Copy,
  History,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useReceipt } from '../hooks/useReceipt'
import { ApiReceipt } from '../api'
import { cn } from '@/lib/cn'

/** Normalise API status for display labels */
function statusLabel(status: ApiReceipt['status']): string {
  const map: Record<ApiReceipt['status'], string> = {
    DRAFT: 'Draft',
    WAITING: 'Waiting',
    READY: 'Ready',
    DONE: 'Done',
    CANCELED: 'Canceled',
  }
  return map[status] ?? status
}

const STAGES: { key: ApiReceipt['status']; label: string }[] = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'READY', label: 'Ready' },
  { key: 'DONE', label: 'Done' },
]

export function ReceiptDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { receipt, isLoading, error, isActioning, validate, process, cancel, refetch } =
    useReceipt(id)

  // ── Utility ────────────────────────────────────────────────────────────────
  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  const handlePrintSlip = () => {
    toast.info('Printing Slip', `Goods Receipt Note ${receipt?.receiptNumber} sent to printer.`)
  }

  // ── Status Action Wrappers ─────────────────────────────────────────────────
  const handleValidate = async () => {
    try {
      await validate()
      toast.info('Marked as Ready', 'Inbound staging and dock assignment confirmed.')
    } catch (err: unknown) {
      toast.error('Validation Failed', err instanceof Error ? err.message : 'Could not validate receipt.')
    }
  }

  const handleProcess = async () => {
    try {
      await process()
      toast.success('Receipt Received', `${receipt?.receiptNumber} — inventory booked to warehouse stock.`)
    } catch (err: unknown) {
      toast.error('Processing Failed', err instanceof Error ? err.message : 'Could not process receipt.')
    }
  }

  const handleCancel = async () => {
    try {
      await cancel()
      toast.warning('Receipt Canceled', `${receipt?.receiptNumber} marked as canceled.`)
    } catch (err: unknown) {
      toast.error('Cancel Failed', err instanceof Error ? err.message : 'Could not cancel receipt.')
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading receipt…</span>
      </div>
    )
  }

  // ── Error / Not Found ───────────────────────────────────────────────────────
  if (error === 'not_found' || !receipt) {
    return (
      <EmptyState
        icon={ArrowDownToLine}
        title="Receipt Not Found"
        description={`The receipt identifier "${id}" does not exist or has been removed.`}
        actionLabel="Back to Receipts"
        onAction={() => navigate('/operations/receipts')}
      />
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm">{error}</p>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={refetch}>
          Retry
        </Button>
      </div>
    )
  }

  // ── Derived State ──────────────────────────────────────────────────────────
  const currentStageIndex =
    receipt.status === 'CANCELED'
      ? -1
      : STAGES.findIndex((s) => s.key === receipt.status)

  const totalQty = receipt.items.reduce((sum, item) => sum + parseFloat(item.quantity), 0)
  const createdDate = new Date(receipt.createdAt).toLocaleDateString()

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
                  receipt.status === 'DONE'
                    ? 'done'
                    : receipt.status === 'READY'
                    ? 'ready'
                    : receipt.status === 'CANCELED'
                    ? 'cancelled'
                    : receipt.status === 'WAITING'
                    ? 'warning'
                    : 'draft'
                }
                dot
              >
                {statusLabel(receipt.status)}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {receipt.supplierName || 'Unknown Supplier'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              PO Ref:{' '}
              <span className="font-mono font-medium text-slate-700">
                {receipt.supplierReference || 'None'}
              </span>
              {receipt.defaultLocation && (
                <>
                  {' '}· Destination:{' '}
                  <span className="font-medium text-slate-700">
                    {receipt.defaultLocation.fullPath}
                  </span>
                </>
              )}
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

          {(receipt.status === 'DRAFT' || receipt.status === 'WAITING') && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={isActioning}
              onClick={handleValidate}
            >
              Mark as Ready
            </Button>
          )}

          {receipt.status === 'READY' && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isActioning}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={handleProcess}
            >
              Validate & Receive
            </Button>
          )}

          {receipt.status !== 'DONE' && receipt.status !== 'CANCELED' && (
            <Button
              variant="danger"
              size="sm"
              isLoading={isActioning}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ── Visual Stage Progress Tracker ────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-6 sm:py-3.5 shadow-2xs">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {STAGES.map((stg, idx) => {
            const isCompleted = currentStageIndex > idx || receipt.status === 'DONE'
            const isCurrent = currentStageIndex === idx && receipt.status !== 'DONE'

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

                {idx < STAGES.length - 1 && (
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

        {receipt.status === 'CANCELED' && (
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
            {totalQty.toFixed(0)}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">units</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {receipt.items.length} SKU line{receipt.items.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Target Warehouse
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 truncate">
            {receipt.warehouse?.shortCode ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {receipt.warehouse?.name ?? receipt.warehouseId.slice(0, 12)}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Validated At
          </div>
          <div className="text-base font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {receipt.validatedAt
                ? new Date(receipt.validatedAt).toLocaleDateString()
                : 'Not yet'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Created on {createdDate}</div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Intake Bay Location
          </div>
          <div className="text-xs font-mono font-semibold text-brand mt-1 truncate">
            {receipt.defaultLocation?.fullPath ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Primary storage bay</div>
        </div>
      </div>

      {/* ── Product Lines Table ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Product Lines ({receipt.items.length})
            </h2>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500">
            {totalQty.toFixed(0)} total units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 sm:px-5">Product SKU</th>
                <th className="px-3 py-2.5">Product Name</th>
                <th className="px-3 py-2.5">Destination</th>
                <th className="px-3 py-2.5 text-right">Expected Qty</th>
                <th className="px-4 py-2.5 text-right sm:pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No product lines.
                  </td>
                </tr>
              ) : (
                receipt.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* SKU */}
                    <td className="px-4 py-3 sm:px-5 whitespace-nowrap">
                      <Link
                        to={`/products/${item.productId}`}
                        className="font-mono text-xs font-semibold text-brand hover:underline"
                      >
                        {item.product?.sku ?? item.productId.slice(0, 8)}
                      </Link>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {item.product?.name ?? '—'}
                    </td>

                    {/* Destination */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-600 text-[11.5px]">
                      {item.destinationLocation?.fullPath ?? '—'}
                    </td>

                    {/* Qty */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                      {parseFloat(item.quantity).toFixed(0)}
                    </td>

                    {/* Fulfillment */}
                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      {receipt.status === 'DONE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" />
                          Received
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {receipt.notes && (
          <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Notes: </span>
            {receipt.notes}
          </div>
        )}
      </div>

      {/* ── Audit Info ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Audit Information
            </h2>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Created By</div>
            <div className="mt-1 text-slate-700 font-medium">{receipt.creator?.name ?? 'System'}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Created At</div>
            <div className="mt-1 font-mono text-slate-700">{new Date(receipt.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Last Updated</div>
            <div className="mt-1 font-mono text-slate-700">{new Date(receipt.updatedAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Validated At</div>
            <div className="mt-1 font-mono text-slate-700">
              {receipt.validatedAt ? new Date(receipt.validatedAt).toLocaleString() : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
