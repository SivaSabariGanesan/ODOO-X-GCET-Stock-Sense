import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

interface RecoveryStepperProps {
  currentStep: 1 | 2 | 3
}

export function RecoveryStepper({ currentStep }: RecoveryStepperProps) {
  const steps = [
    { num: 1, label: 'Email' },
    { num: 2, label: 'Verify Code' },
    { num: 3, label: 'New Password' },
  ]

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-gray-200 -z-0" />

        {/* Active progress fill */}
        <div
          className="absolute top-1/2 left-6 -translate-y-1/2 h-0.5 bg-brand transition-all duration-300 -z-0"
          style={{
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : 'calc(100% - 3rem)',
          }}
        />

        {steps.map((step) => {
          const isCompleted = currentStep > step.num
          const isCurrent = currentStep === step.num

          return (
            <div key={step.num} className="flex flex-col items-center gap-1 z-10">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold transition-all duration-200 border-2 select-none',
                  isCompleted
                    ? 'bg-brand border-brand text-white'
                    : isCurrent
                    ? 'bg-view border-brand text-brand shadow-sm ring-2 ring-brand/20'
                    : 'bg-view border-gray-300 text-gray-400'
                )}
              >
                {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : step.num}
              </div>
              <span
                className={cn(
                  'text-[10px] tracking-tight font-medium select-none',
                  isCurrent ? 'text-gray-900 font-semibold' : isCompleted ? 'text-brand' : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
