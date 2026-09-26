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
    <div className="min-h-screen bg-app flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Bar / Global Branding */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6">
        <Link to="/login" className="flex items-center gap-2.5 group no-underline">
          <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-white shadow-sm transition-transform duration-150 group-hover:scale-105">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading font-bold text-gray-900 tracking-tight text-lg leading-tight flex items-center gap-1.5">
              <span>StockSense</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded border border-gray-300">
                v0.1
              </span>
            </div>
            <div className="text-[11px] text-gray-500 font-sans tracking-wide">
              Odoo-Integrated Inventory & Logistics
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="confirmed" dot className="text-[11px] hidden sm:inline-flex">
            {badgeText}
          </Badge>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 font-mono">
            <Radio className="w-3 h-3 text-success-DEFAULT animate-pulse" />
            <span>Node 01</span>
          </div>
        </div>
      </header>

      {/* Main Container - Split View on Large Screens */}
      <div className="w-full max-w-5xl mx-auto my-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Info Panel (Visible on lg+) */}
          <div className="hidden lg:block lg:col-span-5 space-y-4 pr-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-light text-brand text-xs font-medium">
              <Server className="w-3.5 h-3.5" />
              <span>Dedicated Terminal Gateway</span>
            </div>

            <div>
              <h2 className="text-2xl font-heading font-bold text-gray-900 leading-snug">
                Precision Warehouse Operations
              </h2>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                StockSense orchestrates multi-warehouse replenishment, barcode dispatch verification, internal bay routing, and real-time inventory ledger synchronization.
              </p>
            </div>

            {/* Operational Metrics Cards */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="stat-card !min-h-0 py-2">
                <span className="stat-label">Active SKUs</span>
                <span className="stat-value text-base">2,481</span>
                <span className="text-[10px] text-success-text font-mono">100% Synced</span>
              </div>
              <div className="stat-card !min-h-0 py-2">
                <span className="stat-label">Inventory Nodes</span>
                <span className="stat-value text-base">3 Facilities</span>
                <span className="text-[10px] text-brand font-mono">WH01 / WH02 / WH03</span>
              </div>
            </div>

            {/* Enterprise Security Highlights */}
            <div className="pt-2 border-t border-gray-200/80 space-y-1.5 text-xs text-gray-600 font-sans">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-success-DEFAULT shrink-0" />
                <span>Zero backend credential exposure &middot; MFA verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-success-DEFAULT shrink-0" />
                <span>Odoo data-density standards &middot; 14px typography</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-success-DEFAULT shrink-0" />
                <span>Audited double-entry stock movement tracking</span>
              </div>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="p-2.5 bg-gray-100 border border-gray-200 rounded text-[11px] text-gray-500 font-mono flex items-center justify-between">
              <span>Quick Navigation:</span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 bg-view rounded border border-gray-300">Tab</kbd>
                <span>Focus</span>
                <kbd className="px-1 py-0.5 bg-view rounded border border-gray-300">Enter</kbd>
                <span>Submit</span>
              </div>
            </div>
          </div>

          {/* Right Card / Authentication Container */}
          <div className="lg:col-span-7 max-w-md w-full mx-auto">
            <div className="bg-view border border-gray-300 rounded shadow-md overflow-hidden">
              {/* Card Header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-gray-50/70">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-heading font-semibold text-gray-900 leading-tight">
                    {title}
                  </h1>
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-200 text-gray-700 rounded border border-gray-300">
                    SECURE-ID
                  </span>
                </div>
                {subtitle && (
                  <p className="text-xs text-gray-600 mt-1 leading-normal font-sans">
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
      <footer className="w-full max-w-5xl mx-auto pt-6 text-center text-xs text-gray-400 font-sans">
        StockSense &copy; {new Date().getFullYear()} &middot; Enterprise Inventory Management built on Odoo Architecture
      </footer>
    </div>
  )
}
