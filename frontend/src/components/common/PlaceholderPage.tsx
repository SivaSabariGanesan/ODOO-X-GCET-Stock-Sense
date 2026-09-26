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
  CheckSquare,
  Copy,
  ChevronDown,
  ArrowUpDown,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowStatus = 'draft' | 'confirmed' | 'ready' | 'done' | 'cancelled' | 'active' | 'archived'

interface PlaceholderPageProps {
  title: string
  subtitle: string
  /** Optional internal module code. Omit to hide it from the header. */
  moduleCode?: string
  /** Whether to show the Calendar view tab. Default true — set false for
   *  pages where a calendar makes no operational sense (e.g. Products). */
  showCalendarView?: boolean
  /** Whether to show Print Slip in the bulk-selection toolbar. Default true —
   *  set false for pages without a slip workflow (e.g. Products). */
  showPrintSlip?: boolean
  /** Placeholder text for the page-level search input. */
  searchPlaceholder?: string
  /** Heading shown in the table header bar. Default: "Records". */
  tableTitle?: string
  /** Label for the row action button. Default: "View". */
  actionLabel?: string
  /** Override the displayed label for specific status values.
   *  e.g. { done: 'Active', draft: 'Archived' }
   *  The variant (colour) still uses the raw status value from the row. */
  statusLabelMap?: Partial<Record<RowStatus, string>>
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
    status: RowStatus
    updated: string
  }[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaceholderPage({
  title,
  subtitle,
  moduleCode,
  showCalendarView = true,
  showPrintSlip = true,
  searchPlaceholder = 'Filter by reference, description or status...',
  tableTitle = 'Records',
  actionLabel = 'View',
  statusLabelMap = {},
  stats = [
    { label: 'Active Items',        value: '1,420', change: '+12 today',    trend: 'up'      },
    { label: 'Pending Processing',  value: '38',    change: '5 urgent',     trend: 'down'    },
    { label: 'Completed Today',     value: '294',   change: '99.4% on-time', trend: 'up'     },
    { label: 'Discrepancies',       value: '0',     change: 'Audit cleared', trend: 'neutral' },
  ],
  columns = ['Reference', 'Description', 'Quantity / Unit', 'Status', 'Last Modified'],
  sampleRows = [
    { ref: 'WH/OP/00102', desc: 'Industrial Fasteners Pack M8',   qty: '450 pcs',  status: 'ready',     updated: '10 mins ago'  },
    { ref: 'WH/OP/00103', desc: 'Hydraulic Seal Kit (Type B)',    qty: '12 sets',  status: 'done',      updated: '35 mins ago'  },
    { ref: 'WH/OP/00104', desc: 'Heavy-Duty Caster Wheels 4"',   qty: '80 units', status: 'confirmed', updated: '1 hour ago'   },
    { ref: 'WH/OP/00105', desc: 'Steel Strut Channel 3m',        qty: '25 units', status: 'draft',     updated: '3 hours ago'  },
  ],
}: PlaceholderPageProps) {
  const toast = useToast()

  const [selectedRows, setSelectedRows]   = useState<number[]>([])
  const [viewMode,     setViewMode]       = useState<'list' | 'kanban' | 'calendar'>('list')
  const [isFavorite,   setIsFavorite]     = useState(false)
  const [searchFilter, setSearchFilter]   = useState('')

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const toggleSelectAll = () => {
    setSelectedRows(
      selectedRows.length === sampleRows.length ? [] : sampleRows.map((_, i) => i)
    )
  }

  const toggleRow = (index: number) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
    toast.info('Copied', `${ref} copied to clipboard`)
  }

  const handleAction = (actionName: string) => {
    toast.info(actionName, `Action queued for ${selectedRows.length} item${selectedRows.length !== 1 ? 's' : ''}.`)
  }

  /** Returns the label to display inside a status badge.
   *  Falls back to the raw status string (title-cased) if no override exists. */
  const statusLabel = (status: RowStatus): string => {
    if (statusLabelMap[status]) return statusLabelMap[status]!
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const filteredRows = sampleRows.filter(
    (row) =>
      row.ref.toLowerCase().includes(searchFilter.toLowerCase())    ||
      row.desc.toLowerCase().includes(searchFilter.toLowerCase())   ||
      row.status.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const [currentPage,   setCurrentPage]   = useState(1)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const isOnlyOnePage = totalPages <= 1
  const isPrevDisabled = currentPage <= 1 || isOnlyOnePage
  const isNextDisabled = currentPage >= totalPages || isOnlyOnePage

  const kanbanStages: RowStatus[] = ['draft', 'confirmed', 'ready', 'done']

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">

      {/* ── Page Header (Open & Breathless — No Enclosing Box) ───────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        {/* Title block */}
        <div className="flex items-start gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              setIsFavorite(!isFavorite)
              toast.info(isFavorite ? 'Removed from favourites' : 'Added to favourites')
            }}
            className="mt-1 text-slate-400 hover:text-amber-500 transition-colors p-0.5 cursor-pointer shrink-0"
            title={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Star
              className={cn(
                'w-4 h-4',
                isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
              )}
            />
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-heading">
                {title}
              </h1>
              {moduleCode && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                  {moduleCode}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Primary / Secondary Actions & View Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleAction('Export')}
          >
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => handleAction('New record')}
          >
            New
          </Button>

          {/* View switcher tabs */}
          <div
            className="flex items-center border border-slate-200 rounded-md bg-white p-0.5 ml-1 shadow-2xs"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-brand-light text-brand-dark font-medium shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
              title="List view"
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1.5 rounded transition-colors cursor-pointer',
                viewMode === 'kanban'
                  ? 'bg-brand-light text-brand-dark font-medium shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
              title="Kanban view"
              aria-label="Kanban view"
              aria-pressed={viewMode === 'kanban'}
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>

            {showCalendarView && (
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'p-1.5 rounded transition-colors cursor-pointer',
                  viewMode === 'calendar'
                    ? 'bg-brand-light text-brand-dark font-medium shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                )}
                title="Calendar view"
                aria-label="Calendar view"
                aria-pressed={viewMode === 'calendar'}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Operational KPI Metrics Summary Strip ───────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs">
        {stats.map((stat, idx) => (
          <div key={idx} className="p-4 sm:p-5">
            <div className="text-xs font-medium text-slate-500">
              {stat.label}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900 font-heading mt-1">
              {stat.value}
            </div>
            {stat.change && (
              <div
                className={cn(
                  'mt-1.5 text-xs font-medium flex items-center gap-1',
                  stat.trend === 'up'
                    ? 'text-emerald-600'
                    : stat.trend === 'down'
                    ? 'text-rose-600'
                    : 'text-slate-500'
                )}
              >
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── View 1: List ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Desktop Table Surface */}
          <div className="hidden sm:block bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">

            {/* Table Toolbar */}
            <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors placeholder:text-slate-400 text-slate-800"
                    aria-label={searchPlaceholder}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleAction('Open filters')}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer text-xs shrink-0"
                  aria-label="Open filter panel"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filters</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleAction('Group by')}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer text-xs shrink-0"
                  aria-label="Group results"
                >
                  <span>Group By</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Table meta count */}
              <div className="text-xs text-slate-500 font-mono flex items-center gap-2 shrink-0">
                <span className="font-semibold text-slate-700 font-sans">{tableTitle}</span>
                <span className="text-slate-300">|</span>
                <span>
                  {filteredRows.length} of {sampleRows.length}
                  {searchFilter ? ' matching' : ' entries'}
                </span>
              </div>
            </div>

            {/* Bulk Selection Bar */}
            {selectedRows.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckSquare className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
                  <span>
                    {selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'} selected
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {showPrintSlip && (
                    <button
                      type="button"
                      onClick={() => handleAction('Print slips')}
                      className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                      aria-label="Print slips for selected items"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Slip</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAction('Export selected')}
                    className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                    aria-label="Export selected items"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRows([])}
                    className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs cursor-pointer ml-1"
                    aria-label="Clear selection"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80">
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={
                          sampleRows.length > 0 &&
                          selectedRows.length === sampleRows.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                        aria-label="Select all rows"
                      />
                    </th>
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2.5 text-xs font-medium text-slate-500 select-none whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900">
                          <span>{col}</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                        </div>
                      </th>
                    ))}
                    <th className="w-20 px-4 py-2.5 text-right text-xs font-medium text-slate-500 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 2}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No records match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const isSelected = selectedRows.includes(idx)
                      return (
                        <tr
                          key={idx}
                          className={cn(
                            'transition-colors',
                            isSelected
                              ? 'bg-[#f4f0f9]'
                              : 'hover:bg-slate-50/60 bg-white'
                          )}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(idx)}
                              className="rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                              aria-label={`Select ${row.ref}`}
                            />
                          </td>

                          {/* SKU / reference — secondary monospace */}
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 group">
                              <span>{row.ref}</span>
                              <button
                                type="button"
                                onClick={() => copyRef(row.ref)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand transition-opacity cursor-pointer p-0.5 rounded"
                                title={`Copy ${row.ref}`}
                                aria-label={`Copy reference ${row.ref}`}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Name / description — strong visual hierarchy */}
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {row.desc}
                          </td>

                          {/* Quantity / On-hand — strong visual hierarchy */}
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">
                            {row.qty}
                          </td>

                          {/* Status badge */}
                          <td className="px-4 py-3">
                            <Badge variant={row.status} dot>
                              {statusLabel(row.status)}
                            </Badge>
                          </td>

                          {/* Category / last modified — secondary metadata */}
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.updated}
                          </td>

                          {/* Action — prominent compact button */}
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleAction(`${actionLabel} ${row.ref}`)}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-brand-dark bg-brand-light/60 hover:bg-brand hover:text-white border border-brand/20 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand/40"
                              aria-label={`${actionLabel} ${row.ref}`}
                            >
                              {actionLabel}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {filteredRows.length === 0 ? 0 : 1}–{filteredRows.length} of {sampleRows.length} entries
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={isPrevDisabled}
                  aria-disabled={isPrevDisabled}
                  className={cn(
                    'px-2.5 py-1 rounded-md border border-slate-200 text-xs transition-colors',
                    isPrevDisabled
                      ? 'bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                  )}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={isNextDisabled}
                  aria-disabled={isNextDisabled}
                  className={cn(
                    'px-2.5 py-1 rounded-md border border-slate-200 text-xs transition-colors',
                    isNextDisabled
                      ? 'bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2.5">
            <p className="text-xs text-slate-500 font-medium px-1">
              {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
              {searchFilter ? ' matching' : ''}
            </p>

            {filteredRows.map((row, idx) => {
              const isSelected = selectedRows.includes(idx)
              return (
                <div
                  key={idx}
                  className={cn(
                    'bg-white border rounded-lg p-3.5 shadow-2xs space-y-2.5 transition-colors',
                    isSelected ? 'border-brand/40 bg-[#f8f6fc]' : 'border-slate-200/80'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(idx)}
                        className="rounded border-slate-300 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                        aria-label={`Select ${row.ref}`}
                      />
                      <span className="font-mono text-xs text-slate-500">
                        {row.ref}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyRef(row.ref)}
                        className="text-slate-400 hover:text-brand p-1 rounded"
                        aria-label={`Copy reference ${row.ref}`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <Badge variant={row.status} dot>
                      {statusLabel(row.status)}
                    </Badge>
                  </div>

                  <div className="text-sm font-semibold text-slate-900 leading-snug">
                    {row.desc}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-mono font-bold text-slate-900">{row.qty}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{row.updated}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAction(`${actionLabel} ${row.ref}`)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-brand-dark bg-brand-light/70 hover:bg-brand hover:text-white border border-brand/20 transition-colors cursor-pointer"
                      aria-label={`${actionLabel} ${row.ref}`}
                    >
                      {actionLabel}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── View 2: Kanban ─────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanStages.map((stage) => {
            const stageRows = sampleRows.filter((r) => r.status === stage)
            return (
              <div
                key={stage}
                className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-700 font-heading">
                      {statusLabel(stage)}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-500 font-medium">
                      {stageRows.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!p-1 !h-auto text-slate-400 hover:text-slate-700"
                    onClick={() => handleAction(`Add to ${stage}`)}
                    aria-label={`Add item to ${statusLabel(stage)}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {stageRows.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No items</p>
                  ) : (
                    stageRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200/80 rounded-md p-3 shadow-2xs space-y-2 hover:border-brand/40 transition-colors cursor-pointer"
                        onClick={() => handleAction(`${actionLabel} ${row.ref}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleAction(`${actionLabel} ${row.ref}`)}
                        aria-label={`${actionLabel} ${row.ref}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-500 text-[11px]">
                            {row.ref}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-800">{row.qty}</span>
                        </div>
                        <p className="text-xs text-slate-900 font-medium leading-snug">{row.desc}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                          <span>{row.updated}</span>
                          <Badge variant={row.status} className="!text-[10px] !px-1.5">
                            {statusLabel(row.status)}
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

      {/* ── View 3: Calendar (operations pages only) ───────────────────── */}
      {viewMode === 'calendar' && showCalendarView && (
        <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-heading font-semibold text-sm text-slate-900">
              Operations Schedule & Handoff Timeline
            </h3>
            <span className="text-xs font-mono text-slate-500">Today: September 26, 2026</span>
          </div>

          <div className="space-y-2.5">
            {sampleRows.map((row, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200/80 hover:border-brand/30 bg-white hover:bg-slate-50/50 transition-colors gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-brand-light text-brand-dark font-mono font-semibold text-xs flex items-center justify-center shrink-0">
                    {`0${idx + 9}:00`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{row.ref}</span>
                      <Badge variant={row.status} dot>{statusLabel(row.status)}</Badge>
                    </div>
                    <div className="text-xs font-medium text-slate-900 mt-0.5">{row.desc}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 font-mono">
                  <span className="font-semibold text-slate-800">{row.qty}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Slot #{String(idx + 1).padStart(2, '0')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
