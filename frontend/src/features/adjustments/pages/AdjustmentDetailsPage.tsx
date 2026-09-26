import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  TrendingDown,
  TrendingUp,
  Minus,
  FileCheck,
  Loader2,
  AlertCircle,
  RotateCcw,
  Package,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { useToast } from '@/context/ToastContext'
import { useAdjustment } from '../hooks/useAdjustment'
import { cn } from '@/lib/cn'

export function AdjustmentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const {
    adjustment,
    isLoading,
    error,
    isActioning,
    validate,
    process: processAdjustment,
    cancel,
    refetch,
  } = useAdjustment(id)

  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt)
    toast.info('Copied', `${label} (${txt}) copied to clipboard.`)
  }

  const handlePrintSlip = () => {
    toast.info(
      'Printing Certificate',
      `Physical Inventory Count Certificate ${adjustment?.adjustmentNumber} sent to printer.`
    )
  }

  const handleValidate = async () => {
    if (!adjustment || isActioning) return
    try {
      await validate()
      toast.success(
        'Adjustment Validated',
        `${adjustment.adjustmentNumber} validated. Marked READY for inventory reconciliation.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Validation failed.'
      toast.error('Validation Error', msg)
    }
  }

  const handleProcess = async () => {
    if (!adjustment || isActioning) return
    try {
      await processAdjustment()
      setShowConfirmModal(false)
      toast.success(
        'Adjustment Applied & Reconciled',
        `${adjustment.adjustmentNumber} reconciled. Warehouse stock balances updated.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply adjustment.'
      toast.error('Application Error', msg)
    }
  }

  const handleCancel = async () => {
    if (!adjustment || isActioning) return
    try {
      await cancel()
      toast.warning(
        'Adjustment Canceled',
        `${adjustment.adjustmentNumber} marked as canceled.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel adjustment.'
      toast.error('Cancel Error', msg)
    }
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <span className="text-sm">Loading adjustment record…</span>
      </div>
    )
  }

  // 404 / Error State
  if (error === 'not_found' || !adjustment) {
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
            to="/operations/adjustments"
            className="text-xs text-brand hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Adjustments
          </Link>
        </div>
      </div>
    )
  }

  const items = adjustment.items || []
  const primaryItem = items[0]
  const systemQuantity = primaryItem ? parseFloat(primaryItem.systemQuantity) : 0
  const countedQuantity = primaryItem ? parseFloat(primaryItem.countedQuantity) : 0
  const difference = primaryItem ? parseFloat(primaryItem.difference) : 0
  const unit = primaryItem?.product?.uom?.abbreviation || 'units'

  const isNegative = difference < 0
  const isPositive = difference > 0
  const isZero = difference === 0

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
                  adjustment.status === 'DONE'
                    ? 'done'
                    : adjustment.status === 'READY'
                    ? 'ready'
                    : adjustment.status === 'WAITING'
                    ? 'warning'
                    : adjustment.status === 'CANCELED'
                    ? 'cancelled'
                    : 'draft'
                }
                dot
              >
                {adjustment.status === 'DONE'
                  ? 'Done'
                  : adjustment.status === 'READY'
                  ? 'Ready'
                  : adjustment.status === 'CANCELED'
                  ? 'Cancelled'
                  : adjustment.status === 'WAITING'
                  ? 'Waiting'
                  : 'Draft'}
              </Badge>
              {adjustment.reason && (
                <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-medium">
                  {adjustment.reason}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {primaryItem?.product?.name || `Adjustment #${adjustment.adjustmentNumber}`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Location:{' '}
              <span className="font-mono font-medium text-slate-800">
                {adjustment.location?.name || adjustment.location?.fullPath || 'Internal Location'}
              </span>
              {primaryItem?.product?.sku && (
                <>
                  {' '}· SKU:{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {primaryItem.product.sku}
                  </span>
                </>
              )}
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

          {adjustment.status === 'DRAFT' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleValidate}
                disabled={isActioning}
              >
                {isActioning ? 'Validating…' : 'Validate Draft'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowConfirmModal(true)}
                disabled={isActioning}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Apply to Stock
              </Button>
            </>
          )}

          {adjustment.status === 'READY' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowConfirmModal(true)}
              disabled={isActioning}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {isActioning ? 'Applying…' : 'Apply to Stock'}
            </Button>
          )}

          {adjustment.status !== 'DONE' && adjustment.status !== 'CANCELED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isActioning}
              className="text-rose-600 hover:bg-rose-50"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ── DIFFERENCE CARD ───────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-brand" />
            <span>Stock Reconciliation</span>
          </h2>
          <span className="font-mono text-xs text-slate-400">Unit: {unit}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
          {/* System Theoretical Qty */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">System Quantity</span>
            <div className="mt-2 font-mono font-bold text-3xl text-slate-900">
              {systemQuantity.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">{unit}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">
              Theoretical quantity recorded in system
            </span>
          </div>

          {/* Physical Counted Qty */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">Counted Quantity</span>
            <div className="mt-2 font-mono font-bold text-3xl text-brand">
              {countedQuantity.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">{unit}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">
              Physical stock count
            </span>
          </div>

          {/* Variance (Prominently Colored) */}
          <div
            className={cn(
              'p-4 rounded-lg border flex flex-col justify-between transition-colors',
              isNegative && 'bg-rose-50/80 border-rose-200 text-rose-900',
              isPositive && 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
              isZero && 'bg-slate-50 border-slate-200 text-slate-800'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Difference</span>
              {isNegative && <TrendingDown className="w-4 h-4 text-rose-600" />}
              {isPositive && <TrendingUp className="w-4 h-4 text-emerald-600" />}
              {isZero && <Minus className="w-4 h-4 text-slate-400" />}
            </div>

            <div
              className={cn(
                'mt-2 font-mono font-bold text-3xl',
                isNegative && 'text-rose-600',
                isPositive && 'text-emerald-600',
                isZero && 'text-slate-700'
              )}
            >
              {isPositive ? '+' : ''}
              {difference.toLocaleString()}{' '}
              <span className="text-sm font-normal opacity-70">{unit}</span>
            </div>

            <span className="text-[11px] opacity-75 mt-2">
              {isNegative && 'Deficit: Physical count is lower than system'}
              {isPositive && 'Surplus: Physical count is higher than system'}
              {isZero && 'Matched: System and physical count are equal'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Line Items Table ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Products ({items.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5">Product & SKU</th>
                <th className="px-3 py-2.5 text-right font-mono">System Qty</th>
                <th className="px-3 py-2.5 text-right font-mono">Counted Qty</th>
                <th className="px-4 py-2.5 text-center font-mono">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No products in this adjustment.
                  </td>
                </tr>
              ) : (
                items.map((line) => {
                  const sys = parseFloat(line.systemQuantity) || 0
                  const counted = parseFloat(line.countedQuantity) || 0
                  const diff = parseFloat(line.difference) || 0

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {line.product?.name || line.productId}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {line.product?.sku || 'SKU'}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-slate-600">
                        {sys.toLocaleString()} {unit}
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900">
                        {counted.toLocaleString()} {unit}
                      </td>

                      <td className="px-4 py-3 text-center font-mono">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded text-xs font-bold',
                            diff < 0 && 'bg-rose-50 text-rose-700 border border-rose-200',
                            diff > 0 && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                            diff === 0 && 'bg-slate-100 text-slate-600 border border-slate-200'
                          )}
                        >
                          {diff > 0 ? '+' : ''}{diff.toLocaleString()} {unit}
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

      {/* ── Details Card ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-slate-400 block text-[11px]">Location</span>
            <span className="font-medium text-slate-800">
              {adjustment.location?.name} ({adjustment.location?.fullPath})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Date Created</span>
            <div className="flex items-center gap-1.5 font-medium text-slate-700 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDate(adjustment.createdAt)}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Validated / Reconciled</span>
            <span className="font-medium text-slate-800">
              {formatDate(adjustment.validatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ────────────────────────────────────────── */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleProcess}
        title="Apply Physical Inventory Adjustment"
        message={`This will immediately reconcile ${adjustment.adjustmentNumber}, adjusting the inventory ledger by ${difference >= 0 ? '+' : ''}${difference} ${unit} to match the physical count of ${countedQuantity} ${unit}. This action cannot be reversed.`}
        confirmLabel="Apply Adjustment"
        confirmVariant="primary"
        isLoading={isActioning}
      />
    </div>
  )
}
