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
    confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
    ready: 'bg-amber-50 text-amber-700 border-amber-200',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    brand: 'bg-brand-light text-brand-dark border-brand/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  }[variant]

  const dotColors = {
    draft: 'bg-gray-400',
    confirmed: 'bg-sky-500',
    ready: 'bg-amber-500',
    done: 'bg-emerald-500',
    cancelled: 'bg-rose-500',
    brand: 'bg-brand',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    success: 'bg-emerald-500',
    neutral: 'bg-gray-400',
  }[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none tracking-tight select-none shadow-xs',
        variantStyles,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors)} />}
      <span>{children}</span>
    </span>
  )
}
