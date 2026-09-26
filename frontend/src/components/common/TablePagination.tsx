import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export interface TablePaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  itemLabel?: string
  className?: string
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'records',
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3 select-none',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="text-slate-900 font-mono">{startItem}</strong> to{' '}
          <strong className="text-slate-900 font-mono">{endItem}</strong> of{' '}
          <strong className="text-slate-900 font-mono">{totalItems}</strong> {itemLabel}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 h-7"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
            Previous
          </Button>

          <div className="flex items-center gap-1 px-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={cn(
                  'w-6 h-6 rounded text-xs font-mono font-medium transition-colors cursor-pointer',
                  page === currentPage
                    ? 'bg-brand text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-200/70'
                )}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Go to page ${page}`}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="xs"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-2 h-7"
            aria-label="Next page"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
