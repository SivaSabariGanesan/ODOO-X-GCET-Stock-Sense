import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PendingOperation } from '../types'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/cn'

interface PendingOperationsSectionProps {
  operations: PendingOperation[]
  onValidateOperation?: (id: string) => void
}

export function PendingOperationsSection({
  operations,
  onValidateOperation,
}: PendingOperationsSectionProps) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'all' | 'receipt' | 'delivery' | 'transfer'>('all')

  const filtered = operations.filter((op) => {
    if (activeTab === 'all') return true
    return op.type === activeTab
  })

  const typeConfig = {
    receipt: { label: 'Receipt', icon: ArrowDownToLine, color: 'text-brand' },
    delivery: { label: 'Delivery', icon: ArrowUpFromLine, color: 'text-sky-600' },
    transfer: { label: 'Transfer', icon: ArrowLeftRight, color: 'text-emerald-600' },
    adjustment: { label: 'Adjustment', icon: SlidersHorizontal, color: 'text-amber-600' },
  }

  const handleQuickValidate = (op: PendingOperation) => {
    onValidateOperation?.(op.id)
    toast.success('Operation Processed', `${op.reference} moved to validation queue.`)
  }

  return (
    <section className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
      {/* Section Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-brand" />
          <h2 className="text-sm font-semibold text-slate-900 font-heading">
            Pending Operations Queue
          </h2>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {operations.length} active
          </span>
        </div>

        {/* Operational Filter Tabs */}
        <div className="flex items-center gap-1 border border-slate-200/80 rounded-md p-0.5 bg-slate-50/60 text-xs self-start sm:self-auto">
          {(['all', 'receipt', 'delivery', 'transfer'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors cursor-pointer capitalize text-[11.5px]',
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {tab === 'all' ? 'All Operations' : `${tab}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700">No pending operations matching current criteria</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All warehouse dispatch and intake queues are clear.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 sm:px-5">Reference</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Route / Partner</th>
                <th className="px-3 py-2.5 text-center">Items & Units</th>
                <th className="px-3 py-2.5">Scheduled</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right sm:pr-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((op) => {
                const config = typeConfig[op.type]
                const Icon = config.icon

                return (
                  <tr
                    key={op.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Reference */}
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/operations/${op.type === 'adjustment' ? 'adjustments' : op.type === 'receipt' ? 'receipts' : op.type === 'delivery' ? 'deliveries' : 'transfers'}`}
                          className="font-mono text-xs font-semibold text-brand hover:underline"
                        >
                          {op.reference}
                        </Link>
                        {op.priority === 'urgent' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {op.warehouseName.split(' — ')[0]}
                      </div>
                    </td>

                    {/* Operation Type */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Icon className={cn('w-3.5 h-3.5 shrink-0', config.color)} />
                        <span>{config.label}</span>
                      </div>
                    </td>

                    {/* Route & Partner */}
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800 truncate max-w-[240px]">
                        {op.partner || op.destination}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {op.source} → {op.destination}
                      </div>
                    </td>

                    {/* Items & Units */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-800">
                        {op.totalUnits} <span className="text-slate-400 font-sans text-[11px]">units</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {op.itemCount} SKU lines
                      </div>
                    </td>

                    {/* Scheduled */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1 text-[11.5px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{op.scheduledDate}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge
                        variant={
                          op.status === 'ready'
                            ? 'ready'
                            : op.status === 'waiting'
                            ? 'warning'
                            : op.status === 'done'
                            ? 'done'
                            : 'draft'
                        }
                        dot
                      >
                        {op.status === 'waiting' ? 'Waiting Stock' : op.status.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      {op.status === 'ready' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleQuickValidate(op)}
                          className="text-[11px] py-1 px-2.5 h-auto"
                        >
                          Validate
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickValidate(op)}
                          className="text-[11px] py-1 px-2.5 h-auto text-slate-600"
                        >
                          Check
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer link to full operations view */}
      <div className="px-4 py-2.5 sm:px-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {filtered.length} queued operations across warehouses</span>
        <Link
          to="/operations/receipts"
          className="inline-flex items-center gap-1 text-brand hover:underline font-medium"
        >
          <span>View all warehouse operations</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  )
}
