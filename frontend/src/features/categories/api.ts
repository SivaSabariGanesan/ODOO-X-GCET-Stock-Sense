/**
 * Categories API Client
 *
 * Strongly-typed API client matching the backend Categories routes:
 *  - GET /api/categories (list categories with pagination, search, status filter)
 *  - GET /api/categories/:id (get category details)
 *  - POST /api/categories (create new category - manager/admin)
 *  - PATCH /api/categories/:id (update category - manager/admin)
 *  - DELETE /api/categories/:id (delete or deactivate category - admin)
 */
import { apiClient } from '../../lib/apiClient'
import {
  ApiCategory,
  ApiListCategoriesResponse,
  ApiCategoryResponse,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  ListCategoriesParams,
} from './types'

export const categoriesApi = {
  /**
   * GET /api/categories
   * List categories with pagination, search, and active/inactive filtering.
   */
  list(params: ListCategoriesParams = {}): Promise<ApiListCategoriesResponse> {
    return apiClient.get<ApiListCategoriesResponse>('/api/categories', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      isActive: params.isActive,
      parentCategoryId: params.parentCategoryId,
    })
  },

  /**
   * GET /api/categories/:id
   * Fetch a single category by ID.
   */
  async getById(id: string): Promise<ApiCategory> {
    const res = await apiClient.get<ApiCategoryResponse>(`/api/categories/${id}`)
    return res.data
  },

  /**
   * POST /api/categories
   * Create a new category master record. Requires manager or admin role.
   */
  async create(payload: CreateCategoryPayload): Promise<ApiCategory> {
    const body: Record<string, unknown> = {
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined,
      color: payload.color || undefined,
      isActive: payload.isActive ?? true,
    }
    if (payload.code !== undefined) body.code = payload.code
    if (payload.parentCategoryId !== undefined) body.parentCategoryId = payload.parentCategoryId
    const res = await apiClient.post<ApiCategoryResponse>('/api/categories', body)
    return res.data
  },

  /**
   * PATCH /api/categories/:id
   * Update category fields. Requires manager or admin role.
   */
  async update(id: string, payload: UpdateCategoryPayload): Promise<ApiCategory> {
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name.trim()
    if (payload.description !== undefined) {
      body.description = payload.description ? payload.description.trim() : null
    }
    if (payload.color !== undefined) {
      body.color = payload.color || null
    }
    if (payload.isActive !== undefined) {
      body.isActive = payload.isActive
    }
    if (payload.code !== undefined) {
      body.code = payload.code
    }
    if (payload.parentCategoryId !== undefined) {
      body.parentCategoryId = payload.parentCategoryId
    }

    const res = await apiClient.patch<ApiCategoryResponse>(`/api/categories/${id}`, body)
    return res.data
  },

  /**
   * DELETE /api/categories/:id
   * Hard-deletes unreferenced category or deactivates category if referenced by products.
   * Requires admin role according to RBAC contract.
   */
  delete(
    id: string
  ): Promise<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }> {
    return apiClient.delete<{ success: boolean; message: string; mode?: 'deleted' | 'deactivated' }>(
      `/api/categories/${id}`
    )
  },
}
