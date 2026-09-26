import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'
import { User as UserIcon, Mail, Lock, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { signupSchema, SignupFormData } from '@/schemas/auth'
import { useAuth } from '../context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
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
      setIsSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1200)
    } catch {
      setFormError('Account creation could not be completed. Please try again.')
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Account Registered"
        subtitle="Your operator credentials have been provisioned"
      >
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-success-bg border border-success-DEFAULT/20 flex items-center justify-center mx-auto text-success-DEFAULT">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-heading font-semibold text-gray-900">
              Welcome to StockSense
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Redirecting you to the warehouse operations dashboard...
            </p>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Enter Dashboard Now
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create Operator Account"
      subtitle="Register a new warehouse manager or logistics associate account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
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

        {/* Password Strength Checklist */}
        {passwordValue && (
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Password Requirements:
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className={passwordValue.length >= 8 ? 'text-success-text font-medium' : 'text-gray-500'}>
                {passwordValue.length >= 8 ? '✓' : '○'} Min 8 characters
              </span>
              <span className={/[A-Z]/.test(passwordValue) ? 'text-success-text font-medium' : 'text-gray-500'}>
                {/[A-Z]/.test(passwordValue) ? '✓' : '○'} One uppercase letter
              </span>
              <span className={/[0-9]/.test(passwordValue) ? 'text-success-text font-medium' : 'text-gray-500'}>
                {/[0-9]/.test(passwordValue) ? '✓' : '○'} One number digit
              </span>
            </div>
          </div>
        )}

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
              className="mt-0.5 rounded border-gray-300 text-brand focus:ring-brand focus:ring-offset-0 w-3.5 h-3.5"
              {...register('termsAccepted')}
            />
            <span>
              I agree to the StockSense{' '}
              <a href="#terms" className="text-brand hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-brand hover:underline">
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
            Create Account
          </Button>
        </div>

        <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-600">
          <span>Already registered? </span>
          <Link
            to="/login"
            className="text-brand hover:text-brand-dark font-medium hover:underline"
          >
            Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
