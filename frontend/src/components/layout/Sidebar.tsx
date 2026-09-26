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
  Repeat,
  Warehouse,
  Tag,
  Scale,
  User,
  Boxes,
  ChevronDown,
  ChevronRight,
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
  const isOperationsActive = location.pathname.startsWith('/operations')
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


  // ---------------------------------------------------------------------------
  // Reusable section label
  // ---------------------------------------------------------------------------
  const SectionLabel = ({ label, active = false }: { label: string; active?: boolean }) =>
    !isCollapsed ? (
      <div
        className={cn(
          'px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider',
          active ? 'text-brand-dark' : 'text-slate-400'
        )}
      >
        {label}
      </div>
    ) : (
      <div className="h-px bg-slate-100 my-2 mx-1.5" />
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
          'nav-item !mx-0 px-3 py-2 text-xs rounded-md transition-colors flex items-center justify-between group relative select-none',
          isActive
            ? 'bg-[#ede9fe]/80 text-[#5a4f80] font-semibold shadow-2xs'
            : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 font-medium',
          isCollapsed && 'justify-center !px-0 py-2.5'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon
              className={cn(
                'w-4 h-4 shrink-0 transition-colors',
                isActive ? 'text-brand-dark' : 'text-slate-400 group-hover:text-slate-600'
              )}
              aria-hidden="true"
            />
            {!isCollapsed && <span className="truncate">{label}</span>}
          </div>
          {/* Pending count badge */}
          {!isCollapsed && count && (
            <span
              className={cn(
                'text-[10.5px] font-mono px-1.5 py-0.2 rounded-full font-medium shrink-0 transition-colors',
                isActive
                  ? 'bg-brand/15 text-brand-dark font-semibold'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-700'
              )}
            >
              {count}
            </span>
          )}
          {/* Collapsed tooltip */}
          {isCollapsed && (
            <div className="hidden md:group-hover:block absolute left-full ml-2.5 z-50 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-md whitespace-nowrap pointer-events-none">
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
          'h-14 px-3.5 border-b border-slate-200/80 flex items-center shrink-0 bg-white',
          isCollapsed ? 'justify-center px-0' : 'justify-between'
        )}
      >
        <Link
          to="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 overflow-hidden group no-underline"
          aria-label="StockSense — go to dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Boxes className="w-4.5 h-4.5 text-white" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-semibold text-slate-900 text-sm tracking-tight leading-tight">
                StockSense
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                Inventory Operations
              </span>
            </div>
          )}
        </Link>

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
      <nav className="flex-1 overflow-y-auto pl-3 pr-6 py-3 space-y-1" aria-label="Main navigation">

        {/* ── OVERVIEW ───────────────────────────────────────────────── */}
        <SectionLabel label="Overview" />
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

        {/* ── INVENTORY ──────────────────────────────────────────────── */}
        <div className="pt-2">
          <SectionLabel label="Inventory" active={location.pathname === '/products' || location.pathname.startsWith('/inventory')} />
          <NavItem to="/products" icon={Package} label="Products" />
          <NavItem to="/inventory" icon={Boxes} label="Stock Balances" />
        </div>

        {/* ── OPERATIONS ─────────────────────────────────────────────── */}
        <div className="pt-2">
          <SectionLabel label="Operations" active={isOperationsActive} />
          <NavItem to="/operations/receipts" icon={ArrowDownToLine} label="Receipts" />
          <NavItem to="/operations/deliveries" icon={ArrowUpFromLine} label="Deliveries" />
          <NavItem to="/operations/transfers" icon={ArrowLeftRight} label="Internal Transfers" />
          <NavItem to="/operations/adjustments" icon={SlidersHorizontal} label="Inventory Adjustments" />
          <NavItem to="/operations/moves" icon={History} label="Move History" />
        </div>

        {/* ── CONFIGURATION ──────────────────────────────────────────── */}
        <div className="pt-2">
          <SectionLabel label="Configuration" active={isSettingsActive || location.pathname.startsWith('/operations/reordering-rules')} />
          <NavItem to="/settings/warehouses" icon={Warehouse} label="Warehouses" />
          <NavItem to="/settings/categories" icon={Tag} label="Categories" />
          <NavItem to="/settings/uoms" icon={Scale} label="Units of Measure" />
          <NavItem to="/operations/reordering-rules" icon={Repeat} label="Reordering Rules" />
        </div>
      </nav>

      {/* Pinned User Profile Footer */}
      <div className="mt-auto border-t border-slate-200/80 p-2.5 pr-6 shrink-0 bg-white">
        <NavLink
          to="/profile"
          onClick={onCloseMobile}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors group relative select-none',
              isActive
                ? 'bg-[#ede9fe]/80 text-[#5a4f80] font-semibold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 font-medium',
              isCollapsed && 'justify-center !px-0 py-2'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="w-7 h-7 rounded-full bg-brand-light/90 text-brand-dark flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-brand-dark" aria-hidden="true" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={cn('text-xs font-medium truncate', isActive ? 'text-brand-dark font-semibold' : 'text-slate-800')}>
                    Profile
                  </span>
                </div>
              )}
              {isCollapsed && (
                <div className="hidden md:group-hover:block absolute left-full ml-2.5 z-50 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-md whitespace-nowrap pointer-events-none">
                  Profile
                </div>
              )}
            </>
          )}
        </NavLink>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside
        className={cn(
          'hidden md:block transition-[width] duration-200 [transition-timing-function:cubic-bezier(0.2,0,0,1)] shrink-0 z-20 overflow-hidden',
          isCollapsed ? 'w-[60px]' : 'w-60'
        )}
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Collapse button — sibling of aside, NOT inside it.
         Sits half-inside / half-outside the sidebar edge at the vertical center (50%). */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          'collapse-btn hidden md:flex fixed top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-500 hover:bg-[#ede9fe] hover:text-brand hover:border-brand items-center justify-center cursor-pointer z-40 shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-[left,background-color,color,border-color] duration-200 [transition-timing-function:cubic-bezier(0.2,0,0,1)]',
          isCollapsed ? 'left-[48px]' : 'left-[228px]'
        )}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <polyline points={isCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
        </svg>
      </button>

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