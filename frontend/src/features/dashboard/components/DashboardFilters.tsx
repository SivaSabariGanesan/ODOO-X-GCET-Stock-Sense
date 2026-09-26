import { Search, X, RotateCcw } from 'lucide-react'
import {
  DOCUMENT_TYPE_OPTIONS,
  STATUS_OPTIONS,
  WAREHOUSE_OPTIONS,
  CATEGORY_OPTIONS,
} from '../mockData'
import { DashboardFiltersState } from '../types'
import { cn } from '@/lib/cn'

interface DashboardFiltersProps {
  filters: DashboardFiltersState
  onFilterChange: (key: keyof DashboardFiltersState, value: string) => void
  onResetFilters: () => void
  totalResultsCount: number
}

export function DashboardFilters({
  filters,
  onFilterChange,
  onResetFilters,
  totalResultsCount,
}: DashboardFiltersProps) {
  const isFiltered =
    filters.documentType !== 'all' ||
    filters.status !== 'all' ||
    filters.warehouse !== 'all' ||
    filters.category !== 'all' ||
    Boolean(filters.searchQuery.trim())

  return (
    <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-4 sm:py-3 shadow-2xs space-y-3">
      {/* Top Filter Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Search input + Select Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={filters.searchQuery}
              onChange={(e) => onFilterChange('searchQuery', e.target.value)}
              placeholder="Search ref, SKU, product, partner..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors placeholder:text-slate-400 text-slate-800"
              aria-label="Search dashboard records"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange('searchQuery', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Clear search query"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Document Type Dropdown */}
          <div className="relative">
            <select
              value={filters.documentType}
              onChange={(e) => onFilterChange('documentType', e.target.value)}
              className={cn(
                'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                filters.documentType !== 'all'
                  ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              )}
              aria-label="Filter by Document Type"
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  Type: {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className={cn(
                'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                filters.status !== 'all'
                  ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              )}
              aria-label="Filter by Status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  Status: {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Warehouse Dropdown */}
          <div className="relative">
            <select
              value={filters.warehouse}
              onChange={(e) => onFilterChange('warehouse', e.target.value)}
              className={cn(
                'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium max-w-[190px] truncate',
                filters.warehouse !== 'all'
                  ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              )}
              aria-label="Filter by Warehouse"
            >
              {WAREHOUSE_OPTIONS.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Product Category Dropdown */}
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className={cn(
                'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                filters.category !== 'all'
                  ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              )}
              aria-label="Filter by Product Category"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat === 'All Categories' ? 'all' : cat}>
                  Category: {cat}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </div>
          </div>
        </div>

        {/* Right: Results Count & Reset button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="text-xs text-slate-500 font-mono">
            <span className="font-sans font-medium text-slate-700">{totalResultsCount}</span> records active
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-brand hover:text-brand-dark hover:bg-[#ede9fe]/60 transition-colors font-medium cursor-pointer"
              aria-label="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Row (if any) */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400 font-medium mr-1">Active filters:</span>

          {filters.documentType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Type: {DOCUMENT_TYPE_OPTIONS.find((o) => o.id === filters.documentType)?.label}
              <button
                type="button"
                onClick={() => onFilterChange('documentType', 'all')}
                className="hover:text-slate-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Status: {STATUS_OPTIONS.find((o) => o.id === filters.status)?.label}
              <button
                type="button"
                onClick={() => onFilterChange('status', 'all')}
                className="hover:text-slate-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.warehouse !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filters.warehouse}
              <button
                type="button"
                onClick={() => onFilterChange('warehouse', 'all')}
                className="hover:text-slate-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filters.category}
              <button
                type="button"
                onClick={() => onFilterChange('category', 'all')}
                className="hover:text-slate-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              "{filters.searchQuery}"
              <button
                type="button"
                onClick={() => onFilterChange('searchQuery', '')}
                className="hover:text-slate-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
