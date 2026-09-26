/**
 * Inventory Adjustments API Client
 *
 * Strongly-typed API client matching the backend Inventory Adjustments routes and schemas.
 * The backend status enum uses UPPERCASE (DRAFT, WAITING, READY, DONE, CANCELED).
 */
import { apiClient } from '../../lib/apiClient'

// ---------------------------------------------------------------------------
// Backend Response Types (mirrors backend/src/modules/adjustments/types.ts)
// ---------------------------------------------------------------------------

export type ApiAdjustmentStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED'

export interface ApiAdjustmentItem {
  id: string
  adjustmentId: string
  productId: string
  systemQuantity: string
  countedQuantity: string
  difference: string
  createdAt: string
  updatedAt: string
  product?: {
    id: string
    name: string
    sku: string
    uom?: {
      name?: string
      symbol?: string
      abbreviation?: string
    }
  }
}

export interface ApiAdjustment {
  id: string
  adjustmentNumber: string
  reason: string | null
  locationId: string
  status: ApiAdjustmentStatus
  createdBy: string | null
  validatedAt: string | null
  createdAt: string
  updatedAt: string
  location?: {
    id: string
    name: string
    fullPath: string
    warehouseId: string
  }
  items: ApiAdjustmentItem[]
}

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListAdjustmentsResponse {
  data: ApiAdjustment[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiAdjustmentResponse {
  data: ApiAdjustment
  message?: string
}

export interface ApiAdjustmentValidationResult {
  data: {
    valid: boolean
    adjustment: ApiAdjustment
    errors: string[]
  }
}

export interface ApiAdjustmentItemPreview {
  id: string
  productId: string
  productName?: string
  systemQuantity: number
  countedQuantity: number
  difference: number
}

export interface ApiAdjustmentPreviewResponse {
  data: {
    adjustmentId: string
    adjustmentNumber: string
    locationId: string
    locationName?: string
    items: ApiAdjustmentItemPreview[]
  }
}

// ---------------------------------------------------------------------------
// Input Types (mirrors backend/src/modules/adjustments/schema.ts)
// ---------------------------------------------------------------------------

export interface CreateAdjustmentItemPayload {
  productId: string
  countedQuantity: number | string
}

export interface CreateAdjustmentPayload {
  adjustmentNumber?: string
  reason?: string
  locationId: string
  items?: CreateAdjustmentItemPayload[]
}

export interface UpdateAdjustmentPayload {
  reason?: string
  locationId?: string
}

export interface UpdateAdjustmentItemPayload {
  countedQuantity: number | string
}

export interface ListAdjustmentsParams {
  page?: number
  limit?: number
  status?: ApiAdjustmentStatus
  locationId?: string
  search?: string
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export const adjustmentsApi = {
  /**
   * GET /api/adjustments
   * List inventory adjustments with pagination, search, status, and location filtering.
   */
  list(params: ListAdjustmentsParams = {}): Promise<ApiListAdjustmentsResponse> {
    return apiClient.get<ApiListAdjustmentsResponse>('/api/adjustments', {
      page: params.page,
      limit: params.limit,
      status: params.status,
      locationId: params.locationId,
      search: params.search,
    })
  },

  /**
   * GET /api/adjustments/:id
   * Fetch a single inventory adjustment by ID with relational location and items.
   */
  async getById(id: string): Promise<ApiAdjustment> {
    const res = await apiClient.get<ApiAdjustmentResponse>(`/api/adjustments/${id}`)
    return res.data
  },

  /**
   * POST /api/adjustments
   * Create a new inventory adjustment document with optional counted items.
   */
  async create(payload: CreateAdjustmentPayload): Promise<ApiAdjustment> {
    const res = await apiClient.post<ApiAdjustmentResponse>('/api/adjustments', payload)
    return res.data
  },

  /**
   * PATCH /api/adjustments/:id
   * Update adjustment header fields (reason, locationId).
   */
  async update(id: string, payload: UpdateAdjustmentPayload): Promise<ApiAdjustment> {
    const res = await apiClient.patch<ApiAdjustmentResponse>(`/api/adjustments/${id}`, payload)
    return res.data
  },

  /**
   * POST /api/adjustments/:id/validate
   * Validate adjustment document — transitions status to READY.
   */
  async validate(id: string): Promise<ApiAdjustment> {
    const res = await apiClient.post<ApiAdjustmentValidationResult>(`/api/adjustments/${id}/validate`)
    return res.data.adjustment
  },

  /**
   * POST /api/adjustments/:id/process
   * Process and apply the physical count adjustment — updates stock balances, logs stock movements, transitions to DONE.
   */
  async process(id: string): Promise<ApiAdjustment> {
    const res = await apiClient.post<ApiAdjustmentResponse>(`/api/adjustments/${id}/process`)
    return res.data
  },

  /**
   * POST /api/adjustments/:id/cancel
   * Cancel the inventory adjustment document.
   */
  async cancel(id: string): Promise<ApiAdjustment> {
    const res = await apiClient.post<ApiAdjustmentResponse>(`/api/adjustments/${id}/cancel`)
    return res.data
  },

  /**
   * GET /api/adjustments/:id/preview
   * Live read-only calculation of system vs physical counted variance.
   */
  async preview(id: string): Promise<ApiAdjustmentPreviewResponse['data']> {
    const res = await apiClient.get<ApiAdjustmentPreviewResponse>(`/api/adjustments/${id}/preview`)
    return res.data
  },

  /**
   * POST /api/adjustments/:id/items
   * Add a counted line item to an existing adjustment.
   */
  async addItem(adjustmentId: string, item: CreateAdjustmentItemPayload): Promise<ApiAdjustmentItem> {
    const res = await apiClient.post<{ data: ApiAdjustmentItem }>(`/api/adjustments/${adjustmentId}/items`, item)
    return res.data
  },

  /**
   * PATCH /api/adjustments/:id/items/:itemId
   * Update physical counted quantity of an adjustment item.
   */
  async updateItem(
    adjustmentId: string,
    itemId: string,
    payload: UpdateAdjustmentItemPayload
  ): Promise<ApiAdjustmentItem> {
    const res = await apiClient.patch<{ data: ApiAdjustmentItem }>(
      `/api/adjustments/${adjustmentId}/items/${itemId}`,
      payload
    )
    return res.data
  },

  /**
   * DELETE /api/adjustments/:id/items/:itemId
   * Remove a line item from an inventory adjustment.
   */
  removeItem(adjustmentId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/adjustments/${adjustmentId}/items/${itemId}`
    )
  },
}
