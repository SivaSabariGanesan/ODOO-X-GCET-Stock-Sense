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
      sm: 'px-2.5 py-1 text-xs gap-1.5',
      md: 'px-3.5 py-1.5 text-sm gap-2',
      lg: 'px-4 py-2 text-base gap-2',
    }[size]

    const variantClasses = {
      primary:
        'bg-brand text-white border border-brand hover:bg-brand-dark hover:border-brand-dark active:bg-brand-dark shadow-sm',
      secondary:
        'bg-gray-200 text-gray-800 border border-gray-300 hover:bg-gray-300 active:bg-gray-200 shadow-sm',
      outline:
        'bg-view text-gray-700 border border-gray-300 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 shadow-sm',
      ghost:
        'bg-transparent text-brand border border-transparent hover:bg-brand-light active:bg-brand-light',
      danger:
        'bg-danger-DEFAULT text-white border border-danger-DEFAULT hover:opacity-90 active:opacity-80 shadow-sm',
      link: 'bg-transparent text-brand hover:underline hover:text-brand-dark p-0 h-auto border-0 shadow-none font-normal',
    }[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded transition-colors duration-150 cursor-pointer select-none',
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
