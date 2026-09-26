import React from 'react'
import { Link } from 'react-router-dom'
import { Boxes } from 'lucide-react'

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
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/login" className="inline-flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white shadow-sm">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-heading font-bold text-gray-900 tracking-tight text-xl leading-tight">
              StockSense
            </div>
            <div className="text-xs text-gray-500 font-sans">
              Inventory Operations
            </div>
          </div>
        </Link>
      </div>

      {/* Main Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200/90 rounded-lg shadow-2xs">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-gray-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 font-sans">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>

        <footer className="mt-6 text-center text-xs text-gray-400 font-sans">
          StockSense &copy; {new Date().getFullYear()} &middot; Inventory Management
        </footer>
      </div>
    </div>
  )
}
