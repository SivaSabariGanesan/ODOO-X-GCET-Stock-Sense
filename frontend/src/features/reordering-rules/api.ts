/**
 * Reordering Rules API Client
 *
 * Strongly-typed API client matching the backend Reordering Rules routes:
 *  - GET /api/reordering-rules (list rules with pagination, search, filters)
 *  - GET /api/reordering-rules/:id (fetch single rule by ID)
 *  - POST /api/reordering-rules (create reordering rule)
 *  - PATCH /api/reordering-rules/:id (update reordering rule)
 *  - DELETE /api/reordering-rules/:id (delete reordering rule)
 */
import { apiClient } from '../../lib/apiClient'
import {
  ApiReorderRule,
  ApiListReorderRulesResponse,
  ApiReorderRuleResponse,
  CreateReorderRulePayload,
  UpdateReorderRulePayload,
  ListReorderRulesParams,
} from './types'

export const reorderingRulesApi = {
  /**
   * GET /api/reordering-rules
   * List reordering rules with pagination, search, warehouse, location, product, and status filtering.
   */
  list(params: ListReorderRulesParams = {}): Promise<ApiListReorderRulesResponse> {
    return apiClient.get<ApiListReorderRulesResponse>('/api/reordering-rules', {
      page: params.page,
      limit: params.limit,
      productId: params.productId,
      locationId: params.locationId,
      warehouseId: params.warehouseId,
      search: params.search,
      isActive: params.isActive,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
  },

  /**
   * GET /api/reordering-rules/:id
   * Fetch a single reordering rule by ID.
   */
  async getById(id: string): Promise<ApiReorderRule> {
    const res = await apiClient.get<ApiReorderRuleResponse>(`/api/reordering-rules/${id}`)
    return res.data
  },

  /**
   * POST /api/reordering-rules
   * Create a new reordering rule record.
   */
  async create(payload: CreateReorderRulePayload): Promise<ApiReorderRule> {
    const body: Record<string, unknown> = {
      productId: payload.productId,
      locationId: payload.locationId,
      minQuantity: payload.minQuantity !== undefined ? String(payload.minQuantity) : '0',
      maxQuantity: payload.maxQuantity != null ? String(payload.maxQuantity) : null,
      reorderQty: payload.reorderQty !== undefined ? String(payload.reorderQty) : '1',
      isActive: payload.isActive ?? true,
    }
    const res = await apiClient.post<ApiReorderRuleResponse>('/api/reordering-rules', body)
    return res.data
  },

  /**
   * PATCH /api/reordering-rules/:id
   * Update reordering rule fields.
   */
  async update(id: string, payload: UpdateReorderRulePayload): Promise<ApiReorderRule> {
    const body: Record<string, unknown> = {}
    if (payload.productId !== undefined) body.productId = payload.productId
    if (payload.locationId !== undefined) body.locationId = payload.locationId
    if (payload.minQuantity !== undefined) body.minQuantity = String(payload.minQuantity)
    if (payload.maxQuantity !== undefined) {
      body.maxQuantity = payload.maxQuantity != null ? String(payload.maxQuantity) : null
    }
    if (payload.reorderQty !== undefined) body.reorderQty = String(payload.reorderQty)
    if (payload.isActive !== undefined) body.isActive = payload.isActive

    const res = await apiClient.patch<ApiReorderRuleResponse>(`/api/reordering-rules/${id}`, body)
    return res.data
  },

  /**
   * DELETE /api/reordering-rules/:id
   * Delete a reordering rule record.
   */
  delete(
    id: string
  ): Promise<{ success: boolean; message: string; mode?: 'deleted' }> {
    return apiClient.delete<{ success: boolean; message: string; mode?: 'deleted' }>(
      `/api/reordering-rules/${id}`
    )
  },

  /**
   * Helper: Fetch products for rule creation/editing dropdowns.
   */
  async getProductsMaster(): Promise<Array<{ id: string; name: string; sku: string }>> {
    const res = await apiClient.get<{ data: Array<{ id: string; name: string; sku: string }> }>(
      '/api/products'
    )
    return res.data || []
  },

  /**
   * Helper: Fetch locations for rule creation/editing dropdowns.
   */
  async getLocationsMaster(): Promise<
    Array<{ id: string; name: string; fullPath?: string; warehouseId?: string }>
  > {
    const res = await apiClient.get<{
      data: Array<{ id: string; name: string; fullPath?: string; warehouseId?: string }>
    }>('/api/locations')
    return res.data || []
  },

  /**
   * Helper: Fetch warehouses for filter dropdowns.
   */
  async getWarehousesMaster(): Promise<Array<{ id: string; name: string; shortCode?: string }>> {
    const res = await apiClient.get<{
      data: Array<{ id: string; name: string; shortCode?: string }>
    }>('/api/warehouses')
    return res.data || []
  },
}
