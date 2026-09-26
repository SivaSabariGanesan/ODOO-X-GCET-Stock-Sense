import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/schemas/auth'
import { zodResolver } from '@/lib/zodResolver'
import { useAuth } from '../context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RecoveryStepper } from '../components/RecoveryStepper'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { setPendingOtpEmail, user } = useAuth()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: user?.email || '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setFormError(null)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setPendingOtpEmail(data.email)
      toast.success('Code Dispatched', `A 6-digit recovery OTP has been sent to ${data.email}`)
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`)
    } catch {
      setFormError('Failed to dispatch recovery code. Please check the email address.')
      toast.error('Dispatch Failed', 'Unable to send verification code.')
    }
  }

  const fillDemoEmail = () => {
    setValue('email', 'alex.mercer@stocksense.io', { shouldValidate: true })
    setFormError(null)
    toast.info('Demo Email Filled', 'Click "Send Verification Code" to test OTP flow')
  }

  return (
    <AuthLayout
      title="Recover Password"
      subtitle="Follow the 3-step security procedure to verify your identity and reset your credentials"
      badgeText="SECURITY-FLOW"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Progress Stepper */}
        <RecoveryStepper currentStep={1} />

        {formError && (
          <div className="p-3 rounded bg-danger-bg border border-danger-DEFAULT/20 text-xs text-danger-text flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="Registered Work Email"
          type="email"
          autoComplete="email"
          placeholder="operator@company.com"
          required
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          hint="We will send a 6-digit OTP valid for 2 minutes."
          {...register('email')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            size="md"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Send Verification Code
          </Button>
        </div>

        <button
          type="button"
          onClick={fillDemoEmail}
          className="w-full py-1 text-xs text-brand hover:text-brand-dark text-center hover:underline cursor-pointer font-medium"
        >
          Use demo email (alex.mercer@stocksense.io)
        </button>

        <div className="pt-3 border-t border-gray-200 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-brand font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
