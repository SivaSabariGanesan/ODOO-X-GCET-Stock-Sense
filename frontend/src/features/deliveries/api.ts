/**
 * Deliveries API Client
 *
 * Strongly-typed API client matching the backend Deliveries routes and schemas.
 * The backend status enum uses UPPERCASE (DRAFT, WAITING, READY, DONE, CANCELED).
 */
import { apiClient } from '../../lib/apiClient'

// ---------------------------------------------------------------------------
// Backend Response Types (mirrors backend/src/modules/deliveries/types.ts)
// ---------------------------------------------------------------------------

/** Uppercase status as returned by the API */
export type ApiDeliveryStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED'

export interface ApiDeliveryItem {
  id: string
  deliveryId: string
  productId: string
  sourceLocationId: string | null
  quantity: string
  unitPrice: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  product?: { id: string; name: string; sku: string }
  sourceLocation?: { id: string; name: string; fullPath: string }
}

export interface ApiDelivery {
  id: string
  deliveryNumber: string
  customerName: string | null
  customerReference: string | null
  notes: string | null
  warehouseId: string
  defaultSourceLocationId: string | null
  status: ApiDeliveryStatus
  createdBy: string | null
  validatedAt: string | null
  createdAt: string
  updatedAt: string
  warehouse?: { id: string; name: string; shortCode: string }
  defaultSourceLocation?: { id: string; name: string; fullPath: string }
  creator?: { id: string; name: string; email: string }
  items: ApiDeliveryItem[]
}

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListDeliveriesResponse {
  data: ApiDelivery[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiDeliveryResponse {
  data: ApiDelivery
  message?: string
}

export interface ApiDeliveryValidationResult {
  data: {
    isValid: boolean
    errors: string[]
    delivery: ApiDelivery
    items: ApiDeliveryItem[]
  }
}

// ---------------------------------------------------------------------------
// Input Types (mirrors backend/src/modules/deliveries/schema.ts)
// ---------------------------------------------------------------------------

export interface CreateDeliveryItemPayload {
  productId: string
  sourceLocationId?: string
  quantity: number | string
  unitPrice?: number | string
  notes?: string
}

export interface CreateDeliveryPayload {
  deliveryNumber?: string
  customerName?: string
  customerReference?: string
  notes?: string
  warehouseId: string
  defaultSourceLocationId?: string
  items?: CreateDeliveryItemPayload[]
}

export interface UpdateDeliveryPayload {
  customerName?: string
  customerReference?: string
  notes?: string
  warehouseId?: string
  defaultSourceLocationId?: string
}

export interface UpdateDeliveryItemPayload {
  sourceLocationId?: string
  quantity?: number | string
  unitPrice?: number | string
  notes?: string
}

export interface ListDeliveriesParams {
  page?: number
  limit?: number
  search?: string
  status?: ApiDeliveryStatus
  warehouseId?: string
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export const deliveriesApi = {
  /**
   * GET /api/deliveries
   * List deliveries with pagination, search and filter support.
   */
  list(params: ListDeliveriesParams = {}): Promise<ApiListDeliveriesResponse> {
    return apiClient.get<ApiListDeliveriesResponse>('/api/deliveries', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      warehouseId: params.warehouseId,
    })
  },

  /**
   * GET /api/deliveries/:id
   * Fetch a single delivery with all related warehouse, creator, and line items.
   */
  async getById(id: string): Promise<ApiDelivery> {
    const res = await apiClient.get<ApiDeliveryResponse>(`/api/deliveries/${id}`)
    return res.data
  },

  /**
   * POST /api/deliveries
   * Create a new delivery document with optional items.
   */
  async create(payload: CreateDeliveryPayload): Promise<ApiDelivery> {
    const res = await apiClient.post<ApiDeliveryResponse>('/api/deliveries', payload)
    return res.data
  },

  /**
   * PATCH /api/deliveries/:id
   * Update delivery header fields.
   */
  async update(id: string, payload: UpdateDeliveryPayload): Promise<ApiDelivery> {
    const res = await apiClient.patch<ApiDeliveryResponse>(`/api/deliveries/${id}`, payload)
    return res.data
  },

  /**
   * POST /api/deliveries/:id/pick
   * Pick delivery step (transitions DRAFT -> WAITING).
   */
  async pick(id: string): Promise<ApiDelivery> {
    const res = await apiClient.post<ApiDeliveryResponse>(`/api/deliveries/${id}/pick`)
    return res.data
  },

  /**
   * POST /api/deliveries/:id/pack
   * Pack delivery step (transitions -> READY).
   */
  async pack(id: string): Promise<ApiDelivery> {
    const res = await apiClient.post<ApiDeliveryResponse>(`/api/deliveries/${id}/pack`)
    return res.data
  },

  /**
   * POST /api/deliveries/:id/validate
   * Validate the delivery document — transitions status to READY if DRAFT or WAITING.
   */
  async validate(id: string): Promise<ApiDelivery> {
    const res = await apiClient.post<ApiDeliveryValidationResult>(`/api/deliveries/${id}/validate`)
    return res.data.delivery
  },

  /**
   * POST /api/deliveries/:id/process
   * Process the validated delivery — decrements stock balances, writes stock ledger, and marks DONE.
   */
  async process(id: string): Promise<ApiDelivery> {
    const res = await apiClient.post<ApiDeliveryResponse>(`/api/deliveries/${id}/process`)
    return res.data
  },

  /**
   * POST /api/deliveries/:id/cancel
   * Cancel the delivery document.
   */
  async cancel(id: string): Promise<ApiDelivery> {
    const res = await apiClient.post<ApiDeliveryResponse>(`/api/deliveries/${id}/cancel`)
    return res.data
  },

  /**
   * POST /api/deliveries/:id/items
   * Add a line item to an existing delivery.
   */
  async addItem(deliveryId: string, item: CreateDeliveryItemPayload): Promise<ApiDeliveryItem> {
    const res = await apiClient.post<{ data: ApiDeliveryItem }>(`/api/deliveries/${deliveryId}/items`, item)
    return res.data
  },

  /**
   * PATCH /api/deliveries/:id/items/:itemId
   * Update an existing line item.
   */
  async updateItem(
    deliveryId: string,
    itemId: string,
    payload: UpdateDeliveryItemPayload
  ): Promise<ApiDeliveryItem> {
    const res = await apiClient.patch<{ data: ApiDeliveryItem }>(
      `/api/deliveries/${deliveryId}/items/${itemId}`,
      payload
    )
    return res.data
  },

  /**
   * DELETE /api/deliveries/:id/items/:itemId
   * Remove a line item from a delivery.
   */
  removeItem(deliveryId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/deliveries/${deliveryId}/items/${itemId}`
    )
  },
}
