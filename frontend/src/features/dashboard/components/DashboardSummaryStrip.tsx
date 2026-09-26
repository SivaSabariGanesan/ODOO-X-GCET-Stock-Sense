import { Package, AlertTriangle, AlertOctagon, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface DashboardSummaryStripProps {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  pendingReceipts: number
  pendingDeliveries: number
  scheduledTransfers: number
  activeFilter?: string
  onSelectMetric?: (metricId: string) => void
}

export function DashboardSummaryStrip({
  totalProducts,
  lowStockCount,
  outOfStockCount,
  pendingReceipts,
  pendingDeliveries,
  scheduledTransfers,
  activeFilter,
  onSelectMetric,
}: DashboardSummaryStripProps) {
  const items = [
    {
      id: 'products',
      label: 'Total Products',
      value: totalProducts.toLocaleString(),
      subtext: 'Catalog SKUs',
      icon: Package,
      alertStyle: false,
      badgeText: 'Active',
      badgeColor: 'text-slate-500 bg-slate-100',
    },
    {
      id: 'low_stock',
      label: 'Low Stock',
      value: lowStockCount.toLocaleString(),
      subtext: 'Below minimum',
      icon: AlertTriangle,
      alertStyle: lowStockCount > 0,
      badgeText: lowStockCount > 0 ? 'Reorder' : 'Healthy',
      badgeColor: lowStockCount > 0 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-slate-500 bg-slate-100',
    },
    {
      id: 'out_of_stock',
      label: 'Out of Stock',
      value: outOfStockCount.toLocaleString(),
      subtext: 'Zero on-hand',
      icon: AlertOctagon,
      alertStyle: outOfStockCount > 0,
      badgeText: outOfStockCount > 0 ? 'Critical' : 'None',
      badgeColor: outOfStockCount > 0 ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-slate-500 bg-slate-100',
    },
    {
      id: 'receipts',
      label: 'Pending Receipts',
      value: pendingReceipts.toLocaleString(),
      subtext: 'Inbound intake',
      icon: ArrowDownToLine,
      alertStyle: false,
      badgeText: 'Inbound',
      badgeColor: 'text-brand-dark bg-[#ede9fe] border border-brand/20',
    },
    {
      id: 'deliveries',
      label: 'Pending Deliveries',
      value: pendingDeliveries.toLocaleString(),
      subtext: 'Awaiting dispatch',
      icon: ArrowUpFromLine,
      alertStyle: false,
      badgeText: 'Outbound',
      badgeColor: 'text-sky-700 bg-sky-50 border border-sky-200',
    },
    {
      id: 'transfers',
      label: 'Scheduled Transfers',
      value: scheduledTransfers.toLocaleString(),
      subtext: 'Zone & relocations',
      icon: ArrowLeftRight,
      alertStyle: false,
      badgeText: 'Internal',
      badgeColor: 'text-slate-600 bg-slate-100',
    },
  ]

  return (
    <section aria-label="Operational Summary Metrics">
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs">
        {items.map((item) => {
          const Icon = item.icon
          const isSelected = activeFilter === item.id

          return (
            <div
              key={item.id}
              onClick={() => onSelectMetric?.(item.id)}
              className={cn(
                'p-3.5 sm:p-4 flex flex-col justify-between transition-colors relative cursor-pointer group select-none',
                isSelected ? 'bg-[#ede9fe]/40' : 'hover:bg-slate-50/70'
              )}
            >
              {/* Header: Label & Micro Badge */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {item.label}
                </span>
                <span className={cn('text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0', item.badgeColor)}>
                  {item.badgeText}
                </span>
              </div>

              {/* Value & Icon Row */}
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className={cn(
                  'text-2xl font-semibold tracking-tight font-heading',
                  item.id === 'out_of_stock' && outOfStockCount > 0 ? 'text-rose-600' :
                  item.id === 'low_stock' && lowStockCount > 0 ? 'text-amber-700' :
                  'text-slate-900'
                )}>
                  {item.value}
                </span>
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    item.id === 'out_of_stock' && outOfStockCount > 0 ? 'text-rose-400 group-hover:text-rose-600' :
                    item.id === 'low_stock' && lowStockCount > 0 ? 'text-amber-400 group-hover:text-amber-600' :
                    'text-slate-400 group-hover:text-slate-600'
                  )}
                  aria-hidden="true"
                />
              </div>

              {/* Subtext */}
              <div className="mt-1 text-[11px] text-slate-400 truncate">
                {item.subtext}
              </div>

              {/* Subtle active indicator bar */}
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
