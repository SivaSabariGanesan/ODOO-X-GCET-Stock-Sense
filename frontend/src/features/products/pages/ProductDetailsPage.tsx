import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit2,
  Package,
  Warehouse,
  FolderTree,
  AlertTriangle,
  History,
  Clock,
  Printer,
  Copy,
  ChevronRight,
  TrendingUp,
  Boxes,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { getMockProductById } from '../mockProducts'
import { StockStatus, Product } from '../types'
import { cn } from '@/lib/cn'
import { stockBalancesApi, ApiProductStockSummary } from '@/features/inventory'
import { apiClient } from '@/lib/apiClient'

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [productData, setProductData] = useState<Product | undefined>(() => (id ? getMockProductById(id) : undefined))
  const [liveStock, setLiveStock] = useState<ApiProductStockSummary | null>(null)
  const [isLoading, setIsLoading] = useState(!productData && Boolean(id))

  useEffect(() => {
    if (!id) return
    let isCancelled = false

    const loadData = async () => {
      try {
        // 1. Fetch real stock summary from stock balances backend
        try {
          const stockRes = await stockBalancesApi.getProductStock(id)
          if (!isCancelled && stockRes.data) {
            setLiveStock(stockRes.data)
          }
        } catch {
          // If product has no stock records or endpoint error, keep liveStock null
        }

        // 2. If product not found in mock, load from backend /api/products/:id
        const mockP = getMockProductById(id)
        if (!mockP) {
          try {
            const pRes = await apiClient.get<{ data: any }>(`/api/products/${id}`)
            if (!isCancelled && pRes.data) {
              const raw = pRes.data
              setProductData({
                id: raw.id,
                sku: raw.sku,
                name: raw.name,
                category: raw.category?.name ?? 'General',
                unit: raw.uom?.abbreviation ?? raw.uom?.name ?? 'Units',
                onHand: 0,
                status: 'in_stock',
                warehouseId: '',
                warehouseName: 'Main Hub',
                minReorderLevel: 0,
                targetStock: 0,
                reorderQuantity: 0,
                initialLocation: '',
                locations: [],
                recentMovements: [],
                createdAt: raw.createdAt ?? new Date().toISOString(),
                updatedAt: raw.updatedAt ?? new Date().toISOString(),
              })
            }
          } catch {
            // Keep productData undefined to trigger EmptyState
          }
        } else {
          setProductData(mockP)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isCancelled = true
    }
  }, [id])

  const product = productData

  const copySku = (sku: string) => {
    navigator.clipboard.writeText(sku)
    toast.info('Copied', `${sku} copied to clipboard`)
  }

  const handlePrintLabel = () => {
    toast.info('Printing Label', `Barcode and thermal label dispatched for ${product?.sku}.`)
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading product & stock balance details...</span>
      </div>
    )
  }

  if (!product) {
    return (
      <EmptyState
        icon={Package}
        title="Product Not Found"
        description={`The product identifier #${id} does not exist in the active catalog.`}
        actionLabel="Back to Products"
        onAction={() => navigate('/products')}
      />
    )
  }

  const effectiveOnHand = liveStock ? liveStock.totalQuantity : product.onHand
  const effectiveStatus: StockStatus = liveStock
    ? (liveStock.totalQuantity <= 0 ? 'out_of_stock' : 'in_stock')
    : product.status

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="success" dot>In Stock</Badge>
      case 'low_stock':
        return <Badge variant="warning" dot>Low Stock</Badge>
      case 'out_of_stock':
        return <Badge variant="danger" dot>Out of Stock</Badge>
      case 'inactive':
        return <Badge variant="neutral" dot>Inactive</Badge>
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* ── Page Header & Breadcrumbs ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/products"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mt-0.5"
            title="Back to products"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {product.sku}
              </span>
              <button
                type="button"
                onClick={() => copySku(product.sku)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Copy SKU"
              >
                <Copy className="w-3 h-3" />
              </button>
              {getStatusBadge(effectiveStatus)}
            </div>

            {/* Product Name — Strong Visual Hierarchy */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading mt-1 truncate">
              {product.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Category: <span className="font-medium text-slate-700">{product.category}</span> · Primary Hub: <span className="font-medium text-slate-700">{product.warehouseName}</span>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Link to={`/inventory?search=${encodeURIComponent(product.sku)}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Boxes className="w-3.5 h-3.5" />}
            >
              Stock Balances
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={handlePrintLabel}
          >
            Print Label
          </Button>

          <Link to={`/products/${product.id}/edit`}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Product
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Key Attributes Strip ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs">
        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total On-Hand Stock
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
            {effectiveOnHand}{' '}
            <span className="text-sm font-sans font-normal text-slate-400">{product.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {liveStock ? (
              <span>
                Avail: <strong className="text-emerald-700 font-mono">{liveStock.totalAvailable}</strong> &middot; Reserved: <strong className="text-amber-700 font-mono">{liveStock.totalReserved}</strong>
              </span>
            ) : (
              'Physical stock across all bins'
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Safety Minimum
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
            {product.minReorderLevel}{' '}
            <span className="text-sm font-sans font-normal text-slate-400">{product.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Reorder threshold limit
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Target Capacity
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
            {product.targetStock}{' '}
            <span className="text-sm font-sans font-normal text-slate-400">{product.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Maximum bay allocation
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Standard Batch
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
            +{product.reorderQuantity}{' '}
            <span className="text-sm font-sans font-normal text-slate-400">{product.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Fixed replenishment increment
          </div>
        </div>
      </div>

      {/* ── 2-Column Grid: Stock by Location & Reorder Rules ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* Left Column: Stock by Location (7 Cols) */}
        <div className="md:col-span-7 bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-brand" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Stock by Location
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Locations and quantities
            </span>
          </div>

          <div className="p-5 font-mono text-xs space-y-3 flex-1">
            {liveStock && liveStock.locationBalances && liveStock.locationBalances.length > 0 ? (
              liveStock.locationBalances.map((loc) => (
                <div key={loc.id} className="space-y-1.5">
                  <div className="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-50 border border-slate-200/60 font-medium text-slate-800 font-sans">
                    <div className="flex items-center gap-2 min-w-0">
                      <Warehouse className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-900">{loc.warehouseName || loc.warehouseShortCode}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-600 text-xs font-mono truncate">{loc.locationFullPath || loc.locationName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-500 font-sans">
                        Avail: <strong className="text-emerald-700 font-mono">{loc.availableQuantity}</strong>
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {loc.quantity} {loc.uomAbbreviation || loc.uomName || product.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : product.locations && product.locations.length > 0 ? (
              product.locations.map((locRoot) => (
                <div key={locRoot.id} className="space-y-1.5">
                  {/* Warehouse Root Level */}
                  <div className="flex items-center justify-between py-1 px-2.5 rounded bg-slate-50 border border-slate-200/60 font-medium text-slate-800 font-sans">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold">{locRoot.name}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {locRoot.quantity} {locRoot.unit}
                    </span>
                  </div>

                  {/* Sub-Location Tree Structure */}
                  {locRoot.children && locRoot.children.length > 0 && (
                    <div className="pl-6 space-y-1 text-slate-600">
                      {locRoot.children.map((child, idx) => {
                        const isLast = idx === (locRoot.children?.length ?? 0) - 1
                        return (
                          <div
                            key={child.id}
                            className="flex items-center justify-between py-1 px-2 hover:bg-slate-50 rounded transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 font-sans">
                                {isLast ? '└──' : '├──'}
                              </span>
                              <span className="font-sans font-medium text-slate-800 group-hover:text-brand">
                                {child.name}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {child.quantity}{' '}
                              <span className="text-[10px] text-slate-400 font-normal font-sans">
                                {child.unit}
                              </span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-sans">
                No location balances recorded for this product in active warehouses.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Reorder Information (5 Cols) */}
        <div className="md:col-span-5 bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Reordering Rules
              </h2>
            </div>
          </div>

          <div className="p-5 space-y-4 text-xs flex-1">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Reorder Method</span>
              <span className="font-semibold text-slate-800">Min-Max Replenishment</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Minimum Threshold</span>
              <span className="font-mono font-bold text-slate-800">
                {product.minReorderLevel} {product.unit}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Target Maximum</span>
              <span className="font-mono font-bold text-slate-800">
                {product.targetStock} {product.unit}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Recommended Batch</span>
              <span className="font-mono font-bold text-brand">
                +{product.reorderQuantity} {product.unit}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 font-medium">Supplier Lead Time</span>
              <span className="text-slate-700 font-medium">3-5 business days</span>
            </div>

            {product.onHand <= product.minReorderLevel && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-[11px] flex items-start gap-2 mt-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Replenishment Needed:</span> Current on-hand stock ({product.onHand} {product.unit}) is at or below the safety threshold.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Movements Section ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Recent Stock Movements
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {product.recentMovements.length} entries
          </span>
        </div>

        {product.recentMovements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">No stock movements recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Inbound receipts, transfers, or delivery dispatches will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 sm:px-5">Date</th>
                  <th className="px-3 py-2.5">Reference</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Route</th>
                  <th className="px-3 py-2.5 text-right">Quantity</th>
                  <th className="px-3 py-2.5">Operator</th>
                  <th className="px-4 py-2.5 text-right sm:pr-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.recentMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 sm:px-5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {mov.date}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap font-mono font-semibold text-brand text-xs">
                      {mov.reference}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-700 capitalize">
                      {mov.type}
                    </td>

                    <td className="px-3 py-3 text-slate-600 truncate max-w-[240px]">
                      {mov.source} → {mov.destination}
                    </td>

                    <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold">
                      <span className={mov.quantity > 0 ? 'text-emerald-700' : 'text-slate-800'}>
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </span>{' '}
                      <span className="font-normal font-sans text-slate-400 text-[10px]">
                        {mov.unit}
                      </span>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-[11.5px]">
                      {mov.operator}
                    </td>

                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      <Badge variant="done" dot>
                        {mov.status === 'completed' ? 'Completed' : mov.status === 'done' ? 'Done' : mov.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
