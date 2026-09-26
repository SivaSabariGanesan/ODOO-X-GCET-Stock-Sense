/**
 * Stock Movements / Ledger API Client
 *
 * Strongly-typed API client matching the backend Stock Movements routes and schemas:
 *  - GET /api/stock-movements (list with pagination, search, filters)
 *  - GET /api/stock-movements/:id (get movement details)
 *  - GET /api/stock-movements/reference/:referenceType/:referenceId
 *
 * Immutability note: Stock movements are immutable audit records and do not support
 * PUT, PATCH, or DELETE operations (enforced by backend HTTP 405).
 */
import { apiClient } from '../../lib/apiClient'

// ---------------------------------------------------------------------------
// Backend Response Types (mirrors backend/src/modules/stock-movements/types.ts)
// ---------------------------------------------------------------------------

export type ApiMovementType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT'

export type ApiReferenceType =
  | 'RECEIPT'
  | 'DELIVERY'
  | 'INTERNAL_TRANSFER'
  | 'INVENTORY_ADJUSTMENT'

export interface ApiProductSummary {
  id: string
  name: string
  sku: string
  categoryId?: string | null
  uomId?: string
  costPrice?: string
  salePrice?: string
}

export interface ApiLocationSummary {
  id: string
  warehouseId?: string
  name: string
  fullPath?: string
  locationType?: string
}

export interface ApiUserSummary {
  id: string
  name: string
  email: string
  role?: string
}

export interface ApiStockMovement {
  id: string
  productId: string
  sourceLocationId: string | null
  destinationLocationId: string | null
  quantity: string
  movementType: ApiMovementType
  referenceType: ApiReferenceType
  referenceId: string
  createdBy: string | null
  createdAt: string
  product?: ApiProductSummary
  sourceLocation?: ApiLocationSummary
  destinationLocation?: ApiLocationSummary
  creator?: ApiUserSummary
}

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListStockMovementsResponse {
  data: ApiStockMovement[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiStockMovementResponse {
  data: ApiStockMovement
}

// ---------------------------------------------------------------------------
// Query Parameters (mirrors listStockMovementsQuerySchema)
// ---------------------------------------------------------------------------
export interface ListStockMovementsParams {
  page?: number
  limit?: number
  productId?: string
  warehouseId?: string
  locationId?: string
  sourceLocationId?: string
  destinationLocationId?: string
  movementType?: ApiMovementType
  referenceType?: ApiReferenceType
  referenceId?: string
  createdBy?: string
  fromDate?: string
  toDate?: string
  search?: string
}

// ---------------------------------------------------------------------------
// API Client Functions
// ---------------------------------------------------------------------------

export const stockMovementsApi = {
  /**
   * GET /api/stock-movements
   * List stock movements with pagination, search, and server-side filtering.
   */
  list(params: ListStockMovementsParams = {}): Promise<ApiListStockMovementsResponse> {
    return apiClient.get<ApiListStockMovementsResponse>('/api/stock-movements', {
      page: params.page,
      limit: params.limit,
      productId: params.productId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      sourceLocationId: params.sourceLocationId,
      destinationLocationId: params.destinationLocationId,
      movementType: params.movementType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      createdBy: params.createdBy,
      fromDate: params.fromDate,
      toDate: params.toDate,
      search: params.search,
    })
  },

  /**
   * GET /api/stock-movements/:id
   * Get single stock movement by ID with product, source/destination locations, and creator.
   */
  async getById(id: string): Promise<ApiStockMovement> {
    const res = await apiClient.get<ApiStockMovementResponse>(`/api/stock-movements/${id}`)
    return res.data
  },

  /**
   * GET /api/stock-movements/reference/:referenceType/:referenceId
   * Fetch all movements associated with a specific business document.
   */
  async getByReference(
    referenceType: ApiReferenceType,
    referenceId: string
  ): Promise<ApiStockMovement[]> {
    const res = await apiClient.get<{ data: ApiStockMovement[] }>(
      `/api/stock-movements/reference/${referenceType}/${referenceId}`
    )
    return res.data
  },
}
