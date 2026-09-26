import { Plus, Filter, Download, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface PlaceholderPageProps {
  title: string
  subtitle: string
  moduleCode: string
  stats?: {
    label: string
    value: string
    change?: string
    trend?: 'up' | 'down' | 'neutral'
  }[]
  columns?: string[]
  sampleRows?: {
    ref: string
    desc: string
    qty: string
    status: 'draft' | 'confirmed' | 'ready' | 'done' | 'cancelled'
    updated: string
  }[]
}

export function PlaceholderPage({
  title,
  subtitle,
  moduleCode,
  stats = [
    { label: 'Active Items', value: '1,420', change: '+12 today', trend: 'up' },
    { label: 'Pending Processing', value: '38', change: '5 urgent', trend: 'down' },
    { label: 'Completed Today', value: '294', change: '99.4% on-time', trend: 'up' },
    { label: 'Discrepancies', value: '0', change: 'Audit cleared', trend: 'neutral' },
  ],
  columns = ['Reference', 'Description', 'Quantity / Unit', 'Status', 'Last Modified'],
  sampleRows = [
    {
      ref: 'WH/OP/00102',
      desc: 'Industrial Fasteners Pack M8',
      qty: '450 pcs',
      status: 'ready',
      updated: '10 mins ago',
    },
    {
      ref: 'WH/OP/00103',
      desc: 'Hydraulic Seal Kit (Type B)',
      qty: '12 sets',
      status: 'done',
      updated: '35 mins ago',
    },
    {
      ref: 'WH/OP/00104',
      desc: 'Heavy-Duty Caster Wheels 4"',
      qty: '80 units',
      status: 'confirmed',
      updated: '1 hour ago',
    },
    {
      ref: 'WH/OP/00105',
      desc: 'Steel Strut Channel 3m',
      qty: '25 units',
      status: 'draft',
      updated: '3 hours ago',
    },
  ],
}: PlaceholderPageProps) {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Page Title & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-heading font-bold text-gray-900 leading-tight">
              {title}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 border border-gray-300">
              {moduleCode}
            </span>
            <Badge variant="brand" className="text-[11px]">
              Phase 1 View
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-sans">{subtitle}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />}>
            Filters
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Entry
          </Button>
        </div>
      </div>

      {/* KPI Stats Row (Odoo Stat Button Density) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            {stat.change && (
              <div
                className={
                  stat.trend === 'up'
                    ? 'stat-trend-up'
                    : stat.trend === 'down'
                    ? 'stat-trend-down'
                    : 'text-xs text-gray-500'
                }
              >
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notice Card for Phase 1 */}
      <div className="p-3 bg-brand-light/40 border border-brand/20 rounded flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand shrink-0" />
          <span className="text-gray-700">
            <strong>Phase 1 Scope:</strong> Application Shell & Authentication architecture active. Full CRUD & database operations for {title} will be integrated in Phase 2.
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-brand hover:underline font-medium text-xs flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh View</span>
        </button>
      </div>

      {/* Dense Data Table Layout */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between py-2.5 px-4 bg-gray-50/50">
          <span className="font-semibold text-xs text-gray-700 uppercase tracking-wider font-heading">
            Operational Record Ledger
          </span>
          <span className="text-[11px] text-gray-500 font-mono">
            Showing {sampleRows.length} Mock Ledger Records
          </span>
        </div>

        <div className="table-container border-0 rounded-none">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                {columns.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, idx) => (
                <tr key={idx} className={idx === 0 ? 'selected' : ''}>
                  <td>
                    <input type="checkbox" defaultChecked={idx === 0} className="rounded border-gray-300" />
                  </td>
                  <td className="td-mono font-medium text-brand-dark">{row.ref}</td>
                  <td className="font-medium text-gray-800">{row.desc}</td>
                  <td className="td-mono">{row.qty}</td>
                  <td>
                    <Badge variant={row.status} dot>
                      {row.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="text-gray-500 text-xs font-mono">{row.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-footer py-2 px-4 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
          <span>Displaying page 1 of 1</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-0.5 rounded border border-gray-300 bg-view text-gray-400 disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-2 py-0.5 rounded border border-gray-300 bg-view text-gray-400 disabled:opacity-50" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
