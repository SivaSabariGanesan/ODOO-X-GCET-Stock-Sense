import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ChatWidget } from '@/features/ai'

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Redirect to login if unauthenticated
  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <div className="page-layout h-screen overflow-hidden flex bg-app font-sans antialiased text-gray-800">
      {/* Persistent Left Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="page-main flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header onToggleMobileMenu={() => setIsMobileOpen(true)} />

        {/* Dynamic Route Content */}
        <main className="page-content flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>

      {/* Floating Bottom-Right Chatbot Widget */}
      {location.pathname !== '/ai' && <ChatWidget />}
    </div>
  )
}
