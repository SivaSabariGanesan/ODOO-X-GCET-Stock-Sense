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
  type: 'rack' | 'floor' | 'staging' | 'dock' | 'zone'
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
