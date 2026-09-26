import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn — Class Name utility
 * =======================
 * Combines clsx (conditional class logic) with tailwind-merge
 * (intelligent deduplication of Tailwind utility conflicts).
 *
 * Usage:
 *   cn('px-4 py-2', condition && 'bg-brand', 'px-2')
 *   → 'py-2 bg-brand px-2'  (px-4 overridden by px-2 via twMerge)
 *
 * Use this instead of raw template literals whenever merging
 * Tailwind classes — it prevents silent class conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
