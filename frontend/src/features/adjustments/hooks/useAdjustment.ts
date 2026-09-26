/**
 * useAdjustment — data hook for the adjustment detail page.
 *
 * Handles:
 *  - Fetching a single adjustment by ID from GET /api/adjustments/:id
 *  - Loading / error / not-found state
 *  - Status action dispatchers: validate, process (apply stock), cancel
 *  - Live preview calculation
 *  - Local state update after successful actions
 */
import { useState, useEffect, useCallback } from 'react'
import { adjustmentsApi, ApiAdjustment, ApiAdjustmentPreviewResponse } from '../api'
import { ApiError } from '@/lib/apiClient'

interface UseAdjustmentReturn {
  adjustment: ApiAdjustment | null
  isLoading: boolean
  error: string | null
  isActioning: boolean
  validate: () => Promise<ApiAdjustment>
  process: () => Promise<ApiAdjustment>
  cancel: () => Promise<ApiAdjustment>
  getPreview: () => Promise<ApiAdjustmentPreviewResponse['data']>
  refetch: () => void
}

export function useAdjustment(id: string | undefined): UseAdjustmentReturn {
  const [adjustment, setAdjustment] = useState<ApiAdjustment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  const fetchAdjustment = useCallback(async () => {
    if (!id) {
      setIsLoading(false)
      setError('No adjustment ID provided')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await adjustmentsApi.getById(id)
      setAdjustment(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('not_found')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load inventory adjustment. Please check your connection.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAdjustment()
  }, [fetchAdjustment])

  /** Validate adjustment document → transitions status to READY */
  const validate = useCallback(async () => {
    if (!adjustment) throw new Error('No adjustment loaded')
    setIsActioning(true)
    try {
      const updated = await adjustmentsApi.validate(adjustment.id)
      setAdjustment(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [adjustment])

  /** Process / Apply adjustment → adjusts stock balances, logs ledger, transitions to DONE */
  const process = useCallback(async () => {
    if (!adjustment) throw new Error('No adjustment loaded')
    setIsActioning(true)
    try {
      const updated = await adjustmentsApi.process(adjustment.id)
      setAdjustment(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [adjustment])

  /** Cancel adjustment */
  const cancel = useCallback(async () => {
    if (!adjustment) throw new Error('No adjustment loaded')
    setIsActioning(true)
    try {
      const updated = await adjustmentsApi.cancel(adjustment.id)
      setAdjustment(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [adjustment])

  /** Live preview differences */
  const getPreview = useCallback(async () => {
    if (!adjustment) throw new Error('No adjustment loaded')
    return await adjustmentsApi.preview(adjustment.id)
  }, [adjustment])

  return {
    adjustment,
    isLoading,
    error,
    isActioning,
    validate,
    process,
    cancel,
    getPreview,
    refetch: fetchAdjustment,
  }
}
