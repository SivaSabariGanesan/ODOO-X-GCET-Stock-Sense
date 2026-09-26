import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'
import { Lock, CheckCircle2, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { resetPasswordSchema, ResetPasswordFormData } from '@/schemas/auth'
import { useAuth } from '../context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = watch('password')

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setFormError(null)
      await resetPassword(data.password)
      setIsSuccess(true)
    } catch {
      setFormError('Failed to reset password. Please try again.')
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Updated"
        subtitle="Your operator credentials have been successfully updated"
      >
        <div className="py-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-success-bg border border-success-DEFAULT/20 flex items-center justify-center mx-auto text-success-DEFAULT">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-heading font-semibold text-gray-900">
              Security Credentials Refreshed
            </h2>
            <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
              Your new password is now active across all StockSense terminal instances.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              className="w-full"
              size="md"
              onClick={() => navigate('/login')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Sign In
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Define a secure authentication key for your StockSense operator profile"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Step Indicator Header */}
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
          <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
          <span>Step 3 of 3: Set your new password</span>
        </div>

        {formError && (
          <div className="p-3 rounded bg-danger-bg border border-danger-DEFAULT/20 text-xs text-danger-text flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="New Password"
          isPassword
          autoComplete="new-password"
          placeholder="Enter new password"
          required
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          {...register('password')}
        />

        {/* Password Strength Checklist */}
        {passwordValue && (
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Password Security Rules:
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className={passwordValue.length >= 8 ? 'text-success-text font-medium' : 'text-gray-500'}>
                {passwordValue.length >= 8 ? '✓' : '○'} Min 8 characters
              </span>
              <span className={/[A-Z]/.test(passwordValue) ? 'text-success-text font-medium' : 'text-gray-500'}>
                {/[A-Z]/.test(passwordValue) ? '✓' : '○'} One uppercase letter
              </span>
              <span className={/[0-9]/.test(passwordValue) ? 'text-success-text font-medium' : 'text-gray-500'}>
                {/[0-9]/.test(passwordValue) ? '✓' : '○'} One numeric digit
              </span>
            </div>
          </div>
        )}

        <Input
          label="Confirm New Password"
          isPassword
          autoComplete="new-password"
          placeholder="Re-enter new password"
          required
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            size="md"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Update Password & Finish
          </Button>
        </div>

        <div className="pt-3 border-t border-gray-200 text-center">
          <Link
            to="/login"
            className="text-xs text-gray-600 hover:text-brand font-medium hover:underline"
          >
            Cancel and Return to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
