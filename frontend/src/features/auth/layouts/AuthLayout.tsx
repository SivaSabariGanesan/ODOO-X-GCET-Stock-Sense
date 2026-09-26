import React from 'react'
import { Link } from 'react-router-dom'
import { Boxes, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-app flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar / Branding */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pb-6">
        <Link to="/login" className="flex items-center gap-2 group no-underline">
          <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-white shadow-sm transition-transform duration-150 group-hover:scale-105">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading font-bold text-gray-900 tracking-tight text-lg leading-tight flex items-center gap-1.5">
              <span>StockSense</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-gray-200 text-gray-700 rounded border border-gray-300">
                v0.1
              </span>
            </div>
            <div className="text-[11px] text-gray-600 font-sans tracking-wide">
              Inventory & Operations
            </div>
          </div>
        </Link>
        <Badge variant="confirmed" dot className="text-[11px]">
          WH/HQ-ONLINE
        </Badge>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-view border border-gray-300 rounded shadow-sm overflow-hidden">
          {/* Form Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 bg-gray-50/50">
            <h1 className="text-xl font-heading font-semibold text-gray-900 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-1 leading-normal font-sans">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Body */}
          <div className="p-6">{children}</div>
        </div>

        {/* Security & System Info Footnote */}
        <div className="mt-4 px-2 flex items-center justify-between text-xs text-gray-500 font-sans">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
            <span>256-Bit SSL Encrypted Session</span>
          </div>
          <span className="font-mono text-[11px] text-gray-400">Node ID: SS-NODE-01</span>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="w-full max-w-md mx-auto pt-6 text-center text-xs text-gray-400 font-sans">
        StockSense &copy; {new Date().getFullYear()} &middot; Built for High-Density Inventory Control
      </div>
    </div>
  )
}
