/**
 * useReceipt — data hook for the receipt detail page.
 *
 * Handles:
 *  - Fetching a single receipt by ID from GET /api/receipts/:id
 *  - Loading / error / not-found state
 *  - Status action dispatchers: validate, process (receive), cancel
 *  - Local optimistic update after successful action
 */
import { useState, useEffect, useCallback } from 'react'
import { receiptsApi, ApiReceipt } from '../api'
import { ApiError } from '@/lib/apiClient'

interface UseReceiptReturn {
  receipt: ApiReceipt | null
  isLoading: boolean
  error: string | null
  isActioning: boolean
  validate: () => Promise<void>
  process: () => Promise<void>
  cancel: () => Promise<void>
  refetch: () => void
}

export function useReceipt(id: string | undefined): UseReceiptReturn {
  const [receipt, setReceipt] = useState<ApiReceipt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  const fetchReceipt = useCallback(async () => {
    if (!id) {
      setIsLoading(false)
      setError('No receipt ID provided')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await receiptsApi.getById(id)
      setReceipt(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('not_found')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load receipt. Please check your connection.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchReceipt()
  }, [fetchReceipt])

  /** Validate receipt → transitions to READY */
  const validate = useCallback(async () => {
    if (!receipt) return
    setIsActioning(true)
    try {
      const updated = await receiptsApi.validate(receipt.id)
      setReceipt(updated)
    } finally {
      setIsActioning(false)
    }
  }, [receipt])

  /** Process / Receive → transitions to DONE and creates stock movements */
  const process = useCallback(async () => {
    if (!receipt) return
    setIsActioning(true)
    try {
      const updated = await receiptsApi.process(receipt.id)
      setReceipt(updated)
    } finally {
      setIsActioning(false)
    }
  }, [receipt])

  /** Cancel receipt */
  const cancel = useCallback(async () => {
    if (!receipt) return
    setIsActioning(true)
    try {
      const updated = await receiptsApi.cancel(receipt.id)
      setReceipt(updated)
    } finally {
      setIsActioning(false)
    }
  }, [receipt])

  return {
    receipt,
    isLoading,
    error,
    isActioning,
    validate,
    process,
    cancel,
    refetch: fetchReceipt,
  }
}
