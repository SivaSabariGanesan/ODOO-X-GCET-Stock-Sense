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

  // Ctrl+B toggles sidebar; Esc closes mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        onToggleCollapse()
      } else if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggleCollapse, isMobileOpen, onCloseMobile])

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileOpen])

  const operationsItems = [
    { name: 'Receipts',              href: '/operations/receipts',    icon: ArrowDownToLine,  count: '4' },
    { name: 'Deliveries',            href: '/operations/deliveries',  icon: ArrowUpFromLine,  count: '8' },
    { name: 'Internal Transfers',    href: '/operations/transfers',   icon: ArrowLeftRight,   count: '2' },
    { name: 'Inventory Adjustments', href: '/operations/adjustments', icon: SlidersHorizontal, count: '1' },
    { name: 'Move History',          href: '/operations/history',     icon: History },
  ]


  // ---------------------------------------------------------------------------
  // Reusable section label
  // ---------------------------------------------------------------------------
  const SectionLabel = ({ label, active = false }: { label: string; active?: boolean }) =>
    !isCollapsed ? (
      <div
        className={cn(
          'px-2.5 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider',
          active ? 'text-brand-dark' : 'text-slate-400'
        )}
      >
        {label}
      </div>
    ) : (
      <div className="h-px bg-slate-100 my-2 mx-1" />
    )

  // ---------------------------------------------------------------------------
  // Reusable nav link
  // ---------------------------------------------------------------------------
  const NavItem = ({
    to,
    icon: Icon,
    label,
    count,
    tooltip,
  }: {
    to: string
    icon: React.ElementType
    label: string
    count?: string
    tooltip?: string
  }) => (
    <NavLink
      to={to}
      onClick={onCloseMobile}
      className={({ isActive }) =>
        cn(
          'nav-item !mx-0 px-2.5 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between group relative',
          isActive
            ? 'bg-brand-light/70 text-brand-dark font-medium'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal',
          isCollapsed && 'justify-center !px-0 py-2'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon className="w-4 h-4 shrink-0 text-current" aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{label}</span>}
          </div>
          {/* Pending count badge */}
          {!isCollapsed && count && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
              {count}
            </span>
          )}
          {/* Collapsed tooltip */}
          {isCollapsed && (
            <div className="hidden md:group-hover:block absolute left-full ml-2 z-50 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-md whitespace-nowrap pointer-events-none">
              {tooltip ?? label}{count ? ` (${count})` : ''}
            </div>
          )}
        </>
      )}
    </NavLink>
  )

  // ---------------------------------------------------------------------------
  // Sidebar content (shared between desktop and mobile drawer)
  // ---------------------------------------------------------------------------
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 select-none">

      {/* Brand header */}
      <div
        className={cn(
          'h-13 px-4 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Link
          to="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 overflow-hidden group no-underline"
          aria-label="StockSense — go to dashboard"
        >
          <div className="w-7 h-7 rounded-md bg-brand text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Boxes className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-heading font-semibold text-slate-900 text-sm tracking-tight leading-none">
                StockSense
              </span>
              <span className="text-[10px] text-slate-400 font-sans tracking-wider uppercase mt-0.5">
                Inventory Operations
              </span>
            </div>
          )}
        </Link>

        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Mobile close */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-2 rounded-md hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-0.5" aria-label="Main navigation">

        {/* ── OVERVIEW ───────────────────────────────────────────────── */}
        <SectionLabel label="Overview" />
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

        {/* ── INVENTORY ──────────────────────────────────────────────── */}
        <div className="pt-1.5">
          <SectionLabel label="Inventory" active={location.pathname === '/products' || isOperationsActive} />

          {/* Products — static link */}
          <NavItem to="/products" icon={Package} label="Products" />

          {/* Operations sub-group — collapsible */}
          <div className="pt-0.5">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setOperationsOpen(!operationsOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors cursor-pointer"
                aria-expanded={operationsOpen}
              >
                <span className={cn(isOperationsActive && 'text-brand-dark font-medium')}>
                  Operations
                </span>
                {operationsOpen
                  ? <ChevronDown className="w-3 h-3 text-slate-400" />
                  : <ChevronRight className="w-3 h-3 text-slate-400" />
                }
              </button>
            ) : (
              <div className="h-px bg-slate-100 my-1 mx-1" />
            )}

            {((!isCollapsed && operationsOpen) || isCollapsed) && (
              <div className={cn('space-y-0.5', !isCollapsed && 'mt-0.5 pl-1')}>
                {operationsItems.map((item) => (
                  <NavItem
                    key={item.href}
                    to={item.href}
                    icon={item.icon}
                    label={item.name}
                    count={item.count}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CONFIGURATION ──────────────────────────────────────────── */}
        <div className="pt-2">
          <SectionLabel label="Configuration" active={isSettingsActive} />
          <NavItem
            to="/settings/warehouses"
            icon={Warehouse}
            label="Warehouses"
            count="3"
          />
        </div>

        {/* ── ACCOUNT ────────────────────────────────────────────────── */}
        <div className="pt-2">
          <SectionLabel label="Account" />
          <NavItem to="/profile" icon={User} label="Profile" tooltip="Profile & Security" />
        </div>
      </nav>
      {/* No debug / infrastructure information in the user-facing sidebar footer */}
    </div>
  )

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside
        className={cn(
          'hidden md:block transition-all duration-200 shrink-0 z-20',
          isCollapsed ? 'w-15' : 'w-60'
        )}
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer with overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full shadow-2xl z-10 bg-view animate-[fadeIn_150ms_ease-out]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
