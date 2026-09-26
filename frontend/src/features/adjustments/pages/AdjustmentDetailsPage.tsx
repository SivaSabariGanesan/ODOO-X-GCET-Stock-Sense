import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Warehouse,
  History,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  FileCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { getMockAdjustmentById, updateAdjustmentStatus } from '../mockAdjustments'
import { Adjustment, AdjustmentStatus } from '../types'
import { cn } from '@/lib/cn'

export function AdjustmentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [adjustment, setAdjustment] = useState<Adjustment | undefined>(
    id ? getMockAdjustmentById(id) : undefined
  )

  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  const handlePrintSlip = () => {
    toast.info(
      'Printing Slip',
      `Physical Inventory Count Certificate ${adjustment?.adjustmentNumber} sent to printer.`
    )
  }

  const handleStatusChange = (newStatus: AdjustmentStatus) => {
    if (!adjustment) return
    const updated = updateAdjustmentStatus(adjustment.id, newStatus)
    if (updated) {
      setAdjustment({ ...updated })
      setShowConfirmModal(false)
      if (newStatus === 'done') {
        toast.success(
          'Adjustment Validated',
          `${adjustment.adjustmentNumber} reconciled. Net variance of ${adjustment.difference >= 0 ? '+' : ''}${adjustment.difference} ${adjustment.unit} applied to stock.`
        )
      } else if (newStatus === 'cancelled') {
        toast.warning('Adjustment Canceled', `${adjustment.adjustmentNumber} marked as canceled.`)
      } else if (newStatus === 'draft') {
        toast.info('Adjustment Reopened', 'Record returned to draft state.')
      }
    }
  }

  if (!adjustment) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title="Adjustment Record Not Found"
        description={`The adjustment identifier #${id} does not exist.`}
        actionLabel="Back to Adjustments"
        onAction={() => navigate('/operations/adjustments')}
      />
    )
  }

  const isNegative = adjustment.difference < 0
  const isPositive = adjustment.difference > 0
  const isZero = adjustment.difference === 0

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* ── Header & Action Controls ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/operations/adjustments"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mt-0.5"
            title="Back to adjustments list"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {adjustment.adjustmentNumber}
              </span>
              <button
                type="button"
                onClick={() => copyText(adjustment.adjustmentNumber, 'Adjustment reference')}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Copy reference"
              >
                <Copy className="w-3 h-3" />
              </button>
              <Badge
                variant={
                  adjustment.status === 'done'
                    ? 'done'
                    : adjustment.status === 'cancelled'
                    ? 'cancelled'
                    : 'draft'
                }
                dot
              >
                {adjustment.status.toUpperCase()}
              </Badge>
              <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-medium">
                {adjustment.reason}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {adjustment.productName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              SKU: <span className="font-mono font-medium text-slate-800">{adjustment.productSku}</span> · Location: <span className="font-mono font-medium text-slate-800">{adjustment.location}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintSlip}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Slip
          </Button>

          {adjustment.status === 'draft' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowConfirmModal(true)}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Validate Adjustment
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

          {adjustment.status === 'cancelled' && (
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

      {/* ── VISUALLY PROMINENT DIFFERENCE CARD ───────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-brand" />
            <span>Audit Count Reconciliation Metrics</span>
          </h2>
          <span className="font-mono text-xs text-slate-400">Unit of measure: {adjustment.unit}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
          {/* System Theoretical Qty */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">System Recorded Quantity</span>
            <div className="mt-2 font-mono font-bold text-3xl text-slate-900">
              {adjustment.systemQuantity.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">{adjustment.unit}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">
              Theoretical ledger balance prior to cycle count
            </span>
          </div>

          {/* Physical Counted Qty */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-700">Physical Counted Quantity</span>
            <div className="mt-2 font-mono font-bold text-3xl text-slate-900">
              {adjustment.countedQuantity.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">{adjustment.unit}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-2">
              Audited by {adjustment.adjustedBy}
            </span>
          </div>

          {/* Difference Highlight (VISUALLY PROMINENT) */}
          <div
            className={cn(
              'p-4 rounded-lg border flex flex-col justify-between shadow-xs select-none',
              isNegative && 'bg-rose-50/90 border-rose-200 text-rose-950',
              isPositive && 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
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
                Net Difference
              </span>
              {isNegative && <TrendingDown className="w-4 h-4 text-rose-600" />}
              {isPositive && <TrendingUp className="w-4 h-4 text-emerald-600" />}
              {isZero && <Minus className="w-4 h-4 text-slate-500" />}
            </div>

            <div
              className={cn(
                'mt-2 font-mono font-black text-3xl tracking-tight',
                isNegative && 'text-rose-600',
                isPositive && 'text-emerald-600',
                isZero && 'text-slate-700'
              )}
            >
              {isPositive ? '+' : ''}
              {adjustment.difference.toLocaleString()}{' '}
              <span className="text-sm font-bold">{adjustment.unit}</span>
            </div>

            <div
              className={cn(
                'text-[11px] font-semibold mt-2',
                isNegative && 'text-rose-700',
                isPositive && 'text-emerald-700',
                isZero && 'text-slate-500'
              )}
            >
              {isNegative && 'Deficit / Shortage (Floor count is below system)'}
              {isPositive && 'Surplus / Overage (Floor count is above system)'}
              {isZero && 'Exact Physical Match (Zero Discrepancy)'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Metadata Grid ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Warehouse className="w-3.5 h-3.5 text-brand" />
          <span>Audit Specification & Facility Assignment</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Facility Node</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {adjustment.warehouseName}
            </span>
            <span className="font-mono text-slate-600 text-[11px]">
              {adjustment.warehouseId}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Audited Bin Location</span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">
              {adjustment.location}
            </span>
            <span className="text-slate-400 text-[11px]">Designated storage slot</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Adjustment Reason</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {adjustment.reason}
            </span>
            <span className="text-slate-400 text-[11px]">Standardized operational code</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Audit Record Dates</span>
            <span className="font-medium text-slate-900 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Recorded: {adjustment.createdDate}
            </span>
            {adjustment.validatedDate && (
              <span className="text-emerald-700 text-[11px] block mt-0.5">
                Validated: {adjustment.validatedDate}
              </span>
            )}
          </div>
        </div>

        {adjustment.notes && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block text-[11px]">Operator Rationale / Notes</span>
            <p className="text-slate-700 mt-0.5">{adjustment.notes}</p>
          </div>
        )}
      </div>

      {/* ── Timeline / Audit History ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-2xs">
        <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-brand" />
          <span>Audit Trail & Ledger Events</span>
        </h2>

        <div className="space-y-4">
          {adjustment.timeline.map((event, idx) => (
            <div key={event.id} className="flex items-start gap-3 relative">
              {idx < adjustment.timeline.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-200" />
              )}
              <div className="w-5 h-5 rounded-full bg-[#ede9fe] text-brand-dark flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
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

      {/* ── Confirmation Modal Before Validation ────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-[fadeIn_100ms_ease-out]">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Confirm Inventory Adjustment Validation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to officially update theoretical stock with the physical count.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Adjustment Ref:</span>
                <span className="font-mono font-bold text-slate-900">{adjustment.adjustmentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-medium text-slate-900 text-right truncate max-w-[220px]">{adjustment.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-mono text-slate-800">{adjustment.location}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-700">Net Stock Adjustment:</span>
                <span
                  className={cn(
                    'font-mono font-bold text-sm px-2 py-0.5 rounded border',
                    isNegative && 'bg-rose-50 text-rose-700 border-rose-200',
                    isPositive && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    isZero && 'bg-slate-100 text-slate-700 border-slate-200'
                  )}
                >
                  {isPositive ? '+' : ''}{adjustment.difference} {adjustment.unit}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Reason: <strong className="text-slate-800">{adjustment.reason}</strong>. This validation will be immutably signed and recorded in the audit trail.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('done')}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Confirm & Validate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
