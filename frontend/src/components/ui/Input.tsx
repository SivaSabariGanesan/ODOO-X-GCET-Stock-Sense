import { type InputHTMLAttributes, forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isPassword?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      required,
      leftIcon,
      rightIcon,
      type = 'text',
      isPassword = false,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-gray-700 select-none tracking-tight"
          >
            {label}
            {required && <span className="text-brand ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={cn(
              'w-full h-9 px-3 text-sm text-gray-800 bg-view border border-gray-300 rounded shadow-xs',
              'placeholder:text-gray-400 transition-all duration-150',
              'hover:border-gray-400',
              'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
              leftIcon && 'pl-9',
              (rightIcon || isPassword) && 'pr-10',
              error && 'border-danger-DEFAULT hover:border-danger-DEFAULT focus:border-danger-DEFAULT focus:ring-danger-DEFAULT/20',
              'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute right-3 flex items-center pointer-events-none text-gray-400">
                {rightIcon}
              </div>
            )
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-[11px] text-danger-text flex items-center gap-1 font-medium animate-[fadeIn_100ms_ease-out]">
            <span className="w-1 h-1 rounded-full bg-danger-DEFAULT inline-block shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-[11px] text-gray-500 leading-normal">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
