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
  Warehouse,
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
    { id: 'hist', title: 'Stock Move History Ledger', category: 'Operations', href: '/operations/history', icon: History },
    { id: 'wh', title: 'Warehouse Facilities Configuration', category: 'Configuration', href: '/settings/warehouses', icon: Warehouse, badge: '3 Nodes' },
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-view rounded-lg shadow-xl border border-gray-300 overflow-hidden z-10 animate-[fadeIn_150ms_ease-out]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <Search className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Type a command or jump to page... (e.g. receipts, products, warehouses)"
            className="w-full text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-gray-600 p-1 mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-300">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
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
                      'flex items-center justify-between px-3 py-2 rounded text-xs transition-colors cursor-pointer select-none',
                      isSelected
                        ? 'bg-brand-light text-brand font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn('w-4 h-4 shrink-0', isSelected ? 'text-brand' : 'text-gray-400')} />
                      <span>{item.title}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ({item.category})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-200 text-gray-700">
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
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1 bg-view border border-gray-300 rounded">↑</kbd>
            <kbd className="px-1 bg-view border border-gray-300 rounded">↓</kbd>
            <span>Select:</span>
            <kbd className="px-1 bg-view border border-gray-300 rounded">↵</kbd>
          </div>
          <span>StockSense Quick Jump</span>
        </div>
      </div>
    </div>
  )
}
