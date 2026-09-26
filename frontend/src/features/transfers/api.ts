/**
 * Internal Transfers API Client
 *
 * Strongly-typed API client matching the backend Internal Transfers routes and schemas.
 * Uses the shared apiClient with automatic JWT Authorization header injection.
 */
import { apiClient } from '../../lib/apiClient';
import type {
  ApiTransfer,
  ApiListTransfersResponse,
  ApiTransferResponse,
  ApiTransferValidationResult,
  CreateTransferPayload,
  UpdateTransferPayload,
  CreateTransferItemPayload,
  ListTransfersParams,
} from './types';

export const transfersApi = {
  /**
   * List internal transfers with optional filters and pagination
   * GET /api/transfers
   */
  async list(params: ListTransfersParams = {}): Promise<ApiListTransfersResponse> {
    const query = new URLSearchParams();

    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.sourceLocationId) query.set('sourceLocationId', params.sourceLocationId);
    if (params.destinationLocationId) query.set('destinationLocationId', params.destinationLocationId);
    if (params.search?.trim()) query.set('search', params.search.trim());

    const qs = query.toString();
    const endpoint = qs ? `/api/transfers?${qs}` : '/api/transfers';
    return apiClient.get<ApiListTransfersResponse>(endpoint);
  },

  /**
   * Get single internal transfer details by ID
   * GET /api/transfers/:id
   */
  async getById(id: string): Promise<ApiTransferResponse> {
    return apiClient.get<ApiTransferResponse>(`/api/transfers/${id}`);
  },

  /**
   * Create a new internal transfer document
   * POST /api/transfers
   */
  async create(payload: CreateTransferPayload): Promise<ApiTransferResponse> {
    return apiClient.post<ApiTransferResponse>('/api/transfers', payload);
  },

  /**
   * Update internal transfer document header
   * PATCH /api/transfers/:id
   */
  async update(id: string, payload: UpdateTransferPayload): Promise<ApiTransferResponse> {
    return apiClient.patch<ApiTransferResponse>(`/api/transfers/${id}`, payload);
  },

  /**
   * Process internal transfer (Moves physical inventory atomically and records in stock movements)
   * POST /api/transfers/:id/process
   */
  async process(id: string): Promise<ApiTransferResponse> {
    return apiClient.post<ApiTransferResponse>(`/api/transfers/${id}/process`, {});
  },

  /**
   * Validate internal transfer document
   * POST /api/transfers/:id/validate
   */
  async validate(id: string): Promise<ApiTransferValidationResult> {
    return apiClient.post<ApiTransferValidationResult>(`/api/transfers/${id}/validate`, {});
  },

  /**
   * Cancel internal transfer
   * POST /api/transfers/:id/cancel
   */
  async cancel(id: string): Promise<ApiTransferResponse> {
    return apiClient.post<ApiTransferResponse>(`/api/transfers/${id}/cancel`, {});
  },

  /**
   * Add a line item to an internal transfer
   * POST /api/transfers/:id/items
   */
  async addItem(transferId: string, payload: CreateTransferItemPayload): Promise<{ data: any }> {
    return apiClient.post<{ data: any }>(`/api/transfers/${transferId}/items`, payload);
  },

  /**
   * Update an item's quantity in an internal transfer
   * PATCH /api/transfers/:id/items/:itemId
   */
  async updateItem(
    transferId: string,
    itemId: string,
    payload: { quantity: number | string }
  ): Promise<{ data: any }> {
    return apiClient.patch<{ data: any }>(`/api/transfers/${transferId}/items/${itemId}`, payload);
  },

  /**
   * Remove a line item from an internal transfer
   * DELETE /api/transfers/:id/items/:itemId
   */
  async deleteItem(transferId: string, itemId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/transfers/${transferId}/items/${itemId}`);
  },
};
