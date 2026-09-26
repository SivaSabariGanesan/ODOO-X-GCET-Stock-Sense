import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, CheckCircle2, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
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
  const { resetPassword } = useAuth()
  const toast = useToast()
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
      toast.success('Password Updated', 'Your security credentials have been updated.')
      setIsSuccess(true)
    } catch {
      setFormError('Failed to reset password. Please try again.')
      toast.error('Reset Failed', 'Could not update password.')
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Restored"
        subtitle="Your operator credentials have been refreshed across all terminal instances"
        badgeText="CREDENTIALS-ACTIVE"
      >
        <div className="py-4 text-center space-y-4 animate-[fadeIn_200ms_ease-out]">
          <div className="w-12 h-12 rounded-full bg-success-bg border border-success-DEFAULT/30 flex items-center justify-center mx-auto text-success-DEFAULT shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-heading font-semibold text-gray-900">
              Security Credentials Refreshed
            </h2>
            <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
              Your new password is now active. You can now authenticate with your updated password on all terminal nodes.
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
      subtitle="Finalize step 3 by defining your new operator master security key"
      badgeText="STEP-3-SECURE"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Progress Stepper */}
        <RecoveryStepper currentStep={3} />

        {formError && (
          <div className="p-3 rounded bg-danger-bg border border-danger-DEFAULT/20 text-xs text-danger-text flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Input
            label="New Security Password"
            isPassword
            autoComplete="new-password"
            placeholder="Enter new password"
            required
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={passwordValue} />
        </div>

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
