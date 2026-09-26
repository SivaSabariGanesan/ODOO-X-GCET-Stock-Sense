import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'outline'
  size?: 'sm' | 'md' | 'lg'
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
      sm: 'px-2.5 py-1 text-xs gap-1.5 rounded',
      md: 'px-3.5 py-1.5 text-sm gap-2 rounded font-medium',
      lg: 'px-4.5 py-2.5 text-base gap-2 rounded-md font-semibold',
    }[size]

    const variantClasses = {
      primary:
        'bg-brand text-white border border-brand/90 hover:bg-brand-dark hover:border-brand-dark active:bg-brand-dark active:scale-[0.99] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.06)]',
      secondary:
        'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 active:bg-gray-100 shadow-xs',
      outline:
        'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 shadow-xs',
      ghost:
        'bg-transparent text-brand border border-transparent hover:bg-brand-light active:bg-brand-light/80',
      danger:
        'bg-danger-DEFAULT text-white border border-danger-DEFAULT/90 hover:bg-red-700 active:bg-red-800 shadow-xs',
      link: 'bg-transparent text-brand hover:underline hover:text-brand-dark p-0 h-auto border-0 shadow-none font-normal',
    }[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded transition-all duration-150 cursor-pointer select-none',
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
