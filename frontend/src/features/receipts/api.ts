/**
 * Receipts API Client
 *
 * Maps all /api/receipts endpoints to strongly-typed functions.
 * The backend status enum uses UPPERCASE (DRAFT, WAITING, READY, DONE, CANCELED).
 * The frontend uses lowercase for display; we normalise on the way in and out.
 */
import { apiClient } from '@/lib/apiClient'

// ---------------------------------------------------------------------------
// Backend Response Types (mirrors backend/src/modules/receipts/types.ts)
// ---------------------------------------------------------------------------

/** Uppercase status as returned by the API */
export type ApiReceiptStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED'

export interface ApiReceiptItem {
  id: string
  receiptId: string
  productId: string
  destinationLocationId: string | null
  quantity: string
  unitPrice: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  product?: { id: string; name: string; sku: string }
  destinationLocation?: { id: string; name: string; fullPath: string }
}

export interface ApiReceipt {
  id: string
  receiptNumber: string
  supplierName: string | null
  supplierReference: string | null
  notes: string | null
  warehouseId: string
  defaultLocationId: string | null
  status: ApiReceiptStatus
  createdBy: string | null
  validatedAt: string | null
  createdAt: string
  updatedAt: string
  warehouse?: { id: string; name: string; shortCode: string }
  defaultLocation?: { id: string; name: string; fullPath: string }
  creator?: { id: string; name: string; email: string }
  items: ApiReceiptItem[]
}

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListReceiptsResponse {
  data: ApiReceipt[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiReceiptResponse {
  data: ApiReceipt
}

export interface ApiValidationResult {
  data: {
    isValid: boolean
    errors: string[]
    receipt: ApiReceipt
    items: ApiReceiptItem[]
  }
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------
export interface CreateReceiptItemPayload {
  productId: string
  destinationLocationId?: string
  quantity: number | string
  unitPrice?: number | string
  notes?: string
}

export interface CreateReceiptPayload {
  supplierName?: string
  supplierReference?: string
  notes?: string
  warehouseId: string
  defaultLocationId?: string
  items?: CreateReceiptItemPayload[]
}

export interface UpdateReceiptPayload {
  supplierName?: string
  supplierReference?: string
  notes?: string
  warehouseId?: string
  defaultLocationId?: string
}

export interface UpdateReceiptItemPayload {
  destinationLocationId?: string
  quantity?: number | string
  unitPrice?: number | string
  notes?: string
}

export interface ListReceiptsParams {
  page?: number
  limit?: number
  search?: string
  status?: ApiReceiptStatus
  warehouseId?: string
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export const receiptsApi = {
  /**
   * GET /api/receipts
   * List receipts with pagination, search and filter support.
   */
  list(params: ListReceiptsParams = {}): Promise<ApiListReceiptsResponse> {
    return apiClient.get<ApiListReceiptsResponse>('/api/receipts', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      warehouseId: params.warehouseId,
    })
  },

  /**
   * GET /api/receipts/:id
   * Fetch a single receipt with all related data and line items.
   */
  async getById(id: string): Promise<ApiReceipt> {
    const res = await apiClient.get<ApiReceiptResponse>(`/api/receipts/${id}`)
    return res.data
  },

  /**
   * POST /api/receipts
   * Create a new receipt document with optional items.
   */
  async create(payload: CreateReceiptPayload): Promise<ApiReceipt> {
    const res = await apiClient.post<ApiReceiptResponse>('/api/receipts', payload)
    return res.data
  },

  /**
   * PATCH /api/receipts/:id
   * Update receipt header fields.
   */
  async update(id: string, payload: UpdateReceiptPayload): Promise<ApiReceipt> {
    const res = await apiClient.patch<ApiReceiptResponse>(`/api/receipts/${id}`, payload)
    return res.data
  },

  /**
   * POST /api/receipts/:id/validate
   * Validate the receipt document — transitions status to READY.
   */
  async validate(id: string): Promise<ApiReceipt> {
    const res = await apiClient.post<ApiValidationResult>(`/api/receipts/${id}/validate`)
    return res.data.receipt
  },

  /**
   * POST /api/receipts/:id/process
   * Process the validated receipt — creates stock movements and transitions to DONE.
   */
  async process(id: string): Promise<ApiReceipt> {
    const res = await apiClient.post<ApiReceiptResponse>(`/api/receipts/${id}/process`)
    return res.data
  },

  /**
   * POST /api/receipts/:id/cancel
   * Cancel the receipt document.
   */
  async cancel(id: string): Promise<ApiReceipt> {
    const res = await apiClient.post<ApiReceiptResponse>(`/api/receipts/${id}/cancel`)
    return res.data
  },

  /**
   * POST /api/receipts/:id/items
   * Add a line item to an existing receipt.
   */
  async addItem(receiptId: string, item: CreateReceiptItemPayload): Promise<ApiReceiptItem> {
    const res = await apiClient.post<{ data: ApiReceiptItem }>(`/api/receipts/${receiptId}/items`, item)
    return res.data
  },

  /**
   * PATCH /api/receipts/:id/items/:itemId
   * Update an existing line item.
   */
  async updateItem(
    receiptId: string,
    itemId: string,
    payload: UpdateReceiptItemPayload
  ): Promise<ApiReceiptItem> {
    const res = await apiClient.patch<{ data: ApiReceiptItem }>(
      `/api/receipts/${receiptId}/items/${itemId}`,
      payload
    )
    return res.data
  },

  /**
   * DELETE /api/receipts/:id/items/:itemId
   * Remove a line item from a receipt.
   */
  removeItem(receiptId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/receipts/${receiptId}/items/${itemId}`
    )
  },
}
