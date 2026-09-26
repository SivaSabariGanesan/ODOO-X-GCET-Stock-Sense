/**
 * Reordering Rules Types & Data Contracts
 * Mirrors backend ReorderRule schema and routes.
 */

export interface ApiReorderRule {
  id: string
  productId: string
  locationId: string
  minQuantity: string
  maxQuantity: string | null
  reorderQty: string
  isActive: boolean
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: string
  updatedAt: string
  productName?: string
  productSku?: string
  locationName?: string
  locationFullPath?: string
  warehouseId?: string
  warehouseName?: string
  warehouseShortCode?: string
}

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListReorderRulesResponse {
  data: ApiReorderRule[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiReorderRuleResponse {
  data: ApiReorderRule
}

export interface CreateReorderRulePayload {
  productId: string
  locationId: string
  minQuantity?: number | string
  maxQuantity?: number | string | null
  reorderQty?: number | string
  isActive?: boolean
}

export interface UpdateReorderRulePayload {
  productId?: string
  locationId?: string
  minQuantity?: number | string
  maxQuantity?: number | string | null
  reorderQty?: number | string
  isActive?: boolean
}

export interface ListReorderRulesParams {
  page?: number
  limit?: number
  productId?: string
  locationId?: string
  warehouseId?: string
  search?: string
  isActive?: boolean
  sortBy?: 'minQuantity' | 'maxQuantity' | 'reorderQty' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface ReorderRulesFiltersState {
  search: string
  warehouseId: string
  status: 'all' | 'active' | 'inactive'
}
