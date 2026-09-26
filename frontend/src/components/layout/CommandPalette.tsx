import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Repeat,
  Warehouse,
  Tag,
  Scale,
  User,
  X,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  title: string
  category: 'Navigation' | 'Operations' | 'Configuration'
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items: CommandItem[] = [
    { id: 'dash', title: 'Dashboard & KPIs', category: 'Navigation', href: '/dashboard', icon: LayoutDashboard },
    { id: 'prod', title: 'Products Master Catalog', category: 'Navigation', href: '/products', icon: Package, badge: '2,481 SKUs' },
    { id: 'rec', title: 'Incoming Receipts (Dock Intake)', category: 'Operations', href: '/operations/receipts', icon: ArrowDownToLine, badge: '4 Pending' },
    { id: 'del', title: 'Outgoing Delivery Orders', category: 'Operations', href: '/operations/deliveries', icon: ArrowUpFromLine, badge: '8 Dispatches' },
    { id: 'trf', title: 'Internal Stock Transfers', category: 'Operations', href: '/operations/transfers', icon: ArrowLeftRight },
    { id: 'adj', title: 'Inventory Adjustments & Counts', category: 'Operations', href: '/operations/adjustments', icon: SlidersHorizontal },
    { id: 'reorder', title: 'Reordering Rules & Stock Thresholds', category: 'Operations', href: '/operations/reordering-rules', icon: Repeat },
    { id: 'hist', title: 'Stock Move History Ledger', category: 'Operations', href: '/operations/moves', icon: History },
    { id: 'wh', title: 'Warehouse Facilities Configuration', category: 'Configuration', href: '/settings/warehouses', icon: Warehouse, badge: '3 Nodes' },
    { id: 'cat', title: 'Product Categories Taxonomy', category: 'Configuration', href: '/settings/categories', icon: Tag },
    { id: 'uom', title: 'Units of Measure (UOM) Catalog', category: 'Configuration', href: '/settings/uoms', icon: Scale },
    { id: 'prof', title: 'Operator Profile & Node Security', category: 'Configuration', href: '/profile', icon: User },
  ]

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].href)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filtered, selectedIndex, navigate, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Type a command or jump to page... (e.g. receipts, products, warehouses)"
            className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1 mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching modules or commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((item, index) => {
                const Icon = item.icon
                const isSelected = index === selectedIndex

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      navigate(item.href)
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors cursor-pointer select-none',
                      isSelected
                        ? 'bg-brand-light/70 text-brand-dark font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn('w-4 h-4 shrink-0', isSelected ? 'text-brand-dark' : 'text-slate-400')} />
                      <span>{item.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({item.category})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {item.badge}
                        </span>
                      )}
                      {isSelected && (
                        <ExternalLink className="w-3 h-3 text-brand shrink-0" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1 bg-white border border-slate-200 rounded">↑</kbd>
            <kbd className="px-1 bg-white border border-slate-200 rounded">↓</kbd>
            <span>Select:</span>
            <kbd className="px-1 bg-white border border-slate-200 rounded">↵</kbd>
          </div>
          <span className="text-slate-400">StockSense Quick Jump</span>
        </div>
      </div>
    </div>
  )
}