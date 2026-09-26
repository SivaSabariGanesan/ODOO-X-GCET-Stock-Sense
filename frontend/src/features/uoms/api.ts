/**
 * Units of Measure (UOM) API Client
 *
 * Strongly-typed API client matching the backend Units of Measure routes:
 *  - GET /api/uoms (list UOMs with pagination, search, measureType, and status filtering)
 *  - GET /api/uoms/:id (fetch single UOM by ID)
 *  - POST /api/uoms (create new UOM master record)
 *  - PATCH /api/uoms/:id (update UOM record)
 *  - DELETE /api/uoms/:id (delete unreferenced UOM or deactivate if referenced by products)
 */
import { apiClient } from '../../lib/apiClient'
import {
  ApiUom,
  ApiListUomsResponse,
  ApiUomResponse,
  CreateUomPayload,
  UpdateUomPayload,
  ListUomsParams,
} from './types'

export const uomsApi = {
  /**
   * GET /api/uoms
   * List units of measure with pagination, search, and filtering.
   */
  list(params: ListUomsParams = {}): Promise<ApiListUomsResponse> {
    return apiClient.get<ApiListUomsResponse>('/api/uoms', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      measureType: params.measureType,
      isActive: params.isActive,
    })
  },

  /**
   * GET /api/uoms/:id
   * Fetch a single UOM by ID.
   */
  async getById(id: string): Promise<ApiUom> {
    const res = await apiClient.get<ApiUomResponse>(`/api/uoms/${id}`)
    return res.data
  },

  /**
   * POST /api/uoms
   * Create a new unit of measure record.
   */
  async create(payload: CreateUomPayload): Promise<ApiUom> {
    const body: Record<string, unknown> = {
      name: payload.name.trim(),
      abbreviation: payload.abbreviation.trim(),
      description: payload.description?.trim() || undefined,
      measureType: payload.measureType?.trim() || undefined,
      isActive: payload.isActive ?? true,
    }
    const res = await apiClient.post<ApiUomResponse>('/api/uoms', body)
    return res.data
  },

  /**
   * PATCH /api/uoms/:id
   * Update UOM fields.
   */
  async update(id: string, payload: UpdateUomPayload): Promise<ApiUom> {
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name.trim()
    if (payload.abbreviation !== undefined) body.abbreviation = payload.abbreviation.trim()
    if (payload.description !== undefined) {
      body.description = payload.description ? payload.description.trim() : null
    }
    if (payload.measureType !== undefined) {
      body.measureType = payload.measureType ? payload.measureType.trim() : null
    }
    if (payload.isActive !== undefined) {
      body.isActive = payload.isActive
    }

    const res = await apiClient.patch<ApiUomResponse>(`/api/uoms/${id}`, body)
    return res.data
  },

  /**
   * DELETE /api/uoms/:id
   * Hard-deletes unreferenced UOM or deactivates UOM if referenced by products.
   */
  delete(
    id: string
  ): Promise<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }> {
    return apiClient.delete<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }>(
      `/api/uoms/${id}`
    )
  },
}
