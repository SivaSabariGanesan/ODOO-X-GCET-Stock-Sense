/**
 * Stock Balances / Inventory API Client
 *
 * Maps all /api/stock-balances endpoints to strongly-typed client functions:
 *  - GET /api/stock-balances (list with pagination, search, warehouse, location, stock filters)
 *  - GET /api/stock-balances/:id (balance details)
 *  - GET /api/stock-balances/product/:productId (aggregated product stock across locations)
 *  - GET /api/stock-balances/location/:locationId (all product balances at location)
 *  - GET /api/stock-balances/check (product + location balance)
 *
 * Also provides master selector loaders for warehouses and locations.
 */
import { apiClient } from '../../lib/apiClient'
import {
  ApiStockBalance,
  ApiListStockBalancesResponse,
  ApiProductStockSummary,
  ApiLocationStockSummary,
  ListStockBalancesParams,
  MasterWarehouseOption,
  MasterLocationOption,
} from './types'

function normalizeBalance(b: any): ApiStockBalance {
  const qty = Number(b.quantity) || 0
  const reserved = Number(b.reservedQuantity) || 0
  const avail = b.availableQuantity !== undefined && b.availableQuantity !== null
    ? Number(b.availableQuantity)
    : qty - reserved

  return {
    ...b,
    quantity: qty,
    reservedQuantity: reserved,
    availableQuantity: avail,
  }
}

export const stockBalancesApi = {
  /**
   * GET /api/stock-balances
   * Lists stock balances with pagination, search, warehouse, location, and sorting support.
   */
  async list(params: ListStockBalancesParams = {}): Promise<ApiListStockBalancesResponse> {
    const res = await apiClient.get<ApiListStockBalancesResponse>('/api/stock-balances', {
      page: params.page,
      limit: params.limit,
      productId: params.productId,
      locationId: params.locationId,
      warehouseId: params.warehouseId,
      categoryId: params.categoryId,
      search: params.search,
      hasStock: params.hasStock,
      minQuantity: params.minQuantity,
      maxQuantity: params.maxQuantity,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })

    return {
      ...res,
      data: (res.data || []).map(normalizeBalance),
    }
  },

  /**
   * GET /api/stock-balances/:id
   * Retrieves single stock balance record by UUID.
   */
  async getById(id: string): Promise<ApiStockBalance> {
    const res = await apiClient.get<{ data: ApiStockBalance }>(`/api/stock-balances/${id}`)
    return normalizeBalance(res.data)
  },

  /**
   * GET /api/stock-balances/product/:productId
   * Returns aggregated product stock across all locations with individual location breakdown.
   */
  async getProductStock(productId: string): Promise<ApiProductStockSummary> {
    const res = await apiClient.get<{ data: ApiProductStockSummary }>(
      `/api/stock-balances/product/${productId}`
    )
    const raw = res.data
    return {
      productId: raw.productId,
      totalQuantity: Number(raw.totalQuantity) || 0,
      totalReserved: Number(raw.totalReserved) || 0,
      totalAvailable: Number(raw.totalAvailable) || 0,
      locationBalances: (raw.locationBalances || []).map(normalizeBalance),
    }
  },

  /**
   * GET /api/stock-balances/location/:locationId
   * Returns all product stock balances located at a specific storage location.
   */
  async getLocationStock(locationId: string): Promise<ApiLocationStockSummary> {
    const res = await apiClient.get<{ data: ApiLocationStockSummary }>(
      `/api/stock-balances/location/${locationId}`
    )
    const raw = res.data
    return {
      locationId: raw.locationId,
      locationName: raw.locationName,
      locationFullPath: raw.locationFullPath,
      warehouseId: raw.warehouseId,
      warehouseName: raw.warehouseName,
      balances: (raw.balances || []).map(normalizeBalance),
    }
  },

  /**
   * GET /api/stock-balances/check
   * Queries real-time stock balance for a specific product at a specific location.
   */
  async check(productId: string, locationId: string): Promise<ApiStockBalance> {
    const res = await apiClient.get<{ data: ApiStockBalance }>('/api/stock-balances/check', {
      productId,
      locationId,
    })
    return normalizeBalance(res.data)
  },

  /**
   * GET /api/warehouses
   * Helper to load active warehouses for filter selection.
   */
  async getWarehousesMaster(): Promise<MasterWarehouseOption[]> {
    try {
      const res = await apiClient.get<{ data: MasterWarehouseOption[] }>('/api/warehouses', {
        limit: 100,
      })
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * GET /api/locations
   * Helper to load locations for filter selection, optionally filtered by warehouse.
   */
  async getLocationsMaster(warehouseId?: string): Promise<MasterLocationOption[]> {
    try {
      const res = await apiClient.get<{ data: MasterLocationOption[] }>('/api/locations', {
        limit: 100,
        warehouseId,
      })
      return res.data || []
    } catch {
      return []
    }
  },
}
