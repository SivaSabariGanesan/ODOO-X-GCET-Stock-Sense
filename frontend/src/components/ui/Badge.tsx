import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'draft'
    | 'confirmed'
    | 'ready'
    | 'done'
    | 'cancelled'
    | 'brand'
    | 'warning'
    | 'danger'
    | 'info'
    | 'success'
    | 'neutral'
  dot?: boolean
}

export function Badge({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    confirmed: 'bg-info-bg text-info-text border-info-DEFAULT/20',
    ready: 'bg-warning-bg text-warning-text border-warning-DEFAULT/20',
    done: 'bg-success-bg text-success-text border-success-DEFAULT/20',
    cancelled: 'bg-danger-bg text-danger-text border-danger-DEFAULT/20',
    brand: 'bg-brand-light text-brand border-brand/20',
    warning: 'bg-warning-bg text-warning-text border-warning-DEFAULT/20',
    danger: 'bg-danger-bg text-danger-text border-danger-DEFAULT/20',
    info: 'bg-info-bg text-info-text border-info-DEFAULT/20',
    success: 'bg-success-bg text-success-text border-success-DEFAULT/20',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  }[variant]

  const dotColors = {
    draft: 'bg-gray-400',
    confirmed: 'bg-info-DEFAULT',
    ready: 'bg-warning-DEFAULT',
    done: 'bg-success-DEFAULT',
    cancelled: 'bg-danger-DEFAULT',
    brand: 'bg-brand',
    warning: 'bg-warning-DEFAULT',
    danger: 'bg-danger-DEFAULT',
    info: 'bg-info-DEFAULT',
    success: 'bg-success-DEFAULT',
    neutral: 'bg-gray-400',
  }[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border leading-none tracking-tight select-none',
        variantStyles,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors)} />}
      <span>{children}</span>
    </span>
  )
}
