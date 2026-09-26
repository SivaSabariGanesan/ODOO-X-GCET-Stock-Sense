import { useEffect } from 'react'
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger' | 'warning' | 'success'
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: React.ReactNode
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onClose,
  children,
}: ConfirmationModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const iconMap = {
    primary: <Info className="w-5 h-5 text-brand" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    danger: <AlertTriangle className="w-5 h-5 text-rose-600" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
  }

  const iconBgMap = {
    primary: 'bg-[#ede9fe] text-brand-dark border-brand/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-2xs animate-[fadeIn_100ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 relative z-10 text-xs">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border mt-0.5',
                iconBgMap[variant]
              )}
            >
              {iconMap[variant]}
            </div>
            <div>
              <h3
                id="confirmation-modal-title"
                className="text-sm font-bold text-slate-900 font-heading"
              >
                {title}
              </h3>
              <p className="text-slate-500 mt-1 leading-normal">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Custom Content (e.g. key details box) */}
        {children && <div className="mt-2">{children}</div>}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
