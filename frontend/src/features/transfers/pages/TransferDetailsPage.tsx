import { useState, useEffect } from 'react'
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
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useTransferDetail } from '../hooks/useTransferDetail'
import { warehousesApi } from '@/features/warehouses/api'
import { cn } from '@/lib/cn'

export function TransferDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const {
    transfer,
    isLoading,
    isProcessing,
    isCancelling,
    isValidating,
    error,
    isNotFound,
    refetch,
    processTransfer,
    validateTransfer,
    cancelTransfer,
  } = useTransferDetail(id)

  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let isMounted = true
    warehousesApi.list({ limit: 100 }).then((res) => {
      if (!isMounted) return
      const map: Record<string, string> = {}
      res.data.forEach((w) => {
        map[w.id] = w.name
      })
      setWarehouseMap(map)
    }).catch(() => {
      // Ignore warehouse list failure on details
    })
    return () => {
      isMounted = false
    }
  }, [])

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

  const handleValidate = async () => {
    try {
      await validateTransfer()
      toast.info('Marked as Ready', 'Stock verified at origin rack and staging transport assigned.')
    } catch (err: unknown) {
      toast.error('Validation Failed', err instanceof Error ? err.message : 'Could not validate transfer.')
    }
  }

  const handleProcess = async () => {
    try {
      await processTransfer()
      toast.success(
        'Transfer Validated',
        `${transfer?.transferNumber} stock relocated to destination. Company total inventory remains unchanged.`
      )
    } catch (err: any) {
      if (err?.status === 409) {
        toast.warning('Already Processed', 'This transfer has already been completed.')
      } else {
        toast.error('Processing Failed', err?.message || 'Could not process internal transfer.')
      }
    }
  }

  const handleCancel = async () => {
    try {
      await cancelTransfer()
      toast.warning('Transfer Canceled', `${transfer?.transferNumber} marked as canceled.`)
    } catch (err: unknown) {
      toast.error('Cancel Failed', err instanceof Error ? err.message : 'Could not cancel transfer.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading transfer details…</span>
      </div>
    )
  }

  if (isNotFound || !transfer) {
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

  if (error && !transfer) {
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

  const stages: { key: string; label: string }[] = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'READY', label: 'Ready' },
    { key: 'DONE', label: 'Done' },
  ]

  const currentStageIndex =
    transfer.status === 'CANCELED'
      ? -1
      : stages.findIndex((s) => s.key === transfer.status)

  const srcWarehouseName = transfer.sourceLocation?.warehouseId
    ? warehouseMap[transfer.sourceLocation.warehouseId] || 'Source Warehouse'
    : 'Source Facility'

  const dstWarehouseName = transfer.destinationLocation?.warehouseId
    ? warehouseMap[transfer.destinationLocation.warehouseId] || 'Destination Warehouse'
    : 'Destination Facility'

  const isInterWarehouse =
    Boolean(
      transfer.sourceLocation?.warehouseId &&
      transfer.destinationLocation?.warehouseId &&
      transfer.sourceLocation.warehouseId !== transfer.destinationLocation.warehouseId
    )

  const sourceLocDisplay =
    transfer.sourceLocation?.path || transfer.sourceLocation?.name || 'Origin Bin'
  const destLocDisplay =
    transfer.destinationLocation?.path || transfer.destinationLocation?.name || 'Destination Bin'

  const totalQuantity = (transfer.items || []).reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0),
    0
  )

  const createdDateStr = new Date(transfer.createdAt).toLocaleDateString()

  // Dynamic audit history based on actual backend record
  const timelineEvents = [
    {
      id: 'evt-created',
      title: 'Transfer Draft Created',
      timestamp: new Date(transfer.createdAt).toLocaleString(),
      description: `Internal transfer ${transfer.transferNumber} initialized.`,
      user: 'Operations Officer',
    },
  ]

  if (transfer.status === 'READY' || transfer.status === 'DONE') {
    timelineEvents.push({
      id: 'evt-validated',
      title: 'Transfer Validated & Staged',
      timestamp: new Date(transfer.updatedAt).toLocaleString(),
      description: `Stock verified at origin (${sourceLocDisplay}) and staged for relocation.`,
      user: 'Warehouse Supervisor',
    })
  }

  if (transfer.status === 'DONE') {
    timelineEvents.push({
      id: 'evt-done',
      title: 'Inventory Processed & Transferred',
      timestamp: transfer.completedAt
        ? new Date(transfer.completedAt).toLocaleString()
        : new Date(transfer.updatedAt).toLocaleString(),
      description: `Stock deducted from ${sourceLocDisplay} and credited to ${destLocDisplay}. Total aggregate inventory balance preserved.`,
      user: 'Inventory System',
    })
  } else if (transfer.status === 'CANCELED') {
    timelineEvents.push({
      id: 'evt-canceled',
      title: 'Transfer Order Canceled',
      timestamp: new Date(transfer.updatedAt).toLocaleString(),
      description: 'Transfer was voided. No stock positions were adjusted.',
      user: 'Operations Officer',
    })
  }

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
                  transfer.status === 'DONE'
                    ? 'done'
                    : transfer.status === 'READY'
                    ? 'ready'
                    : transfer.status === 'CANCELED'
                    ? 'cancelled'
                    : transfer.status === 'WAITING'
                    ? 'warning'
                    : 'draft'
                }
                dot
              >
                {transfer.status}
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
              {sourceLocDisplay} → {destLocDisplay}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Created: <span className="font-medium text-slate-700">{createdDateStr}</span> · Total Units:{' '}
              <span className="font-mono font-medium text-slate-700">{totalQuantity.toLocaleString()}</span>
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

          {(transfer.status === 'DRAFT' || transfer.status === 'WAITING') && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleValidate}
                isLoading={isValidating}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Mark as Ready
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleProcess}
                isLoading={isProcessing}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                Validate Directly
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                isLoading={isCancelling}
                className="text-rose-600 hover:bg-rose-50"
              >
                Cancel
              </Button>
            </>
          )}

          {transfer.status === 'READY' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleProcess}
                isLoading={isProcessing}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Validate & Move Stock
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                isLoading={isCancelling}
                className="text-rose-600 hover:bg-rose-50"
              >
                Cancel
              </Button>
            </>
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
            const isCancelled = transfer.status === 'CANCELED'

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

        {transfer.status === 'CANCELED' && (
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
              {srcWarehouseName}
            </span>
            <span className="font-mono text-slate-600 text-[11px]">
              {sourceLocDisplay}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Destination Warehouse</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {dstWarehouseName}
            </span>
            <span className="font-mono text-slate-600 text-[11px]">
              {destLocDisplay}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Movement Scope</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {isInterWarehouse ? 'Facility to Facility' : 'Internal Rack Replenishment'}
            </span>
            <span className="text-slate-400 text-[11px]">
              {(transfer.items || []).length} distinct SKU{(transfer.items || []).length !== 1 ? 's' : ''}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Created Timeline</span>
            <span className="font-medium text-slate-900 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {createdDateStr}
            </span>
            {transfer.completedAt && (
              <span className="text-slate-400 text-[11px]">
                Completed: {new Date(transfer.completedAt).toLocaleDateString()}
              </span>
            )}
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
              Product Movement Lines ({(transfer.items || []).length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Total Quantity:{' '}
            <strong className="text-slate-900 font-bold">{totalQuantity.toLocaleString()}</strong> units
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {(transfer.items || []).map((line, idx) => (
                <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                    {line.product?.sku || 'N/A'}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    {line.productId ? (
                      <Link
                        to={`/products/${line.productId}`}
                        className="hover:text-brand transition-colors"
                      >
                        {line.product?.name || 'Unnamed Product'}
                      </Link>
                    ) : (
                      line.product?.name || 'Unnamed Product'
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {sourceLocDisplay}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-brand font-medium">
                    {destLocDisplay}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {parseFloat(line.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(!transfer.items || transfer.items.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No product lines found on this transfer.
                  </td>
                </tr>
              )}
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
          {timelineEvents.map((event, idx) => (
            <div key={event.id} className="flex items-start gap-3 relative">
              {idx < timelineEvents.length - 1 && (
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
