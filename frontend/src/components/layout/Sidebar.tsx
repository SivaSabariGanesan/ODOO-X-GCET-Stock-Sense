import { useState, useEffect } from 'react'
import { NavLink, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Warehouse,
  User,
  Boxes,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Radio,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation()

  const isOperationsActive = location.pathname.startsWith('/operations')
  const [operationsOpen, setOperationsOpen] = useState(true)

  const isSettingsActive = location.pathname.startsWith('/settings')
  const [settingsOpen, setSettingsOpen] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        onToggleCollapse()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggleCollapse])

  const operationsItems = [
    { name: 'Receipts', href: '/operations/receipts', icon: ArrowDownToLine, count: '4' },
    { name: 'Deliveries', href: '/operations/deliveries', icon: ArrowUpFromLine, count: '8' },
    { name: 'Internal Transfers', href: '/operations/transfers', icon: ArrowLeftRight, count: '2' },
    { name: 'Inventory Adjustments', href: '/operations/adjustments', icon: SlidersHorizontal, count: '1' },
    { name: 'Move History', href: '/operations/history', icon: History },
  ]

  const settingsItems = [
    { name: 'Warehouses', href: '/settings/warehouses', icon: Warehouse, count: '3' },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div
        className={cn(
          'h-13 px-3.5 border-b border-slate-200/90 flex items-center justify-between shrink-0 bg-view',
          isCollapsed ? 'justify-center px-2' : ''
        )}
      >
        <Link
          to="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 overflow-hidden group no-underline"
        >
          <div className="w-7 h-7 rounded bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105">
            <Boxes className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-heading font-bold text-gray-900 text-sm tracking-tight leading-none">
                StockSense
              </span>
              <span className="text-[10px] text-gray-500 font-sans tracking-wider uppercase mt-0.5">
                Odoo Operations
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 rounded hover:bg-slate-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1 rounded hover:bg-slate-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* Core Items */}
        <NavLink
          to="/dashboard"
          onClick={onCloseMobile}
          className={({ isActive }) =>
            cn(
              'nav-item !mx-0 !px-2.5 !py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-between group relative',
              isActive
                ? 'bg-brand-light text-brand-dark font-semibold shadow-xs'
                : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900',
              isCollapsed && 'justify-center !px-0'
            )
          }
          title={isCollapsed ? 'Dashboard' : undefined}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand rounded-r" />
              )}
              <div className="flex items-center gap-2.5 min-w-0">
                <LayoutDashboard className="w-4 h-4 shrink-0 text-current" />
                {!isCollapsed && <span>Dashboard</span>}
              </div>
            </>
          )}
        </NavLink>

        <NavLink
          to="/products"
          onClick={onCloseMobile}
          className={({ isActive }) =>
            cn(
              'nav-item !mx-0 !px-2.5 !py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-between group relative',
              isActive
                ? 'bg-brand-light text-brand-dark font-semibold shadow-xs'
                : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900',
              isCollapsed && 'justify-center !px-0'
            )
          }
          title={isCollapsed ? 'Products' : undefined}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand rounded-r" />
              )}
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className="w-4 h-4 shrink-0 text-current" />
                {!isCollapsed && <span>Products</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  2.4k
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* Operations Accordion */}
        <div className="pt-2">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => setOperationsOpen(!operationsOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-700 cursor-pointer"
            >
              <span className={isOperationsActive ? 'text-brand-dark font-bold' : ''}>
                Operations
              </span>
              {operationsOpen ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
            </button>
          ) : (
            <div className="h-px bg-slate-200 my-2 mx-1" />
          )}

          {(!isCollapsed && operationsOpen) || isCollapsed ? (
            <div className={cn('space-y-0.5', !isCollapsed && 'mt-1 pl-1')}>
              {operationsItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      cn(
                        'nav-item !mx-0 !px-2.5 !py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-between group relative',
                        isActive
                          ? 'bg-brand-light text-brand-dark font-semibold shadow-xs'
                          : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900',
                        isCollapsed && 'justify-center !px-0'
                      )
                    }
                    title={isCollapsed ? `${item.name} ${item.count ? `(${item.count})` : ''}` : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand rounded-r" />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 shrink-0 text-current" />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </div>

                        {!isCollapsed && item.count && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ) : null}
        </div>

        {/* Settings Accordion */}
        <div className="pt-2">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-700 cursor-pointer"
            >
              <span className={isSettingsActive ? 'text-brand-dark font-bold' : ''}>
                Settings
              </span>
              {settingsOpen ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
            </button>
          ) : (
            <div className="h-px bg-slate-200 my-2 mx-1" />
          )}

          {(!isCollapsed && settingsOpen) || isCollapsed ? (
            <div className={cn('space-y-0.5', !isCollapsed && 'mt-1 pl-1')}>
              {settingsItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      cn(
                        'nav-item !mx-0 !px-2.5 !py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-between group relative',
                        isActive
                          ? 'bg-brand-light text-brand-dark font-semibold shadow-xs'
                          : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900',
                        isCollapsed && 'justify-center !px-0'
                      )
                    }
                    title={isCollapsed ? item.name : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand rounded-r" />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 shrink-0 text-current" />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </div>
                        {!isCollapsed && item.count && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ) : null}
        </div>

        {/* Profile Item */}
        <div className="pt-2">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
              Account
            </div>
          )}
          <NavLink
            to="/profile"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'nav-item !mx-0 !px-2.5 !py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-2.5 relative',
                isActive
                  ? 'bg-brand-light text-brand-dark font-semibold shadow-xs'
                  : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900',
                isCollapsed && 'justify-center !px-0'
              )
            }
            title={isCollapsed ? 'Profile' : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand rounded-r" />
                )}
                <User className="w-4 h-4 shrink-0 text-current" />
                {!isCollapsed && <span>Profile</span>}
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Bottom Live System Indicator */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span className="font-semibold text-gray-800">WH01 Node Online</span>
            </div>
            <span className="font-mono text-emerald-600 font-medium">99.98%</span>
          </div>
          <div className="mt-1 text-[10px] text-gray-500 font-mono flex items-center justify-between">
            <span>PostgreSQL 16</span>
            <span className="text-gray-400">Ctrl+B toggle</span>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200 flex justify-center">
          <Radio className="w-3.5 h-3.5 text-emerald-500" title="WH01 Online" />
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden md:block transition-all duration-200 shrink-0 z-20',
          isCollapsed ? 'w-15' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer with Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <aside className="relative flex flex-col w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-[fadeIn_150ms_ease-out]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
