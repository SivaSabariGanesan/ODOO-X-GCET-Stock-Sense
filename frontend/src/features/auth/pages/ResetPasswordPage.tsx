import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, CheckCircle2, ArrowRight, AlertCircle, ShieldCheck, Check } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { resetPasswordSchema, ResetPasswordFormData } from '@/schemas/auth'
import { zodResolver } from '@/lib/zodResolver'
import { useAuth } from '../context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RecoveryStepper } from '../components/RecoveryStepper'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { resetPassword, verifiedOtp } = useAuth()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const otpParam = searchParams.get('otp') || verifiedOtp

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
  const confirmPasswordValue = watch('confirmPassword')
  const isMatch = Boolean(passwordValue && confirmPasswordValue && passwordValue === confirmPasswordValue)

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setFormError(null)
      if (!otpParam) {
        setFormError('Missing verification OTP. Please restart the password reset procedure.')
        return
      }
      await resetPassword(data.password, otpParam)
      toast.success('Password Updated', 'Your security credentials have been updated.')
      setIsSuccess(true)
    } catch (err: any) {
      const msg = err?.message || 'Failed to reset password. Please check your OTP and try again.'
      setFormError(msg)
      toast.error('Reset Failed', msg)
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Restored"
        subtitle="Your operator credentials have been refreshed across all terminal instances"
        badgeText="CREDENTIALS-ACTIVE"
      >
        <div className="py-6 text-center space-y-4 animate-[fadeIn_200ms_ease-out]">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-gray-900">
              Security Key Refreshed
            </h2>
            <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto leading-relaxed">
              Your new password is now active. You can now authenticate with your updated credentials on all warehouse terminal instances.
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
      subtitle="Finalize security recovery by establishing your new operator access key"
      badgeText="STEP-3-SECURE"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Recovery Stepper */}
        <RecoveryStepper currentStep={3} />

        {formError && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-[fadeIn_150ms_ease-out]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        <div className="space-y-2">
          <Input
            label="New Master Password"
            isPassword
            autoComplete="new-password"
            placeholder="Enter secure password"
            required
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        <div className="space-y-1">
          <Input
            label="Confirm New Password"
            isPassword
            autoComplete="new-password"
            placeholder="Re-enter password"
            required
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {confirmPasswordValue && (
            <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
              {isMatch ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Passwords match</span>
                </span>
              ) : (
                <span className="text-red-500 font-medium">
                  • Passwords do not match
                </span>
              )}
            </div>
          )}
        </div>

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
            className="text-xs text-gray-500 hover:text-brand font-medium hover:underline transition-colors"
          >
            Cancel and Return to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
