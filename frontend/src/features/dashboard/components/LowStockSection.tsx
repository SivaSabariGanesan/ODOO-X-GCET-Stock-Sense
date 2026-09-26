import { Link } from 'react-router-dom'
import { Plus, CheckCircle2, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LowStockProduct } from '../types'
import { useToast } from '@/context/ToastContext'

interface LowStockSectionProps {
  products: LowStockProduct[]
  onReorderProduct?: (id: string) => void
}

export function LowStockSection({ products, onReorderProduct }: LowStockSectionProps) {
  const toast = useToast()

  const handleReorder = (product: LowStockProduct) => {
    onReorderProduct?.(product.id)
    toast.success(
      'Purchase Requisition Created',
      `Draft replenishment order generated for ${product.reorderQuantity} ${product.unit} of ${product.sku}.`
    )
  }

  return (
    <section className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900 font-heading">
            Low Stock Items
          </h2>
          <span className="text-xs font-mono font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            {products.length} alerts
          </span>
        </div>

        <Link
          to="/products"
          className="text-xs text-brand hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>Catalog</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table Content */}
      {products.length === 0 ? (
        <div className="p-8 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-xs font-medium text-slate-700">No low stock items</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All products are at or above minimum stock levels.</p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 sm:px-5">Product SKU & Name</th>
                <th className="px-3 py-2.5">Warehouse</th>
                <th className="px-3 py-2.5 text-right">On-Hand</th>
                <th className="px-3 py-2.5 text-right">Min Level</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right sm:pr-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((item) => {
                const isOutOfStock = item.status === 'out_of_stock'
                const deficit = Math.max(0, item.minLevel - item.onHand)

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* SKU & Name */}
                    <td className="px-4 py-3 sm:px-5">
                      <div className="font-mono text-xs font-semibold text-slate-700">
                        {item.sku}
                      </div>
                      <div className="font-medium text-slate-900 truncate max-w-[200px] mt-0.5">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.category}
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      <div className="font-medium text-slate-700">
                        {item.warehouseId}
                      </div>
                      <div className="text-[10.5px] text-slate-400 truncate max-w-[130px]">
                        {item.warehouseName.split(' — ')[1] || item.warehouseName}
                      </div>
                    </td>

                    {/* On Hand */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isOutOfStock ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {item.onHand}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400 font-sans">{item.unit}</span>
                    </td>

                    {/* Min Level & Deficit */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="font-mono text-xs text-slate-600">
                        {item.minLevel} {item.unit}
                      </div>
                      <div className="text-[10.5px] font-medium text-rose-600">
                        -{deficit} deficit
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {isOutOfStock ? (
                        <Badge variant="danger" dot>
                          Out of Stock
                        </Badge>
                      ) : (
                        <Badge variant="warning" dot>
                          Low Stock
                        </Badge>
                      )}
                    </td>

                    {/* Quick Reorder Action */}
                    <td className="px-4 py-3 sm:pr-5 text-right whitespace-nowrap">
                      <Button
                        variant={isOutOfStock ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handleReorder(item)}
                        leftIcon={<Plus className="w-3 h-3" />}
                        className="text-[11px] py-1 px-2.5 h-auto"
                      >
                        Reorder
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer summary */}
      <div className="px-4 py-2 sm:px-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Products below minimum quantity</span>
        <span className="font-mono font-medium text-slate-700">
          {products.reduce((acc, p) => acc + Math.max(0, p.minLevel - p.onHand), 0)} total units deficit
        </span>
      </div>
    </section>
  )
}
