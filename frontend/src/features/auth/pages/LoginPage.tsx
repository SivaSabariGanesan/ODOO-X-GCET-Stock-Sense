import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, LogIn, Sparkles, AlertCircle } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { loginSchema, LoginFormData } from '@/schemas/auth'
import { zodResolver } from '@/lib/zodResolver'
import { useAuth } from '../context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setFormError(null)
      await login(data.email, data.password)
      toast.success('Authentication Successful', `Welcome back, ${data.email.split('@')[0]}`)
      navigate('/dashboard')
    } catch {
      setFormError('Authentication failed. Please verify your operator credentials.')
      toast.error('Authentication Error', 'Invalid email or password.')
    }
  }

  const fillDemoCredentials = () => {
    setValue('email', 'alex.mercer@stocksense.io', { shouldValidate: true })
    setValue('password', 'StockSense2026!', { shouldValidate: true })
    setFormError(null)
    toast.info('Demo Credentials Loaded', 'Click "Sign In" or press Enter to continue')
  }

  return (
    <AuthLayout
      title="Operator Sign In"
      subtitle="Authenticate to access warehouse stock balances, receipts, and dispatches"
      badgeText="TERMINAL-ONLINE"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && (
          <div className="p-3 rounded bg-danger-bg border border-danger-DEFAULT/20 text-xs text-danger-text flex items-start gap-2 animate-[fadeIn_150ms_ease-out]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger-DEFAULT" />
            <div className="flex-1">
              <span className="font-semibold">Sign in error:</span> {formError}
            </div>
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
          {...register('email')}
        />

        <div className="space-y-1">
          <Input
            label="Security Password"
            isPassword
            autoComplete="current-password"
            placeholder="••••••••••••"
            required
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-brand focus:ring-brand focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
              {...register('rememberMe')}
            />
            <span>Remember this device</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-brand hover:text-brand-dark font-medium hover:underline text-xs"
          >
            Forgot Password?
          </Link>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            size="md"
            isLoading={isSubmitting}
            rightIcon={<LogIn className="w-4 h-4" />}
          >
            Sign In to Terminal
          </Button>
        </div>

        {/* Demo Credentials Helper Card */}
        <div className="pt-1">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="w-full py-2 px-3 rounded border border-dashed border-brand/40 bg-brand-light/30 hover:bg-brand-light/60 text-xs text-brand font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span>Auto-fill Demo Operator Credentials</span>
          </button>
        </div>

        {/* Sign Up Redirect */}
        <div className="pt-3 border-t border-gray-200 text-center text-xs text-gray-600">
          <span>Need an operator account? </span>
          <Link
            to="/signup"
            className="text-brand hover:text-brand-dark font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
