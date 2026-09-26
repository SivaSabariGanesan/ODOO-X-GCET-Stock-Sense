import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { User as UserIcon, Mail, Lock, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { signupSchema, SignupFormData } from '@/schemas/auth'
import { zodResolver } from '@/lib/zodResolver'
import { useAuth } from '../context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  })

  const passwordValue = watch('password')

  const onSubmit = async (data: SignupFormData) => {
    try {
      setFormError(null)
      await signup(data.name, data.email, data.password)
      toast.success('Account Created', `Welcome to StockSense, ${data.name}!`)
      setIsSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1400)
    } catch {
      setFormError('Account creation could not be completed. Please try again.')
      toast.error('Registration Error', 'Failed to register account.')
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Account Provisioned"
        subtitle="Your operator credentials have been configured"
      >
        <div className="py-6 text-center space-y-4 animate-[fadeIn_200ms_ease-out]">
          <div className="w-12 h-12 rounded-full bg-success-bg border border-success-DEFAULT/30 flex items-center justify-center mx-auto text-success-DEFAULT shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-heading font-semibold text-gray-900">
              Welcome to StockSense Terminal
            </h2>
            <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
              Operator profile assigned to <strong>WH01 (Main Central Hub)</strong>. Redirecting you to the live dashboard...
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Enter Dashboard Now
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Register Operator"
      subtitle="Create a verified account for warehouse and stock management access"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {formError && (
          <div className="p-3 rounded bg-danger-bg border border-danger-DEFAULT/20 text-xs text-danger-text flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="Full Name"
          type="text"
          placeholder="e.g. Marcus Vance"
          required
          leftIcon={<UserIcon className="w-4 h-4" />}
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Work Email Address"
          type="email"
          autoComplete="email"
          placeholder="m.vance@company.com"
          required
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1.5">
          <Input
            label="Password"
            isPassword
            autoComplete="new-password"
            placeholder="At least 8 chars, 1 uppercase, 1 number"
            required
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        <Input
          label="Confirm Password"
          isPassword
          autoComplete="new-password"
          placeholder="Repeat your password"
          required
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="pt-1">
          <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-gray-300 text-brand focus:ring-brand focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
              {...register('termsAccepted')}
            />
            <span>
              I agree to the StockSense{' '}
              <a href="#terms" className="text-brand hover:underline font-medium">
                Operational Terms
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-brand hover:underline font-medium">
                Security Policy
              </a>
            </span>
          </label>
          {errors.termsAccepted && (
            <p className="text-xs text-danger-text mt-1 font-medium">
              • {errors.termsAccepted.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            size="md"
            isLoading={isSubmitting}
            rightIcon={<UserPlus className="w-4 h-4" />}
          >
            Create Operator Account
          </Button>
        </div>

        <div className="pt-3 border-t border-gray-200 text-center text-xs text-gray-600">
          <span>Already registered? </span>
          <Link
            to="/login"
            className="text-brand hover:text-brand-dark font-semibold hover:underline"
          >
            Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
