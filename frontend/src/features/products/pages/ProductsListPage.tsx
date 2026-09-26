import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  Download,
  Filter,
  Layers,
  ChevronRight,
  Package,
  X,
  Edit2,
  Eye,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import {
  getMockProducts,
  PRODUCT_CATEGORIES,
} from '../mockProducts'
import { Product, ProductFiltersState, StockStatus } from '../types'
import { cn } from '@/lib/cn'

export function ProductsListPage() {
  const toast = useToast()
  const allProducts = getMockProducts()

  // ── Filter State ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<ProductFiltersState>({
    search: '',
    category: 'all',
    status: 'all',
    warehouse: 'all',
    groupBy: 'none',
  })

  // ── Status mapping helper ─────────────────────────────────────────────────
  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="success" dot>IN STOCK</Badge>
      case 'low_stock':
        return <Badge variant="warning" dot>LOW STOCK</Badge>
      case 'out_of_stock':
        return <Badge variant="danger" dot>OUT OF STOCK</Badge>
      case 'inactive':
        return <Badge variant="neutral" dot>INACTIVE</Badge>
    }
  }

  // ── Filter & Search Computation ───────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = filters.search.toLowerCase().trim()

    return allProducts.filter((p) => {
      // Search
      if (q) {
        const matchesSku = p.sku.toLowerCase().includes(q)
        const matchesName = p.name.toLowerCase().includes(q)
        const matchesCat = p.category.toLowerCase().includes(q)
        if (!matchesSku && !matchesName && !matchesCat) return false
      }

      // Category
      if (filters.category !== 'all' && p.category !== filters.category) {
        return false
      }

      // Status
      if (filters.status !== 'all' && p.status !== filters.status) {
        return false
      }

      // Warehouse
      if (filters.warehouse !== 'all' && p.warehouseId !== filters.warehouse) {
        return false
      }

      return true
    })
  }, [allProducts, filters])

  // ── Group By Computation ──────────────────────────────────────────────────
  const groupedProducts = useMemo(() => {
    if (filters.groupBy === 'none') {
      return { 'All Products': filteredProducts }
    }

    const groups: Record<string, Product[]> = {}

    filteredProducts.forEach((prod) => {
      let key = 'Other'
      if (filters.groupBy === 'category') {
        key = prod.category
      } else if (filters.groupBy === 'status') {
        const statusLabels: Record<StockStatus, string> = {
          in_stock: 'In Stock',
          low_stock: 'Low Stock',
          out_of_stock: 'Out of Stock',
          inactive: 'Inactive',
        }
        key = statusLabels[prod.status] || prod.status
      } else if (filters.groupBy === 'warehouse') {
        key = prod.warehouseName
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(prod)
    })

    return groups
  }, [filteredProducts, filters.groupBy])

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.category !== 'all' ||
    filters.status !== 'all' ||
    filters.warehouse !== 'all' ||
    filters.groupBy !== 'none'

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      status: 'all',
      warehouse: 'all',
      groupBy: 'none',
    })
    toast.info('Filters Reset', 'Showing all products in catalog.')
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      toast.warning('No Records', 'There are no products matching filters to export.')
      return
    }

    const headers = ['SKU', 'Product Name', 'Category', 'Unit', 'On Hand', 'Status', 'Warehouse']
    const rows = filteredProducts.map((p) => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.unit}"`,
      p.onHand,
      `"${p.status}"`,
      `"${p.warehouseName}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `stocksense_products_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Export Complete', `Exported ${filteredProducts.length} product records to CSV.`)
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Products
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Master catalog: SKU definitions, category classifications, and multi-location on-hand balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Export Action */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>

          {/* New Product CTA */}
          <Link to="/products/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Toolbar & Filters Surface ───────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 sm:px-4 sm:py-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Search & Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search products or SKUs..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors placeholder:text-slate-400 text-slate-800"
                aria-label="Search products"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                  filters.category !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Category"
              >
                <option value="all">Category: All</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    Category: {cat}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Stock Status Dropdown */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                  filters.status !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Stock Status"
              >
                <option value="all">Status: All</option>
                <option value="in_stock">Status: In Stock</option>
                <option value="low_stock">Status: Low Stock</option>
                <option value="out_of_stock">Status: Out of Stock</option>
                <option value="inactive">Status: Inactive</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Warehouse Dropdown */}
            <div className="relative">
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters((prev) => ({ ...prev, warehouse: e.target.value }))}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium max-w-[190px] truncate',
                  filters.warehouse !== 'all'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Filter by Warehouse"
              >
                <option value="all">Warehouse: All</option>
                <option value="WH01">WH01 — Main Central Warehouse</option>
                <option value="WH02">WH02 — North Distribution Hub</option>
                <option value="WH03">WH03 — Cold Storage Facility</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Group By Dropdown */}
            <div className="relative">
              <select
                value={filters.groupBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, groupBy: e.target.value as any }))}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-md border appearance-none pr-7 transition-colors cursor-pointer font-medium',
                  filters.groupBy !== 'none'
                    ? 'border-brand bg-[#ede9fe]/50 text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-label="Group records"
              >
                <option value="none">Group By: None</option>
                <option value="category">Group By: Category</option>
                <option value="status">Group By: Status</option>
                <option value="warehouse">Group By: Warehouse</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* Right: Results Count & Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs">
            <span className="font-mono text-slate-500">
              <strong className="text-slate-800 font-sans">{filteredProducts.length}</strong> of {allProducts.length} items
            </span>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-brand hover:text-brand-dark hover:underline font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table Content Surface ───────────────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-lg p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            No products match the filter criteria
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms, selecting "All Categories", or clearing warehouse filters.
          </p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedProducts).map(([groupTitle, groupItems]) => (
            <div
              key={groupTitle}
              className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs"
            >
              {/* Group Header if grouped */}
              {filters.groupBy !== 'none' && (
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                    <Layers className="w-3.5 h-3.5 text-brand" />
                    <span>{groupTitle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {groupItems.length} {groupItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-2.5 sm:px-5">Product SKU</th>
                      <th className="px-3 py-2.5">Product Name</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Unit</th>
                      <th className="px-3 py-2.5 text-right">On-hand</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right sm:pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupItems.map((prod) => (
                      <tr
                        key={prod.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* SKU — secondary / monospace */}
                        <td className="px-4 py-3 sm:px-5 whitespace-nowrap">
                          <Link
                            to={`/products/${prod.id}`}
                            className="font-mono text-xs font-medium text-slate-500 hover:text-brand hover:underline"
                          >
                            {prod.sku}
                          </Link>
                        </td>

                        {/* Product Name — Strong Visual Hierarchy */}
                        <td className="px-3 py-3">
                          <Link
                            to={`/products/${prod.id}`}
                            className="font-semibold text-slate-900 hover:text-brand transition-colors block text-sm tracking-tight"
                          >
                            {prod.name}
                          </Link>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {prod.warehouseName}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                          {prod.category}
                        </td>

                        {/* Unit */}
                        <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-500 text-[11.5px]">
                          {prod.unit}
                        </td>

                        {/* On-hand — Strong Visual Hierarchy */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <span
                            className={cn(
                              'font-mono text-sm font-bold',
                              prod.status === 'out_of_stock'
                                ? 'text-rose-600'
                                : prod.status === 'low_stock'
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            )}
                          >
                            {prod.onHand}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1 font-sans">
                            {prod.unit}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {getStatusBadge(prod.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/products/${prod.id}`}
                              className="px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                              title="View details"
                            >
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>View</span>
                            </Link>

                            <Link
                              to={`/products/${prod.id}/edit`}
                              className="px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-brand hover:bg-[#ede9fe]/50 transition-colors inline-flex items-center gap-1"
                              title="Edit product"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
