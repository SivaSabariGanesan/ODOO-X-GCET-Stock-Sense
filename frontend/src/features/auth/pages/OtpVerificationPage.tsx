import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, CheckCircle2, RotateCw, Clock, AlertTriangle } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

const INITIAL_EXPIRATION_SECONDS = 120 // 2 minutes

export function OtpVerificationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { pendingOtpEmail, verifyOtp, forgotPassword, debugOtp } = useAuth()

  // Target email from query param or auth context or fallback
  const email = searchParams.get('email') || pendingOtpEmail || 'operator@company.com'

  // 6 separate digits
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Expiration countdown
  const [timeLeft, setTimeLeft] = useState(INITIAL_EXPIRATION_SECONDS)
  const [isExpired, setIsExpired] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Status and error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null)
    setResendSuccess(false)

    // Handle single digit
    const cleaned = value.replace(/\D/g, '')

    if (cleaned.length === 0) {
      // Cleared
      const newDigits = [...otpDigits]
      newDigits[index] = ''
      setOtpDigits(newDigits)
      return
    }

    // If pasted or typed multiple digits
    if (cleaned.length > 1) {
      handlePastedCode(cleaned)
      return
    }

    const singleDigit = cleaned.slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = singleDigit
    setOtpDigits(newDigits)

    // Move to next input if available
    if (index < 5 && singleDigit) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePastedCode = (pasted: string) => {
    const digits = pasted.replace(/\D/g, '').slice(0, 6).split('')
    if (digits.length === 0) return

    const newDigits = [...otpDigits]
    digits.forEach((digit, i) => {
      if (i < 6) newDigits[i] = digit
    })
    setOtpDigits(newDigits)

    const nextIndex = Math.min(digits.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    handlePastedCode(text)
  }

  const fullCode = otpDigits.join('')

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (fullCode.length < 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.')
      return
    }

    if (isExpired) {
      setErrorMessage('Verification code has expired. Please click "Resend Code" to generate a fresh OTP.')
      return
    }

    setIsVerifying(true)
    setErrorMessage(null)

    const result = await verifyOtp(fullCode)
    setIsVerifying(false)

    if (result.success) {
      navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(fullCode)}`)
    } else {
      setErrorMessage(result.error || 'Invalid verification code. Please check and try again.')
    }
  }

  const handleResendOtp = async () => {
    setIsResending(true)
    setErrorMessage(null)
    setResendSuccess(false)

    const res = await forgotPassword(email)
    setIsResending(false)

    if (res.success) {
      setTimeLeft(INITIAL_EXPIRATION_SECONDS)
      setIsExpired(false)
      setOtpDigits(['', '', '', '', '', ''])
      setResendSuccess(true)
      inputRefs.current[0]?.focus()
    } else {
      setErrorMessage(res.error || 'Failed to dispatch fresh verification code.')
    }
  }

  const fillValidCode = () => {
    if (debugOtp && debugOtp.length === 6) {
      setOtpDigits(debugOtp.split(''))
    } else {
      setOtpDigits(['1', '2', '3', '4', '5', '6'])
    }
    setErrorMessage(null)
    setTimeLeft(INITIAL_EXPIRATION_SECONDS)
    setIsExpired(false)
  }

  const fillInvalidCode = () => {
    setOtpDigits(['0', '0', '0', '0', '0', '0'])
    setErrorMessage(null)
  }

  return (
    <AuthLayout
      title="Verify Six-Digit OTP"
      subtitle="Enter the one-time authentication code dispatched to your email address"
    >
      <div className="space-y-4">
        {/* Recipient Details Card */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs flex items-center justify-between">
          <div className="truncate">
            <span className="text-gray-500">Sent code to: </span>
            <span className="font-mono font-medium text-gray-800">{email}</span>
          </div>
          <Link
            to="/forgot-password"
            className="text-brand hover:underline font-medium text-[11px] shrink-0 ml-2"
          >
            Change
          </Link>
        </div>

        {/* Error State Banner */}
        {errorMessage && (
          <div className="p-3 rounded bg-danger-bg border border-danger-DEFAULT/30 text-xs text-danger-text flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-danger-DEFAULT" />
            <div className="flex-1">
              <span className="font-medium">Verification Failed:</span> {errorMessage}
            </div>
          </div>
        )}

        {/* Resend Success Banner */}
        {resendSuccess && (
          <div className="p-3 rounded bg-success-bg border border-success-DEFAULT/20 text-xs text-success-text flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-success-DEFAULT" />
            <span>A new six-digit verification code has been dispatched.</span>
          </div>
        )}

        {/* OTP Input Fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">
              One-Time Passcode (6 Digits)
            </label>
            <span className="text-[11px] text-gray-400 font-mono">
              Auto-advancing
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 sm:gap-2 w-full" onPaste={handlePaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                disabled={isExpired}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={cn(
                  'flex-1 min-w-[34px] max-w-[48px] h-12 sm:h-13 text-center text-lg sm:text-xl font-mono font-bold rounded border shadow-xs transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand',
                  errorMessage
                    ? 'border-red-400 bg-red-50/50 text-red-700 focus:ring-red-300'
                    : digit
                      ? 'border-brand bg-brand-light/40 text-gray-900 shadow-xs'
                      : 'border-gray-300 bg-view text-gray-900 hover:border-gray-400',
                  isExpired && 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                )}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Expiration and Resend Controls */}
        <div className="p-3 bg-view border border-gray-200 rounded flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className={cn('w-3.5 h-3.5', isExpired ? 'text-danger-DEFAULT' : 'text-gray-500')} />
            {isExpired ? (
              <Badge variant="danger" dot className="text-[11px]">
                CODE EXPIRED
              </Badge>
            ) : (
              <span className="text-gray-600">
                Expires in:{' '}
                <span className="font-mono font-semibold text-gray-900">
                  {formatTime(timeLeft)}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isResending}
            className="inline-flex items-center gap-1 font-medium text-brand hover:text-brand-dark hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCw className={cn('w-3 h-3', isResending && 'animate-spin')} />
            <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
          </button>
        </div>

        {/* Submit Verification */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={() => handleVerify()}
            className="w-full"
            size="md"
            isLoading={isVerifying}
            disabled={fullCode.length < 6 || isExpired}
            rightIcon={<ShieldAlert className="w-4 h-4" />}
          >
            Verify & Proceed
          </Button>
        </div>

        {/* Quick Testing Shortcuts */}
        <div className="pt-2 border-t border-dashed border-gray-200 space-y-1.5">
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider text-center">
            UI Test Simulation:
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fillValidCode}
              className="flex-1 py-1 px-2 text-center text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-700 transition-colors cursor-pointer"
            >
              Fill Valid OTP (<span className="font-mono font-semibold">123456</span>)
            </button>
            <button
              type="button"
              onClick={fillInvalidCode}
              className="flex-1 py-1 px-2 text-center text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-danger-text transition-colors cursor-pointer"
            >
              Test Invalid State (<span className="font-mono font-semibold">000000</span>)
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-2 text-center">
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-brand font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Email Input</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
