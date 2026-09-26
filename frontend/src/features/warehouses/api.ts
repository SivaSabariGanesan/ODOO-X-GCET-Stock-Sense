/**
 * Warehouses & Locations API Client
 * Wraps all /api/warehouses and /api/locations backend endpoints.
 */
import { apiClient } from '../../lib/apiClient'
import {
  ApiWarehouse,
  CreateWarehousePayload,
  UpdateWarehousePayload,
  ListWarehousesParams,
  ApiListWarehousesResponse,
  ApiLocation,
  CreateLocationPayload,
  UpdateLocationPayload,
  ListLocationsParams,
  ApiListLocationsResponse,
} from './types'

export const warehousesApi = {
  /**
   * GET /api/warehouses
   * Lists warehouses with pagination, search, and active status filters.
   */
  list(params: ListWarehousesParams = {}): Promise<ApiListWarehousesResponse> {
    return apiClient.get<ApiListWarehousesResponse>('/api/warehouses', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      isActive: params.isActive,
    })
  },

  /**
   * GET /api/warehouses/:id
   * Retrieves single warehouse record by UUID.
   */
  async getById(id: string): Promise<ApiWarehouse> {
    const res = await apiClient.get<{ data: ApiWarehouse }>(`/api/warehouses/${id}`)
    return res.data
  },

  /**
   * POST /api/warehouses
   * Creates a new warehouse.
   */
  async create(payload: CreateWarehousePayload): Promise<ApiWarehouse> {
    const res = await apiClient.post<{ data: ApiWarehouse }>('/api/warehouses', payload)
    return res.data
  },

  /**
   * PATCH /api/warehouses/:id
   * Updates warehouse fields.
   */
  async update(id: string, payload: UpdateWarehousePayload): Promise<ApiWarehouse> {
    const res = await apiClient.patch<{ data: ApiWarehouse }>(`/api/warehouses/${id}`, payload)
    return res.data
  },

  /**
   * DELETE /api/warehouses/:id
   * Deletes or deactivates warehouse.
   */
  delete(id: string): Promise<{ message: string; action?: string }> {
    return apiClient.delete<{ message: string; action?: string }>(`/api/warehouses/${id}`)
  },
}

export const locationsApi = {
  /**
   * GET /api/locations
   * Lists locations with pagination, search, warehouseId, parentId, and sorting.
   */
  list(params: ListLocationsParams = {}): Promise<ApiListLocationsResponse> {
    return apiClient.get<ApiListLocationsResponse>('/api/locations', {
      page: params.page,
      limit: params.limit,
      warehouseId: params.warehouseId,
      parentId: params.parentId,
      search: params.search,
      locationType: params.locationType,
      isActive: params.isActive,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
  },

  /**
   * GET /api/locations/:id
   * Retrieves single location details by UUID.
   */
  async getById(id: string): Promise<ApiLocation> {
    const res = await apiClient.get<{ data: ApiLocation }>(`/api/locations/${id}`)
    return res.data
  },

  /**
   * POST /api/locations
   * Creates a new storage location.
   */
  async create(payload: CreateLocationPayload): Promise<ApiLocation> {
    const res = await apiClient.post<{ data: ApiLocation }>('/api/locations', payload)
    return res.data
  },

  /**
   * PATCH /api/locations/:id
   * Updates location fields.
   */
  async update(id: string, payload: UpdateLocationPayload): Promise<ApiLocation> {
    const res = await apiClient.patch<{ data: ApiLocation }>(`/api/locations/${id}`, payload)
    return res.data
  },

  /**
   * DELETE /api/locations/:id
   * Deletes or deactivates location.
   */
  delete(id: string): Promise<{ message: string; action?: string }> {
    return apiClient.delete<{ message: string; action?: string }>(`/api/locations/${id}`)
  },
}
