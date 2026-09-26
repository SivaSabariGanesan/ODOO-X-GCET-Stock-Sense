import { useState } from 'react'
import {
  Plus,
  Filter,
  Download,
  SlidersHorizontal,
  RefreshCw,
  LayoutList,
  Kanban,
  Calendar,
  Star,
  Printer,
  CheckCircle,
  Copy,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/cn'

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
  const toast = useToast()
  const [selectedRows, setSelectedRows] = useState<number[]>([0])
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list')
  const [isFavorite, setIsFavorite] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')

  const toggleSelectAll = () => {
    if (selectedRows.length === sampleRows.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(sampleRows.map((_, i) => i))
    }
  }

  const toggleRow = (index: number) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
    toast.info('Copied to Clipboard', `Reference code ${ref} copied`)
  }

  const handleAction = (actionName: string) => {
    toast.info('Phase 1 Demonstration', `${actionName} requested for ${selectedRows.length} items. CRUD will connect in Phase 2.`)
  }

  const filteredRows = sampleRows.filter(
    (row) =>
      row.ref.toLowerCase().includes(searchFilter.toLowerCase()) ||
      row.desc.toLowerCase().includes(searchFilter.toLowerCase()) ||
      row.status.toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Odoo Control Panel Top Bar */}
      <div className="bg-view border border-gray-200 rounded p-3 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Star Favorite */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setIsFavorite(!isFavorite)
                toast.info(isFavorite ? 'Removed from favorites' : 'Added to quick favorites')
              }}
              className="text-gray-400 hover:text-amber-500 transition-colors p-1 cursor-pointer"
              title="Bookmark module"
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  isFavorite ? 'text-amber-500 fill-amber-500' : 'text-gray-400'
                )}
              />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-heading font-bold text-gray-900 leading-tight">
                  {title}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 border border-gray-300">
                  {moduleCode}
                </span>
                <Badge variant="brand" className="text-[10px]">
                  Phase 1 UI Active
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-sans">{subtitle}</p>
            </div>
          </div>

          {/* Action Buttons & View Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleAction('Create Entry')}
            >
              New
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleAction('Export Data')}
            >
              Export
            </Button>

            {/* Odoo View Switcher (List, Kanban, Calendar) */}
            <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-view">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 transition-colors cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
                title="List View"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('kanban')
                  toast.info('Kanban View', 'Switching view representation')
                }}
                className={cn(
                  'p-1.5 transition-colors cursor-pointer border-l border-gray-200',
                  viewMode === 'kanban'
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
                title="Kanban Cards"
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('calendar')
                  toast.info('Calendar Timeline View', 'Switching view representation')
                }}
                className={cn(
                  'p-1.5 transition-colors cursor-pointer border-l border-gray-200',
                  viewMode === 'calendar'
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
                title="Schedule / Calendar"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Search Sub-bar */}
        <div className="pt-2 border-t border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Filter ${title.toLowerCase()}...`}
              className="w-full px-2.5 py-1 text-xs bg-gray-50 border border-gray-300 rounded focus:bg-view focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAction('Open Filters')}
              className="px-2.5 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Filter className="w-3 h-3 text-gray-500" />
              <span>Filters</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => handleAction('Group By')}
              className="px-2.5 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Group By</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          </div>
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

      {/* Bulk Selection Actions Bar (Appears when rows selected) */}
      {selectedRows.length > 0 && (
        <div className="p-2.5 bg-brand-light border border-brand/30 rounded flex items-center justify-between text-xs animate-[fadeIn_100ms_ease-out]">
          <div className="flex items-center gap-2 font-medium text-brand">
            <CheckCircle className="w-4 h-4" />
            <span>
              {selectedRows.length} {selectedRows.length === 1 ? 'record' : 'records'} selected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAction('Print Delivery Slips')}
              className="px-2 py-0.5 rounded bg-view border border-brand/40 text-brand hover:bg-brand hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <Printer className="w-3 h-3" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('Export Selected')}
              className="px-2 py-0.5 rounded bg-view border border-brand/40 text-brand hover:bg-brand hover:text-white transition-colors cursor-pointer"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setSelectedRows([])}
              className="text-gray-500 hover:text-gray-800 text-[11px] underline ml-1 cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* High-Density Data Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between py-2 px-4 bg-gray-50/70 border-b border-gray-200">
          <span className="font-semibold text-xs text-gray-800 uppercase tracking-wider font-heading">
            Operational Record Ledger
          </span>
          <span className="text-[11px] text-gray-500 font-mono">
            Showing {filteredRows.length} of {sampleRows.length} records
          </span>
        </div>

        <div className="table-container border-0 rounded-none">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === sampleRows.length && sampleRows.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                  />
                </th>
                {columns.map((col, idx) => (
                  <th key={idx}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900 select-none">
                      <span>{col}</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                ))}
                <th className="w-12 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const isSelected = selectedRows.includes(idx)

                return (
                  <tr
                    key={idx}
                    className={cn(
                      isSelected && 'bg-brand-light/30',
                      'hover:bg-gray-100 transition-colors'
                    )}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(idx)}
                        className="rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                      />
                    </td>
                    <td className="td-mono font-medium text-brand-dark">
                      <div className="flex items-center gap-1.5 group">
                        <span>{row.ref}</span>
                        <button
                          type="button"
                          onClick={() => copyRef(row.ref)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-brand transition-opacity cursor-pointer p-0.5"
                          title="Copy reference code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="font-medium text-gray-800">{row.desc}</td>
                    <td className="td-mono">{row.qty}</td>
                    <td>
                      <Badge variant={row.status} dot>
                        {row.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-gray-500 text-xs font-mono">{row.updated}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleAction(`Inspect ${row.ref}`)}
                        className="text-xs text-brand hover:underline font-medium cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="card-footer py-2 px-4 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500">
          <span>Displaying 1–{filteredRows.length} of {sampleRows.length} total entries</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-0.5 rounded border border-gray-300 bg-view text-gray-400 disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-2 py-0.5 rounded border border-gray-300 bg-view text-gray-700 hover:bg-gray-100 cursor-pointer">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
