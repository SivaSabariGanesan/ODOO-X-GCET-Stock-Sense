import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Clock,
  User,
  Copy,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { RecentActivityItem } from '../types'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/cn'

interface RecentActivitySectionProps {
  activities: RecentActivityItem[]
}

export function RecentActivitySection({ activities }: RecentActivitySectionProps) {
  const toast = useToast()

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
    toast.info('Copied', `${ref} copied to clipboard`)
  }

  const typeConfig = {
    receipt: { label: 'Receipt', icon: ArrowDownToLine, color: 'text-brand' },
    delivery: { label: 'Delivery', icon: ArrowUpFromLine, color: 'text-sky-600' },
    transfer: { label: 'Transfer', icon: ArrowLeftRight, color: 'text-emerald-600' },
    adjustment: { label: 'Adjustment', icon: SlidersHorizontal, color: 'text-amber-600' },
  }

  return (
    <section className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 font-heading">
            Recent Inventory Activity
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Live operational ledger
          </span>
        </div>

        <Link
          to="/operations/history"
          className="text-xs text-brand hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>Full Move History</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Content */}
      {activities.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700">No activity matching current filters</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Try widening the search query or selecting "All Warehouses".</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 sm:px-5">Timestamp</th>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-3 py-2.5">Operation</th>
                <th className="px-3 py-2.5">Warehouse</th>
                <th className="px-3 py-2.5">Quantity / Units</th>
                <th className="px-3 py-2.5">Operator</th>
                <th className="px-4 py-2.5 text-right sm:pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.map((item) => {
                const config = typeConfig[item.type]
                const Icon = config.icon

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Timestamp */}
                    <td className="px-4 py-3 sm:px-5 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.timestamp}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        {item.relativeTime}
                      </div>
                    </td>

                    {/* Reference */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/operations/${item.type === 'adjustment' ? 'adjustments' : item.type === 'receipt' ? 'receipts' : item.type === 'delivery' ? 'deliveries' : 'transfers'}`}
                          className="font-mono text-xs font-semibold text-brand hover:underline"
                        >
                          {item.reference}
                        </Link>
                        <button
                          type="button"
                          onClick={() => copyRef(item.reference)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copy reference"
                          aria-label={`Copy ${item.reference}`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        {item.category}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-3 max-w-[280px]">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Icon className={cn('w-3.5 h-3.5 shrink-0', config.color)} />
                        <span className="truncate">{item.description}</span>
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      <span className="font-medium text-slate-700">{item.warehouseId}</span>
                      <span className="text-[10.5px] text-slate-400 block truncate max-w-[130px]">
                        {item.warehouseName.split(' — ')[1] || item.warehouseName}
                      </span>
                    </td>

                    {/* Units Moved */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-800">
                      <span className="font-semibold">{item.units}</span>{' '}
                      <span className="text-slate-400 font-sans text-[11px]">{item.unitLabel}</span>
                    </td>

                    {/* Operator */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1 text-[11.5px]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{item.user}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      <Badge
                        variant={
                          item.status === 'done'
                            ? 'done'
                            : item.status === 'ready'
                            ? 'ready'
                            : item.status === 'confirmed'
                            ? 'confirmed'
                            : 'neutral'
                        }
                        dot
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 sm:px-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Recorded ledger entries are immutable once validated</span>
        <span className="font-mono">Showing latest {activities.length} movements</span>
      </div>
    </section>
  )
}
