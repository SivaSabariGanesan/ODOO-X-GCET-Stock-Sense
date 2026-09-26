/**
 * Warehouses & Locations Data Contracts
 * Matched strictly to backend database models and API schemas.
 */

export interface ApiWarehouse {
  id: string
  name: string
  shortCode: string
  description: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string | null
}

export interface CreateWarehousePayload {
  name: string
  shortCode: string
  description?: string
  address?: string
  isActive?: boolean
}

export interface UpdateWarehousePayload {
  name?: string
  shortCode?: string
  description?: string | null
  address?: string | null
  isActive?: boolean
}

export interface ListWarehousesParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export interface ApiListWarehousesResponse {
  data: ApiWarehouse[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type LocationType =
  | 'internal'
  | 'input'
  | 'output'
  | 'quality_control'
  | 'virtual'

export interface ApiLocation {
  id: string
  warehouseId: string
  parentId: string | null
  name: string
  fullPath: string
  locationType: LocationType | string
  isActive: boolean
  createdAt: string
  updatedAt: string
  warehouseName?: string
  warehouseShortCode?: string
  parentName?: string
  parentFullPath?: string
  childrenCount?: number
}

export interface CreateLocationPayload {
  warehouseId: string
  parentId?: string | null
  name: string
  fullPath?: string
  locationType?: LocationType
  isActive?: boolean
}

export interface UpdateLocationPayload {
  warehouseId?: string
  parentId?: string | null
  name?: string
  fullPath?: string
  locationType?: LocationType
  isActive?: boolean
}

export interface ListLocationsParams {
  page?: number
  limit?: number
  warehouseId?: string
  parentId?: string | null
  search?: string
  locationType?: string
  isActive?: boolean
  sortBy?: 'name' | 'fullPath' | 'locationType' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface ApiListLocationsResponse {
  data: ApiLocation[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ── Legacy/UI-Adapted Models (Preserving Component Prop Compatibility) ─────

export interface LocationProductItem {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  unit: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  minReorderLevel?: number
}

export interface WarehouseLocationNode {
  id: string
  name: string
  fullPath: string
  type: string
  parentId?: string | null
  itemCount: number
  totalUnits: number
  description?: string
  products: LocationProductItem[]
}

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string
  manager: string
  status: 'active' | 'inactive'
  totalLocations: number
  productCount: number
  totalStockUnits: number
  capacityUtilization: number
  lowStockCount: number
  outOfStockCount: number
  locations: WarehouseLocationNode[]
}
