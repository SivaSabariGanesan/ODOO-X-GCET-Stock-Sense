import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  message?: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    ({ title, message, type, duration = 4000 }: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      const newToast: Toast = { id, title, message, type, duration }

      setToasts((prev) => [...prev.slice(-4), newToast]) // keep max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, message?: string) => addToast({ title, message, type: 'success' }),
    [addToast]
  )

  const error = useCallback(
    (title: string, message?: string) => addToast({ title, message, type: 'error' }),
    [addToast]
  )

  const info = useCallback(
    (title: string, message?: string) => addToast({ title, message, type: 'info' }),
    [addToast]
  )

  const warning = useCallback(
    (title: string, message?: string) => addToast({ title, message, type: 'warning' }),
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              bg: 'bg-view border-success-DEFAULT/30 text-gray-900',
              iconColor: 'text-success-DEFAULT',
              indicator: 'bg-success-DEFAULT',
            },
            error: {
              icon: AlertCircle,
              bg: 'bg-view border-danger-DEFAULT/30 text-gray-900',
              iconColor: 'text-danger-DEFAULT',
              indicator: 'bg-danger-DEFAULT',
            },
            warning: {
              icon: AlertTriangle,
              bg: 'bg-view border-warning-DEFAULT/30 text-gray-900',
              iconColor: 'text-warning-DEFAULT',
              indicator: 'bg-warning-DEFAULT',
            },
            info: {
              icon: Info,
              bg: 'bg-view border-brand/30 text-gray-900',
              iconColor: 'text-brand',
              indicator: 'bg-brand',
            },
          }[t.type]

          const Icon = typeConfig.icon

          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                'pointer-events-auto border rounded shadow-lg p-3 text-xs flex items-start gap-2.5 transition-all duration-200 animate-[fadeIn_150ms_ease-out]',
                typeConfig.bg
              )}
            >
              <div className={cn('w-1 h-8 rounded-full shrink-0 mt-0.5', typeConfig.indicator)} />
              <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', typeConfig.iconColor)} />
              <div className="flex-1 min-w-0 pr-1">
                <div className="font-semibold text-gray-900 leading-tight">{t.title}</div>
                {t.message && <div className="text-gray-600 mt-0.5 leading-snug">{t.message}</div>}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
