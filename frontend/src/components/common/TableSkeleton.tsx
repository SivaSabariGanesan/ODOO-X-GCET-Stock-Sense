import { cn } from '@/lib/cn'

export interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('w-full divide-y divide-slate-100 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="px-4 py-3 flex items-center gap-4">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={cn(
                'h-3.5 bg-slate-200/70 rounded',
                cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-44 flex-1' : 'w-20'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
