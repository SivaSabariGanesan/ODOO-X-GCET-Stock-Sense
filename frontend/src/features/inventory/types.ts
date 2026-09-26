/**
 * Stock Balances / Inventory Types
 * Matches the backend /api/stock-balances contract and frontend presentation models
 */

export interface ApiStockBalance {
  id: string
  productId: string
  locationId: string
  quantity: string
  reservedQuantity: string
  availableQuantity?: string
  lastMovedAt: string | null
  createdAt: string
  updatedAt: string
  productName?: string
  productSku?: string
  uomName?: string
  uomAbbreviation?: string
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

export interface ApiListStockBalancesResponse {
  data: ApiStockBalance[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiStockBalanceResponse {
  data: ApiStockBalance
}

export interface ApiProductStockSummary {
  productId: string
  totalQuantity: string
  totalReserved: string
  totalAvailable: string
  locationBalances: ApiStockBalance[]
}

export interface ApiLocationStockSummary {
  locationId: string
  locationName: string
  locationFullPath: string
  warehouseId: string
  warehouseName: string
  balances: ApiStockBalance[]
}

export interface ListStockBalancesParams {
  page?: number
  limit?: number
  productId?: string
  locationId?: string
  warehouseId?: string
  categoryId?: string
  search?: string
  hasStock?: boolean
  minQuantity?: number | string
  maxQuantity?: number | string
  sortBy?: 'quantity' | 'lastMovedAt' | 'createdAt' | 'productName'
  sortOrder?: 'asc' | 'desc'
}

export interface InventoryFiltersState {
  search: string
  warehouseId: string
  locationId: string
  hasStockOnly: boolean
  sortBy: 'quantity' | 'lastMovedAt' | 'createdAt' | 'productName'
  sortOrder: 'asc' | 'desc'
}

export interface MasterWarehouseOption {
  id: string
  name: string
  shortCode: string
}

export interface MasterLocationOption {
  id: string
  name: string
  fullPath: string
  warehouseId: string
}
