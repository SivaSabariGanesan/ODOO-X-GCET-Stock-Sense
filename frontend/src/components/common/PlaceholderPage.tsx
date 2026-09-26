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
    <div className="space-y-2.5 max-w-7xl mx-auto pb-4">

      {/* ── Control Panel ─────────────────────────────────────────────── */}
      <div className="bg-view border border-slate-200/90 rounded-lg p-3 shadow-xs space-y-2.5">

        {/* Row 1: Title + actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">

          {/* Title block */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setIsFavorite(!isFavorite)
                toast.info(isFavorite ? 'Removed from favourites' : 'Added to favourites')
              }}
              className="text-gray-400 hover:text-amber-500 transition-colors p-1 cursor-pointer shrink-0"
              title={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  isFavorite ? 'text-amber-500 fill-amber-500' : 'text-gray-400'
                )}
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-heading font-bold text-gray-900 leading-tight">
                  {title}
                </h1>
                {/* moduleCode is intentionally hidden from production UI unless
                    explicitly provided — internal codes don't belong in the
                    user-facing header */}
                {moduleCode && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    {moduleCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-sans line-clamp-1">{subtitle}</p>
            </div>
          </div>

          {/* Actions + view switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleAction('New record')}
              >
                New
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => handleAction('Export')}
              >
                Export
              </Button>
            </div>

            {/* View switcher */}
            <div
              className="flex items-center border border-slate-300 rounded overflow-hidden bg-view"
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 transition-colors cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-500 hover:bg-gray-100'
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
                  'p-1.5 transition-colors cursor-pointer border-l border-slate-200',
                  viewMode === 'kanban'
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
                title="Kanban view"
                aria-label="Kanban view"
                aria-pressed={viewMode === 'kanban'}
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>

              {/* Calendar view — only shown when the page type supports it */}
              {showCalendarView && (
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'p-1.5 transition-colors cursor-pointer border-l border-slate-200',
                    viewMode === 'calendar'
                      ? 'bg-brand-light text-brand'
                      : 'text-gray-500 hover:bg-gray-100'
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

        {/* Row 2: Search + filter controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-view focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
              aria-label={searchPlaceholder}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAction('Open filters')}
              className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer text-xs"
              aria-label="Open filter panel"
            >
              <Filter className="w-3 h-3 text-gray-500" />
              <span>Filters</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => handleAction('Group by')}
              className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer text-xs"
              aria-label="Group results"
            >
              <span>Group By</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-view border border-slate-200/90 rounded-md px-3 py-2 shadow-xs"
          >
            <div className="text-[11px] font-medium text-slate-600 leading-none">
              {stat.label}
            </div>
            <div className="text-lg sm:text-xl font-heading font-bold text-gray-900 mt-1 leading-tight">
              {stat.value}
            </div>
            {stat.change && (
              <div
                className={cn(
                  'mt-0.5 text-[11px] font-medium',
                  stat.trend === 'up'
                    ? 'text-success-text'
                    : stat.trend === 'down'
                    ? 'text-danger-text'
                    : 'text-gray-500'
                )}
              >
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Bulk Selection Bar ─────────────────────────────────────────── */}
      {selectedRows.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 border border-slate-200 rounded-md flex items-center justify-between text-xs animate-[fadeIn_100ms_ease-out]">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <CheckSquare className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
            <span>
              {selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'} selected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Print Slip — only shown for pages with a slip workflow */}
            {showPrintSlip && (
              <button
                type="button"
                onClick={() => handleAction('Print slips')}
                className="px-2.5 py-1 rounded border border-slate-300 bg-view text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                aria-label="Print slips for selected items"
              >
                <Printer className="w-3 h-3" />
                <span>Print Slip</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAction('Export selected')}
              className="px-2.5 py-1 rounded border border-slate-300 bg-view text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
              aria-label="Export selected items"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setSelectedRows([])}
              className="px-2.5 py-1 text-gray-500 hover:text-gray-800 text-xs cursor-pointer ml-1"
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── View 1: List ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden sm:block overflow-hidden border border-slate-200/90 rounded-lg shadow-xs bg-view">

            {/* Table header bar */}
            <div className="flex items-center justify-between py-1.5 px-3.5 bg-slate-50/80 border-b border-slate-200">
              <span className="font-semibold text-xs text-gray-700 font-heading">
                {tableTitle}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredRows.length} of {sampleRows.length}
                {searchFilter ? ' matching' : ' entries'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={
                          sampleRows.length > 0 &&
                          selectedRows.length === sampleRows.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                        aria-label="Select all rows"
                      />
                    </th>
                    {columns.map((col, idx) => (
                      <th key={idx}>
                        <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900 select-none">
                          <span>{col}</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
                        </div>
                      </th>
                    ))}
                    <th className="w-20 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 2}
                        className="py-10 text-center text-sm text-gray-400"
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
                            'hover:bg-slate-50 transition-colors',
                            isSelected && 'bg-brand-light/20'
                          )}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(idx)}
                              className="rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                              aria-label={`Select ${row.ref}`}
                            />
                          </td>

                          {/* SKU / reference — secondary monospace */}
                          <td className="td-mono text-xs font-normal text-slate-500">
                            <div className="flex items-center gap-1.5 group">
                              <span className="font-mono">{row.ref}</span>
                              <button
                                type="button"
                                onClick={() => copyRef(row.ref)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-brand transition-opacity cursor-pointer p-0.5 rounded"
                                title={`Copy ${row.ref}`}
                                aria-label={`Copy reference ${row.ref}`}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Name / description — strong visual hierarchy */}
                          <td className="font-semibold text-gray-900 text-sm">{row.desc}</td>

                          {/* Quantity / On-hand — strong visual hierarchy */}
                          <td className="td-mono text-sm font-bold text-gray-900">{row.qty}</td>

                          {/* Status badge */}
                          <td>
                            <Badge variant={row.status} dot>
                              {statusLabel(row.status)}
                            </Badge>
                          </td>

                          {/* Category / last modified — secondary */}
                          <td className="text-gray-500 text-xs">{row.updated}</td>

                          {/* Action — prominent compact button */}
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => handleAction(`${actionLabel} ${row.ref}`)}
                              className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded text-brand-dark bg-brand-light/70 hover:bg-brand hover:text-white border border-brand/20 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand/40 shadow-2xs"
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

            <div className="py-2 px-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {filteredRows.length === 0 ? 0 : 1}–{filteredRows.length} of {sampleRows.length} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={isPrevDisabled}
                  aria-disabled={isPrevDisabled}
                  className={cn(
                    'px-2.5 py-1 rounded border border-slate-300 text-xs transition-colors',
                    isPrevDisabled
                      ? 'bg-slate-50 text-gray-400 opacity-50 cursor-not-allowed'
                      : 'bg-view text-gray-700 hover:bg-slate-50 cursor-pointer'
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
                    'px-2.5 py-1 rounded border border-slate-300 text-xs transition-colors',
                    isNextDisabled
                      ? 'bg-slate-50 text-gray-400 opacity-50 cursor-not-allowed'
                      : 'bg-view text-gray-700 hover:bg-slate-50 cursor-pointer'
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            <p className="text-xs text-gray-500 font-medium px-1">
              {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
              {searchFilter ? ' matching' : ''}
            </p>

            {filteredRows.map((row, idx) => {
              const isSelected = selectedRows.includes(idx)
              return (
                <div
                  key={idx}
                  className={cn(
                    'bg-view border rounded-lg p-3 shadow-xs space-y-2 transition-colors',
                    isSelected ? 'border-brand/40 bg-brand-light/10' : 'border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(idx)}
                        className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                        aria-label={`Select ${row.ref}`}
                      />
                      <span className="font-mono text-xs text-slate-500">
                        {row.ref}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyRef(row.ref)}
                        className="text-gray-400 hover:text-brand p-1 rounded"
                        aria-label={`Copy reference ${row.ref}`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <Badge variant={row.status} dot>
                      {statusLabel(row.status)}
                    </Badge>
                  </div>

                  <div className="text-sm font-semibold text-gray-900 leading-snug">
                    {row.desc}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="font-mono font-bold text-gray-900">{row.qty}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{row.updated}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAction(`${actionLabel} ${row.ref}`)}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded text-brand-dark bg-brand-light/70 hover:bg-brand hover:text-white border border-brand/20 transition-colors cursor-pointer"
                      aria-label={`${actionLabel} ${row.ref}`}
                    >
                      {actionLabel}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── View 2: Kanban ─────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-[fadeIn_150ms_ease-out]">
          {kanbanStages.map((stage) => {
            const stageRows = sampleRows.filter((r) => r.status === stage)
            return (
              <div
                key={stage}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-gray-700 font-heading">
                      {statusLabel(stage)}
                    </span>
                    <span className="px-1.5 rounded-full text-[10px] font-mono bg-view border border-slate-200 text-gray-500">
                      {stageRows.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!p-1 !h-auto text-gray-400 hover:text-gray-700"
                    onClick={() => handleAction(`Add to ${stage}`)}
                    aria-label={`Add item to ${statusLabel(stage)}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {stageRows.length === 0 ? (
                    <p className="py-6 text-center text-xs text-gray-400">No items</p>
                  ) : (
                    stageRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-view border border-slate-200/90 rounded-md p-2.5 shadow-xs space-y-1.5 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                        onClick={() => handleAction(`${actionLabel} ${row.ref}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleAction(`${actionLabel} ${row.ref}`)}
                        aria-label={`${actionLabel} ${row.ref}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-brand-dark text-[11px]">
                            {row.ref}
                          </span>
                          <span className="font-mono text-[10px] text-gray-500">{row.qty}</span>
                        </div>
                        <p className="text-xs text-gray-800 font-medium leading-snug">{row.desc}</p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                          <span>{row.updated}</span>
                          <Badge variant={row.status} className="!text-[9px] !px-1.5">
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
        <div className="bg-view border border-slate-200 rounded-lg shadow-xs p-4 sm:p-6 space-y-4 animate-[fadeIn_150ms_ease-out]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-heading font-bold text-sm text-gray-900">
              Operations Schedule & Handoff Timeline
            </h3>
            <span className="text-xs font-mono text-gray-500">Today: September 26, 2026</span>
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
                      <Badge variant={row.status} dot>{statusLabel(row.status)}</Badge>
                    </div>
                    <div className="text-xs font-medium text-gray-800 mt-0.5">{row.desc}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-500 font-mono">
                  <span>{row.qty}</span>
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
