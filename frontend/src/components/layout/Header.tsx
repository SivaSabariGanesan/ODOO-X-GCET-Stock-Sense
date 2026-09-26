import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User as UserIcon,
  Warehouse,
  LogOut,
  Check,
  Shield,
  Home,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { warehousesApi } from '@/features/warehouses/api'
import { Badge } from '@/components/ui/Badge'
import { CommandPalette } from './CommandPalette'
import { NotificationsDropdown } from './NotificationsDropdown'

interface HeaderProps {
  onToggleMobileMenu: () => void
}

export function Header({ onToggleMobileMenu }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const [warehousesList, setWarehousesList] = useState<Array<{ id: string; name: string; location: string }>>([])
  const [activeWarehouse, setActiveWarehouse] = useState<string>(() => {
    try {
      return localStorage.getItem('stocksense_active_warehouse') || 'WH01 — Main Central Warehouse'
    } catch {
      return 'WH01 — Main Central Warehouse'
    }
  })

  // Load real warehouses for global selector
  useEffect(() => {
    let isCancelled = false
    warehousesApi
      .list({ isActive: true, limit: 100 })
      .then((res) => {
        if (isCancelled || !res.data) return
        const mapped = res.data.map((w) => ({
          id: w.id,
          name: `${w.shortCode} — ${w.name}`,
          location: w.address || '',
        }))
        if (mapped.length > 0) {
          setWarehousesList(mapped)
          setActiveWarehouse((prev) => {
            const exists = mapped.find((m) => m.name === prev)
            if (exists) return prev
            const defaultWh = mapped[0].name
            try {
              localStorage.setItem('stocksense_active_warehouse', defaultWh)
            } catch {}
            return defaultWh
          })
        }
      })
      .catch(() => {
        // Fallback gracefully to default
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const profileRef = useRef<HTMLDivElement>(null)
  const warehouseRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Listen for Ctrl+K or Cmd+K or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setIsProfileOpen(false)
        setIsWarehouseOpen(false)
        setIsNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
      if (warehouseRef.current && !warehouseRef.current.contains(event.target as Node)) {
        setIsWarehouseOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on route change
  useEffect(() => {
    setIsProfileOpen(false)
    setIsWarehouseOpen(false)
    setIsNotificationsOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    toast.info('Signed Out', 'You have been signed out.')
    navigate('/login')
  }

  const handleWarehouseSelect = (whName: string) => {
    setActiveWarehouse(whName)
    try {
      localStorage.setItem('stocksense_active_warehouse', whName)
    } catch {
      // ignore
    }
    setIsWarehouseOpen(false)
    toast.success('Warehouse Selected', whName)
  }

  // Generate breadcrumbs from path
  const getBreadcrumbs = () => {
    const path = location.pathname.replace(/^\/|\/$/g, '')
    if (!path || path === 'dashboard') {
      return [{ label: 'StockSense', href: '/dashboard' }, { label: 'Dashboard' }]
    }

    const segments = path.split('/')
    const crumbs = [{ label: 'StockSense', href: '/dashboard' }]

    if (segments[0] === 'operations') {
      crumbs.push({ label: 'Operations', href: '/operations/receipts' })
      const opNames: Record<string, string> = {
        receipts: 'Receipts',
        deliveries: 'Deliveries',
        transfers: 'Internal Transfers',
        adjustments: 'Inventory Adjustments',
        moves: 'Move History',
        history: 'Move History',
      }
      if (segments[1] && opNames[segments[1]]) {
        const hasSub = Boolean(segments[2])
        crumbs.push({
          label: opNames[segments[1]],
          href: hasSub ? `/operations/${segments[1]}` : undefined,
        })
        if (segments[2] === 'new') {
          const newLabels: Record<string, string> = {
            receipts: 'New Receipt',
            deliveries: 'New Delivery',
            transfers: 'New Transfer',
            adjustments: 'New Adjustment',
          }
          crumbs.push({ label: newLabels[segments[1]] || 'New Operation' })
        } else if (segments[2]) {
          const detailLabels: Record<string, string> = {
            receipts: 'Receipt Details',
            deliveries: 'Delivery Details',
            transfers: 'Transfer Details',
            adjustments: 'Adjustment Details',
          }
          crumbs.push({ label: detailLabels[segments[1]] || 'Operation Details' })
        }
      }
    } else if (segments[0] === 'settings') {
      crumbs.push({ label: 'Settings', href: '/settings/warehouses' })
      if (segments[1] === 'warehouses') {
        const hasSub = Boolean(segments[2])
        crumbs.push({
          label: 'Warehouses',
          href: hasSub ? '/settings/warehouses' : undefined,
        })
        if (segments[2]) {
          crumbs.push({ label: 'Warehouse Details' })
        }
      }
    } else if (segments[0] === 'products') {
      crumbs.push({ label: 'Products', href: segments.length > 1 ? '/products' : undefined })
      if (segments[1] === 'new') {
        crumbs.push({ label: 'New Product' })
      } else if (segments[1] && segments[2] === 'edit') {
        crumbs.push({ label: 'Product Details', href: `/products/${segments[1]}` })
        crumbs.push({ label: 'Edit' })
      } else if (segments[1]) {
        crumbs.push({ label: 'Product Details' })
      }
    } else if (segments[0] === 'profile') {
      crumbs.push({ label: 'User Profile' })
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard'

  const availableWarehouses = warehousesList.length > 0
    ? warehousesList
    : [
        { id: 'WH01', name: 'WH01 — Main Central Warehouse', location: 'Section A-D' },
      ]

  return (
    <>
      <header className="page-topbar h-14 px-4 sm:px-6 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
        {/* Left: Mobile hamburger & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile Current Page Title */}
          <span className="sm:hidden font-heading font-semibold text-sm text-slate-900 truncate max-w-[130px]">
            {currentPageTitle}
          </span>

          {/* Desktop/Tablet Dynamic Breadcrumbs */}
          <nav className="breadcrumb hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-sans truncate">
            <Home className="w-3.5 h-3.5 text-slate-400" />
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="breadcrumb-sep text-slate-300">/</span>}
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="hover:text-brand transition-colors text-slate-500 hover:text-slate-900 font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-900">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Middle: Interactive Quick Search & Command Palette Trigger (Desktop) */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6 justify-center">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between pl-3 pr-2 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Search SKUs, receipts, transfers...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-white text-slate-400 rounded border border-slate-200 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="Open command palette"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Warehouse Selector Dropdown */}
          <div className="relative" ref={warehouseRef}>
            {/* Desktop Button */}
            <button
              type="button"
              onClick={() => {
                setIsWarehouseOpen(!isWarehouseOpen)
                setIsNotificationsOpen(false)
                setIsProfileOpen(false)
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <Warehouse className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="font-medium max-w-[280px] truncate">{activeWarehouse}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {/* Mobile Compact Warehouse Button */}
            <button
              type="button"
              onClick={() => {
                setIsWarehouseOpen(!isWarehouseOpen)
                setIsNotificationsOpen(false)
                setIsProfileOpen(false)
              }}
              className="sm:hidden p-1.5 rounded-md text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono border border-slate-200"
              aria-label="Select warehouse"
            >
              <Warehouse className="w-3.5 h-3.5 text-brand" />
              <span className="font-semibold">{activeWarehouse.split(/ — | - /)[0]}</span>
            </button>

            {isWarehouseOpen && (
              <div className="dropdown-menu absolute right-0 mt-1.5 w-80 max-w-[calc(100vw-1.5rem)] bg-view border border-gray-300 rounded shadow-lg py-1 z-50 text-xs animate-[fadeIn_100ms_ease-out]">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <span>Warehouses</span>
                </div>
                {availableWarehouses.map((wh) => (
                  <button
                    key={wh.id}
                    type="button"
                    onClick={() => handleWarehouseSelect(wh.name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-gray-800">{wh.name}</div>
                      {wh.location && (
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{wh.location}</span>
                        </div>
                      )}
                    </div>
                    {activeWarehouse === wh.name && (
                      <Check className="w-4 h-4 text-brand shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen)
                setIsWarehouseOpen(false)
                setIsProfileOpen(false)
              }}
              aria-label="View notifications"
              className="relative p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full ring-2 ring-white" />
            </button>

            <NotificationsDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(!isProfileOpen)
                setIsWarehouseOpen(false)
                setIsNotificationsOpen(false)
              }}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/20"
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
            >
              {/* Avatar with Initials */}
              <div className="w-7 h-7 rounded-md bg-brand-light text-brand-dark font-medium text-xs flex items-center justify-center font-heading border border-brand/20">
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'AM'}
              </div>

              {/* Name & Role (Hidden on mobile) */}
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">
                  {user?.name || 'User'}
                </span>
                <span className="text-[10px] text-gray-500 font-sans">
                  {user?.role === 'admin' ? 'Administrator' : 'Inventory Manager'}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="dropdown-menu absolute right-0 mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] bg-view border border-gray-300 rounded shadow-lg py-1 z-50 text-xs animate-[fadeIn_100ms_ease-out]">
                {/* User Info Header */}
                <div className="px-3.5 py-2.5 border-b border-gray-200 bg-gray-50/70">
                  <div className="font-semibold text-gray-900 text-sm">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">
                    {user?.email || ''}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge variant="brand" className="text-[10px]">
                      <Shield className="w-2.5 h-2.5 mr-0.5" />
                      {user?.role === 'admin' ? 'Admin' : 'Manager'}
                    </Badge>
                  </div>
                </div>

                {/* Links */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    to="/settings/warehouses"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Warehouse className="w-3.5 h-3.5 text-gray-500" />
                    <span>Warehouses</span>
                  </Link>
                </div>

                <div className="dropdown-divider" />

                {/* Logout Action */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-danger-text hover:bg-danger-bg/50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-danger-DEFAULT" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  )
}
