import { useState } from 'react'
import {
  Bell,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  X,
  CheckCheck,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  type: 'warning' | 'info' | 'success'
  isRead: boolean
}

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsDropdown({ isOpen, onClose }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'Low Stock Alert (SKU-ERG-904)',
      description: 'Ergonomic Task Chair stock balance is below minimum threshold (18 remaining).',
      time: '12m ago',
      type: 'warning',
      isRead: false,
    },
    {
      id: 'notif_2',
      title: 'Receipt Staged at Dock (WH/IN/00094)',
      description: 'Vendor intake PO-8821 arrived at Bay 3. Ready for QC inspection.',
      time: '34m ago',
      type: 'info',
      isRead: false,
    },
    {
      id: 'notif_3',
      title: 'Delivery Dispatched (WH/OUT/00140)',
      description: 'Carrier confirmed dispatch for Northwind Enterprise freight.',
      time: '1h ago',
      type: 'success',
      isRead: true,
    },
  ])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (!isOpen) return null

  return (
    <div className="dropdown-menu absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-lg shadow-xl py-0 z-50 text-xs overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand" />
          <span className="font-semibold text-slate-900 font-heading">
            Operational Alerts
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-medium bg-brand text-white">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[11px] text-brand hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-60" />
            <span>All operational alerts cleared.</span>
          </div>
        ) : (
          notifications.map((item) => {
            const iconMap = {
              warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
              info: { icon: ArrowDownToLine, color: 'text-sky-600', bg: 'bg-sky-50' },
              success: { icon: ArrowUpFromLine, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            }[item.type]

            const Icon = iconMap.icon

            return (
              <div
                key={item.id}
                className={cn(
                  'p-3 flex items-start gap-2.5 hover:bg-slate-50/70 transition-colors relative group select-none',
                  !item.isRead && 'bg-brand-light/20'
                )}
              >
                <div className={cn('p-1.5 rounded-md shrink-0 mt-0.5', iconMap.bg, iconMap.color)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => dismissNotification(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-1 transition-opacity cursor-pointer absolute right-2 top-2"
                  aria-label="Dismiss alert"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-slate-50/60 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
        >
          Close Alerts
        </button>
      </div>
    </div>
  )
}
