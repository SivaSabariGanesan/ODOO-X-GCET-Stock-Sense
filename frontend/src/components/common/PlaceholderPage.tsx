import { useState } from 'react'
import {
  Plus,
  Filter,
  Download,
  LayoutList,
  Kanban,
  Calendar as CalendarIcon,
  Star,
  Printer,
  CheckCircle,
  Copy,
  ChevronDown,
  ArrowUpDown,
  Search,
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

  const kanbanStages = ['draft', 'confirmed', 'ready', 'done'] as const

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-6">
      {/* Odoo Control Panel Top Bar */}
      <div className="bg-view border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Star Favorite */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setIsFavorite(!isFavorite)
                toast.info(isFavorite ? 'Removed from favorites' : 'Added to quick favorites')
              }}
              className="text-gray-400 hover:text-amber-500 transition-colors p-1 cursor-pointer shrink-0"
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
                <h1 className="text-base sm:text-lg font-heading font-bold text-gray-900 leading-tight">
                  {title}
                </h1>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {moduleCode}
                </span>
                <Badge variant="brand" className="text-[10px]">
                  Phase 1 UI Active
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-sans line-clamp-1">{subtitle}</p>
            </div>
          </div>

          {/* Action Buttons & View Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-2">
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
            </div>

            {/* Odoo View Switcher (List, Kanban, Calendar) */}
            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-view">
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
                aria-label="List View"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('kanban')
                  toast.info('Kanban Representation', 'Viewing items organized by operational stage')
                }}
                className={cn(
                  'p-1.5 transition-colors cursor-pointer border-l border-slate-200',
                  viewMode === 'kanban'
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
                title="Kanban Cards"
                aria-label="Kanban View"
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('calendar')
                  toast.info('Calendar Timeline', 'Operational schedule and dispatch windows')
                }}
                className={cn(
                  'p-1.5 transition-colors cursor-pointer border-l border-slate-200',
                  viewMode === 'calendar'
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
                title="Schedule / Calendar"
                aria-label="Calendar View"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Search Sub-bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Filter by reference, description or status...`}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-view focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAction('Open Filters')}
              className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer text-xs"
            >
              <Filter className="w-3 h-3 text-gray-500" />
              <span>Filters</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => handleAction('Group By')}
              className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer text-xs"
            >
              <span>Group By</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row (Responsive 2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card bg-view border border-slate-200/90 rounded-md p-2.5 sm:p-3 shadow-xs">
            <div className="stat-label text-slate-500">{stat.label}</div>
            <div className="stat-value text-gray-900 mt-0.5">{stat.value}</div>
            {stat.change && (
              <div
                className={cn(
                  'mt-0.5 font-medium',
                  stat.trend === 'up'
                    ? 'stat-trend-up'
                    : stat.trend === 'down'
                    ? 'stat-trend-down'
                    : 'text-xs text-gray-500'
                )}
              >
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bulk Selection Actions Bar */}
      {selectedRows.length > 0 && (
        <div className="p-2.5 bg-brand-light border border-brand/20 rounded-md flex items-center justify-between text-xs animate-[fadeIn_100ms_ease-out]">
          <div className="flex items-center gap-2 font-medium text-brand-dark">
            <CheckCircle className="w-4 h-4 text-brand" />
            <span>
              {selectedRows.length} {selectedRows.length === 1 ? 'record' : 'records'} selected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAction('Print Slips')}
              className="px-2 py-1 rounded bg-view border border-brand/30 text-brand-dark hover:bg-brand hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
            >
              <Printer className="w-3 h-3" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('Export Selected')}
              className="px-2 py-1 rounded bg-view border border-brand/30 text-brand-dark hover:bg-brand hover:text-white transition-colors cursor-pointer text-xs"
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

      {/* ── View 1: List View ────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {/* Desktop/Tablet Dense Data Table */}
          <div className="hidden sm:block card overflow-hidden border border-slate-200/90 rounded-lg shadow-xs">
            <div className="card-header flex items-center justify-between py-2.5 px-4 bg-slate-50/70 border-b border-slate-200">
              <span className="font-semibold text-xs text-gray-800 uppercase tracking-wider font-heading">
                Operational Record Ledger
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                Showing {filteredRows.length} of {sampleRows.length} entries
              </span>
            </div>

            <div className="table-container border-0 rounded-none overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === sampleRows.length && sampleRows.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                        aria-label="Select all"
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
                    <th className="w-16 text-right">Action</th>
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
                          'hover:bg-slate-50 transition-colors'
                        )}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(idx)}
                            className="rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                            aria-label={`Select row ${row.ref}`}
                          />
                        </td>
                        <td className="td-mono font-semibold text-brand-dark">
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
                        <td className="td-mono text-gray-700">{row.qty}</td>
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
                            className="text-xs text-brand hover:text-brand-dark font-semibold hover:underline cursor-pointer"
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

            <div className="card-footer py-2 px-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-gray-500">
              <span>Displaying 1–{filteredRows.length} of {sampleRows.length} total entries</span>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1 rounded border border-slate-300 bg-view text-gray-400 disabled:opacity-50" disabled>
                  Previous
                </button>
                <button className="px-2.5 py-1 rounded border border-slate-300 bg-view text-gray-700 hover:bg-slate-50 cursor-pointer">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Card List View (< 640px) */}
          <div className="sm:hidden space-y-2.5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
              Ledger Items ({filteredRows.length})
            </div>
            {filteredRows.map((row, idx) => {
              const isSelected = selectedRows.includes(idx)

              return (
                <div
                  key={idx}
                  className={cn(
                    'bg-view border rounded-lg p-3 shadow-xs space-y-2 transition-colors',
                    isSelected ? 'border-brand/40 bg-brand-light/20' : 'border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(idx)}
                        className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                      />
                      <span className="font-mono font-bold text-xs text-brand-dark">
                        {row.ref}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyRef(row.ref)}
                        className="text-gray-400 hover:text-brand p-1"
                        aria-label="Copy reference"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <Badge variant={row.status} dot>
                      {row.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-xs font-medium text-gray-900 leading-snug">
                    {row.desc}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="font-mono text-gray-800 font-semibold">{row.qty}</span>
                      <span>&middot;</span>
                      <span>{row.updated}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAction(`Inspect ${row.ref}`)}
                      className="text-xs text-brand font-semibold hover:underline"
                    >
                      Inspect →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── View 2: Kanban View ──────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-[fadeIn_150ms_ease-out]">
          {kanbanStages.map((stage) => {
            const stageRows = sampleRows.filter((r) => r.status === stage)

            return (
              <div key={stage} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-gray-800 uppercase tracking-wider font-heading">
                      {stage}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-view border border-slate-200 text-gray-600">
                      {stageRows.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!p-1 !h-auto text-gray-400 hover:text-gray-700"
                    onClick={() => handleAction(`Add to ${stage}`)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {stageRows.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      No items in {stage}
                    </div>
                  ) : (
                    stageRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-view border border-slate-200/90 rounded-md p-2.5 shadow-xs space-y-1.5 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                        onClick={() => handleAction(`Inspect ${row.ref}`)}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-brand-dark text-[11px]">
                            {row.ref}
                          </span>
                          <span className="font-mono text-[10px] text-gray-500">
                            {row.qty}
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 font-medium leading-snug">
                          {row.desc}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                          <span>{row.updated}</span>
                          <Badge variant={row.status} className="!text-[9px] !px-1.5">
                            {row.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── View 3: Calendar View ────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="card p-4 sm:p-6 bg-view border border-slate-200 rounded-lg shadow-xs space-y-4 animate-[fadeIn_150ms_ease-out]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-heading font-bold text-sm text-gray-900">
              Operations Schedule & Handoff Timeline
            </h3>
            <span className="text-xs font-mono text-gray-500">
              Today: September 26, 2026
            </span>
          </div>

          <div className="space-y-2.5">
            {sampleRows.map((row, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border border-slate-200 hover:border-brand/40 bg-slate-50/50 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-brand-light text-brand-dark font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {`0${idx + 9}:00`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-brand-dark">{row.ref}</span>
                      <Badge variant={row.status} dot>{row.status.toUpperCase()}</Badge>
                    </div>
                    <div className="text-xs font-medium text-gray-800 mt-0.5">{row.desc}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-500 font-mono">
                  <span>{row.qty}</span>
                  <span>&middot;</span>
                  <span>Slot Window #0{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
