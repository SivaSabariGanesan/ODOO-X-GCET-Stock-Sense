import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PasswordStrengthMeterProps {
  password?: string
}

export function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
  if (!password) return null

  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  const rulesPassed = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length

  const strengthConfig = [
    { label: 'Very Weak', color: 'bg-danger-DEFAULT', text: 'text-danger-text' },
    { label: 'Weak', color: 'bg-danger-DEFAULT', text: 'text-danger-text' },
    { label: 'Fair', color: 'bg-warning-DEFAULT', text: 'text-warning-text' },
    { label: 'Good', color: 'bg-info-DEFAULT', text: 'text-info-text' },
    { label: 'Strong', color: 'bg-success-DEFAULT', text: 'text-success-text' },
  ][rulesPassed]

  return (
    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-2 select-none">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500 font-medium">Password Strength:</span>
          <span className={cn('font-semibold', strengthConfig.text)}>
            {strengthConfig.label}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 h-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                'h-full rounded-full transition-colors duration-200',
                level <= rulesPassed ? strengthConfig.color : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Rules Checklist */}
      <div className="grid grid-cols-2 gap-1 text-[11px]">
        <div className={cn('flex items-center gap-1.5', hasMinLength ? 'text-success-text font-medium' : 'text-gray-500')}>
          {hasMinLength ? <Check className="w-3 h-3 text-success-DEFAULT stroke-[2.5]" /> : <X className="w-3 h-3 text-gray-400" />}
          <span>Min 8 characters</span>
        </div>
        <div className={cn('flex items-center gap-1.5', hasUppercase ? 'text-success-text font-medium' : 'text-gray-500')}>
          {hasUppercase ? <Check className="w-3 h-3 text-success-DEFAULT stroke-[2.5]" /> : <X className="w-3 h-3 text-gray-400" />}
          <span>One uppercase letter</span>
        </div>
        <div className={cn('flex items-center gap-1.5', hasNumber ? 'text-success-text font-medium' : 'text-gray-500')}>
          {hasNumber ? <Check className="w-3 h-3 text-success-DEFAULT stroke-[2.5]" /> : <X className="w-3 h-3 text-gray-400" />}
          <span>One numeric digit</span>
        </div>
        <div className={cn('flex items-center gap-1.5', hasSpecial ? 'text-success-text font-medium' : 'text-gray-500')}>
          {hasSpecial ? <Check className="w-3 h-3 text-success-DEFAULT stroke-[2.5]" /> : <X className="w-3 h-3 text-gray-400" />}
          <span>Special character (!@#$)</span>
        </div>
      </div>
    </div>
  )
}
