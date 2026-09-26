import React from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  ShieldCheck,
  Radio,
  Server,
  KeyRound,
  CheckCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  badgeText?: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  badgeText = 'WH/HQ-ONLINE',
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-app bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,rgba(105,82,155,0.09),transparent)] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Bar / Global Branding */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-4">
        <Link to="/login" className="flex items-center gap-2.5 group no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white shadow-sm shadow-brand/25 transition-transform duration-150 group-hover:scale-105">
            <Boxes className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-heading font-bold text-gray-900 tracking-tight text-lg leading-tight flex items-center gap-1.5">
              <span>StockSense</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200 font-semibold">
                v0.1
              </span>
            </div>
            <div className="text-[11px] text-gray-500 font-sans tracking-wide">
              Odoo-Native Inventory & Logistics
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <Badge variant="confirmed" dot className="text-[11px] hidden sm:inline-flex">
            {badgeText}
          </Badge>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span className="font-medium text-gray-600">WH01 Node Active</span>
          </div>
        </div>
      </header>

      {/* Main Container - Split View on Large Screens */}
      <div className="w-full max-w-5xl mx-auto my-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Info Panel (Visible on lg+) */}
          <div className="hidden lg:block lg:col-span-5 space-y-4 pr-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-semibold border border-brand/15">
              <Server className="w-3.5 h-3.5 text-brand" />
              <span>Production Terminal Gateway</span>
            </div>

            <div>
              <h2 className="text-2xl font-heading font-bold text-gray-900 leading-snug tracking-tight">
                High-Density Inventory Control
              </h2>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed font-sans">
                Engineered for continuous multi-bay tracking, barcode verification queues, automated reorder triggers, and real-time ledger consistency.
              </p>
            </div>

            {/* Operational Metrics Cards */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="stat-card !min-h-0 py-2.5 px-3 bg-view border border-slate-200/90 rounded-md shadow-xs">
                <span className="stat-label">Active SKUs</span>
                <span className="stat-value text-base font-bold text-gray-900">2,481</span>
                <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                  <span>●</span> 100% Synced
                </span>
              </div>
              <div className="stat-card !min-h-0 py-2.5 px-3 bg-view border border-slate-200/90 rounded-md shadow-xs">
                <span className="stat-label">Connected Facilities</span>
                <span className="stat-value text-base font-bold text-gray-900">3 Hubs</span>
                <span className="text-[10px] text-brand-dark font-mono font-medium">WH01 / WH02 / WH03</span>
              </div>
            </div>

            {/* Enterprise Security Highlights */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs text-gray-600 font-sans">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero backend credential exposure &middot; MFA verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Odoo data-density standards &middot; 14px typography</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Audited double-entry stock movement tracking</span>
              </div>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-md text-[11px] text-gray-600 font-mono flex items-center justify-between">
              <span>Quick Terminal Controls:</span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-view rounded border border-slate-300 text-gray-700 shadow-xs">Tab</kbd>
                <span>Focus</span>
                <kbd className="px-1.5 py-0.5 bg-view rounded border border-slate-300 text-gray-700 shadow-xs">Enter</kbd>
                <span>Submit</span>
              </div>
            </div>
          </div>

          {/* Right Card / Authentication Container */}
          <div className="lg:col-span-7 max-w-md w-full mx-auto">
            <div className="bg-view border border-slate-200/90 rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06),0_1px_3px_0_rgba(0,0,0,0.04)] overflow-hidden">
              {/* Card Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <h1 className="text-base font-heading font-bold text-gray-900 leading-tight">
                    {title}
                  </h1>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    SECURE-ID
                  </span>
                </div>
                {subtitle && (
                  <p className="text-xs text-gray-500 mt-1 leading-normal font-sans">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Form Content */}
              <div className="p-6">{children}</div>
            </div>

            {/* Security Footnote */}
            <div className="mt-3 px-2 flex items-center justify-between text-xs text-gray-500 font-sans">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                <span>256-Bit TLS Encrypted Session</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                <KeyRound className="w-3 h-3" />
                <span>MFA Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto pt-4 text-center text-xs text-gray-400 font-sans">
        StockSense &copy; {new Date().getFullYear()} &middot; Enterprise Inventory Management built on Odoo Architecture
      </footer>
    </div>
  )
}
