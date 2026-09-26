import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive' | 'link' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'px-2 py-1 text-[11px] gap-1 rounded font-medium',
      sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-md font-medium',
      md: 'px-3.5 py-2 text-sm gap-2 rounded-md font-medium',
      lg: 'px-4.5 py-2.5 text-base gap-2 rounded-md font-semibold',
    }[size]

    const variantClasses = {
      primary:
        'bg-brand text-white border border-brand hover:bg-brand-dark hover:border-brand-dark active:bg-brand-dark shadow-2xs font-medium',
      secondary:
        'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-2xs font-medium',
      outline:
        'bg-transparent text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-2xs',
      ghost:
        'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:bg-slate-200/50',
      danger:
        'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-2xs',
      destructive:
        'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-2xs',
      link: 'bg-transparent text-brand hover:underline hover:text-brand-dark p-0 h-auto border-0 shadow-none font-normal',
    }[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
