/**
 * useReorderingRules — data hook for Reordering Rules list, search, filters, pagination, and mutations.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { reorderingRulesApi } from '../api'
import {
  ApiReorderRule,
  ApiPagination,
  CreateReorderRulePayload,
  UpdateReorderRulePayload,
} from '../types'
import { ApiError } from '../../../lib/apiClient'

export interface UseReorderingRulesOptions {
  search?: string
  warehouseId?: string
  locationId?: string
  productId?: string
  status?: 'all' | 'active' | 'inactive'
  pageSize?: number
}

export interface UseReorderingRulesReturn {
  rules: ApiReorderRule[]
  pagination: ApiPagination | null
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
  createRule: (payload: CreateReorderRulePayload) => Promise<ApiReorderRule>
  updateRule: (id: string, payload: UpdateReorderRulePayload) => Promise<ApiReorderRule>
  deleteRule: (id: string) => Promise<{ success: boolean; message: string; mode?: 'deleted' }>
  toggleActiveRule: (rule: ApiReorderRule) => Promise<ApiReorderRule>
}

export function useReorderingRules(
  options: UseReorderingRulesOptions = {}
): UseReorderingRulesReturn {
  const {
    search = '',
    warehouseId = 'all',
    locationId = 'all',
    productId = 'all',
    status = 'all',
    pageSize = 15,
  } = options

  const [rules, setRules] = useState<ApiReorderRule[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchId = useRef(0)

  const fetchRules = useCallback(
    async (page: number) => {
      const id = ++fetchId.current
      setIsLoading(true)
      setError(null)

      try {
        const isActiveParam =
          status === 'active' ? true : status === 'inactive' ? false : undefined

        const res = await reorderingRulesApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          warehouseId: warehouseId !== 'all' ? warehouseId : undefined,
          locationId: locationId !== 'all' ? locationId : undefined,
          productId: productId !== 'all' ? productId : undefined,
          isActive: isActiveParam,
        })

        if (id !== fetchId.current) return

        setRules(res.data)
        setPagination(res.pagination)
      } catch (err) {
        if (id !== fetchId.current) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load reordering rules. Please check your connection.')
        }
      } finally {
        if (id === fetchId.current) {
          setIsLoading(false)
        }
      }
    },
    [search, warehouseId, locationId, productId, status, pageSize]
  )

  // Debounce search input and handle immediate filter shifts
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const delay = search ? 350 : 0
    debounceTimer.current = setTimeout(() => {
      setCurrentPage(1)
      fetchRules(1)
    }, delay)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search, warehouseId, locationId, productId, status, pageSize, fetchRules])

  // Re-fetch on page navigation
  useEffect(() => {
    fetchRules(currentPage)
  }, [currentPage, fetchRules])

  const refetch = useCallback(() => {
    fetchRules(currentPage)
  }, [fetchRules, currentPage])

  const createRule = useCallback(
    async (payload: CreateReorderRulePayload): Promise<ApiReorderRule> => {
      const created = await reorderingRulesApi.create(payload)
      refetch()
      return created
    },
    [refetch]
  )

  const updateRule = useCallback(
    async (id: string, payload: UpdateReorderRulePayload): Promise<ApiReorderRule> => {
      const updated = await reorderingRulesApi.update(id, payload)
      refetch()
      return updated
    },
    [refetch]
  )

  const deleteRule = useCallback(
    async (
      id: string
    ): Promise<{ success: boolean; message: string; mode?: 'deleted' }> => {
      const result = await reorderingRulesApi.delete(id)
      refetch()
      return result
    },
    [refetch]
  )

  const toggleActiveRule = useCallback(
    async (rule: ApiReorderRule): Promise<ApiReorderRule> => {
      const updated = await reorderingRulesApi.update(rule.id, {
        isActive: !rule.isActive,
      })
      refetch()
      return updated
    },
    [refetch]
  )

  return {
    rules,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    createRule,
    updateRule,
    deleteRule,
    toggleActiveRule,
  }
}
