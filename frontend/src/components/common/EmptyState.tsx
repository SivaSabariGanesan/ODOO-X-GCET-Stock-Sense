import { ReactNode, isValidElement } from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  icon: LucideIcon | ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: IconOrElement,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'py-12 px-4 text-center max-w-sm mx-auto flex flex-col items-center justify-center space-y-2',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
        {isValidElement(IconOrElement) ? (
          IconOrElement
        ) : typeof IconOrElement === 'function' ? (
          <IconOrElement className="w-5 h-5" />
        ) : null}
      </div>
      <h3 className="text-xs font-bold text-slate-800 font-heading">
        {title}
      </h3>
      <p className="text-[11.5px] text-slate-500 leading-normal">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          variant="secondary"
          size="xs"
          onClick={onAction}
          className="mt-3"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
