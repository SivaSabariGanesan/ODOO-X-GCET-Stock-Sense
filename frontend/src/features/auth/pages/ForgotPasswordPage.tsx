import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'
import { Mail, ArrowRight, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/schemas/auth'
import { useAuth } from '../context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { setPendingOtpEmail, user } = useAuth()
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
      // Simulate network request for sending OTP
      await new Promise((resolve) => setTimeout(resolve, 600))
      setPendingOtpEmail(data.email)
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`)
    } catch {
      setFormError('Failed to dispatch recovery code. Please check the email address.')
    }
  }

  const fillDemoEmail = () => {
    setValue('email', 'alex.mercer@stocksense.io', { shouldValidate: true })
    setFormError(null)
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your verified work email to receive a six-digit verification code"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Step Indicator Header */}
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
          <KeyRound className="w-4 h-4 text-brand shrink-0" />
          <span>Step 1 of 3: Provide your operator email address</span>
        </div>

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
          hint="We will send a 6-digit recovery OTP valid for 5 minutes."
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
          className="w-full py-1 text-xs text-gray-500 hover:text-brand text-center hover:underline cursor-pointer"
        >
          Use demo email (alex.mercer@stocksense.io)
        </button>

        <div className="pt-4 border-t border-gray-200 text-center">
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
