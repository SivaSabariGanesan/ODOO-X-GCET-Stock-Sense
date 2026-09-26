import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, Warehouse } from 'lucide-react'
import { MovementSummaryData } from '../types'
import { cn } from '@/lib/cn'

interface MovementSummarySectionProps {
  data: MovementSummaryData
}

export function MovementSummarySection({ data }: MovementSummarySectionProps) {
  const totalVolume = data.inboundUnits + data.outboundUnits + data.internalUnits
  const inboundPct = totalVolume > 0 ? Math.round((data.inboundUnits / totalVolume) * 100) : 0
  const outboundPct = totalVolume > 0 ? Math.round((data.outboundUnits / totalVolume) * 100) : 0
  const internalPct = totalVolume > 0 ? Math.max(0, 100 - inboundPct - outboundPct) : 0

  const isNetPositive = data.netChange >= 0

  return (
    <section className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-900 font-heading">
            Inventory Movement Summary
          </h2>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Period: Today (24h)
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 flex-1">
        {/* Top 3 Movement Velocity Pillars */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Inbound */}
          <div className="p-3 rounded-md bg-slate-50/80 border border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand uppercase tracking-wider">
              <ArrowDownToLine className="w-3.5 h-3.5 text-brand" />
              <span>Inbound</span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              +{data.inboundUnits.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {data.inboundCount} receipts
            </div>
          </div>

          {/* Outbound */}
          <div className="p-3 rounded-md bg-slate-50/80 border border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 uppercase tracking-wider">
              <ArrowUpFromLine className="w-3.5 h-3.5 text-sky-600" />
              <span>Outbound</span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              -{data.outboundUnits.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {data.outboundCount} deliveries
            </div>
          </div>

          {/* Net Change */}
          <div className="p-3 rounded-md bg-slate-50/80 border border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isNetPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>Net Change</span>
            </div>
            <div
              className={cn(
                'text-lg font-bold font-mono mt-1',
                isNetPositive ? 'text-emerald-700' : 'text-rose-700'
              )}
            >
              {isNetPositive ? `+${data.netChange}` : data.netChange}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {data.internalUnits} internal
            </div>
          </div>
        </div>

        {/* Functional Proportional Distribution Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Movement Breakdown</span>
            <span className="font-mono">{totalVolume.toLocaleString()} total units processed</span>
          </div>

          {/* Multi-segment distribution bar */}
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${inboundPct}%` }}
              className="bg-brand transition-all duration-300"
              title={`Inbound: ${inboundPct}% (${data.inboundUnits} units)`}
            />
            <div
              style={{ width: `${outboundPct}%` }}
              className="bg-sky-500 transition-all duration-300"
              title={`Outbound: ${outboundPct}% (${data.outboundUnits} units)`}
            />
            <div
              style={{ width: `${internalPct}%` }}
              className="bg-emerald-500 transition-all duration-300"
              title={`Internal: ${internalPct}% (${data.internalUnits} units)`}
            />
          </div>

          {/* Bar Legend */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand" />
              <span>Inbound ({inboundPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Outbound ({outboundPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Internal ({internalPct}%)</span>
            </div>
          </div>
        </div>

        {/* Warehouse Volume Breakdown Table */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            Movement by Warehouse
          </div>

          <div className="space-y-2">
            {data.byWarehouse.map((wh) => (
              <div
                key={wh.warehouseId}
                className="flex items-center justify-between p-2 rounded border border-slate-100 bg-white hover:bg-slate-50/60 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-slate-800">{wh.warehouseId}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5 truncate">
                      {wh.name.split(' — ')[1]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                  <span className="text-emerald-700 font-medium">+{wh.inbound}</span>
                  <span className="text-sky-700 font-medium">-{wh.outbound}</span>
                  <span className="text-[10px] text-slate-400 font-sans bg-slate-100 px-1.5 py-0.2 rounded">
                    {wh.utilization}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
