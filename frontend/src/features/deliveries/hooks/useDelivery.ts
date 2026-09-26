/**
 * useDelivery — data hook for the delivery detail page.
 *
 * Handles:
 *  - Fetching a single delivery by ID from GET /api/deliveries/:id
 *  - Loading / error / not-found state
 *  - Status action dispatchers: pick, pack, validate, process (dispatch), cancel
 *  - Local state update after successful actions
 */
import { useState, useEffect, useCallback } from 'react'
import { deliveriesApi, ApiDelivery } from '../api'
import { ApiError } from '@/lib/apiClient'

interface UseDeliveryReturn {
  delivery: ApiDelivery | null
  isLoading: boolean
  error: string | null
  isActioning: boolean
  pick: () => Promise<ApiDelivery>
  pack: () => Promise<ApiDelivery>
  validate: () => Promise<ApiDelivery>
  process: () => Promise<ApiDelivery>
  cancel: () => Promise<ApiDelivery>
  refetch: () => void
}

export function useDelivery(id: string | undefined): UseDeliveryReturn {
  const [delivery, setDelivery] = useState<ApiDelivery | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  const fetchDelivery = useCallback(async () => {
    if (!id) {
      setIsLoading(false)
      setError('No delivery ID provided')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await deliveriesApi.getById(id)
      setDelivery(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('not_found')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load delivery. Please check your connection.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDelivery()
  }, [fetchDelivery])

  /** Pick delivery → transitions to WAITING */
  const pick = useCallback(async () => {
    if (!delivery) throw new Error('No delivery loaded')
    setIsActioning(true)
    try {
      const updated = await deliveriesApi.pick(delivery.id)
      setDelivery(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [delivery])

  /** Pack delivery → transitions to READY */
  const pack = useCallback(async () => {
    if (!delivery) throw new Error('No delivery loaded')
    setIsActioning(true)
    try {
      const updated = await deliveriesApi.pack(delivery.id)
      setDelivery(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [delivery])

  /** Validate delivery document → transitions to READY */
  const validate = useCallback(async () => {
    if (!delivery) throw new Error('No delivery loaded')
    setIsActioning(true)
    try {
      const updated = await deliveriesApi.validate(delivery.id)
      setDelivery(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [delivery])

  /** Process / Dispatch → decreases stock and transitions to DONE */
  const process = useCallback(async () => {
    if (!delivery) throw new Error('No delivery loaded')
    setIsActioning(true)
    try {
      const updated = await deliveriesApi.process(delivery.id)
      setDelivery(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [delivery])

  /** Cancel delivery */
  const cancel = useCallback(async () => {
    if (!delivery) throw new Error('No delivery loaded')
    setIsActioning(true)
    try {
      const updated = await deliveriesApi.cancel(delivery.id)
      setDelivery(updated)
      return updated
    } finally {
      setIsActioning(false)
    }
  }, [delivery])

  return {
    delivery,
    isLoading,
    error,
    isActioning,
    pick,
    pack,
    validate,
    process,
    cancel,
    refetch: fetchDelivery,
  }
}
