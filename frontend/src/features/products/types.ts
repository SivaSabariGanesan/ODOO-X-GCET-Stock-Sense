export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'inactive'

export interface LocationStock {
  id: string
  name: string
  fullPath: string
  quantity: number
  unit: string
  isLeaf?: boolean
  children?: LocationStock[]
}

export interface ProductMovementItem {
  id: string
  date: string
  type: 'receipt' | 'delivery' | 'transfer' | 'adjustment'
  reference: string
  source: string
  destination: string
  quantity: number
  unit: string
  status: 'done' | 'ready' | 'draft'
  operator: string
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  onHand: number
  status: StockStatus
  warehouseId: string
  warehouseName: string
  minReorderLevel: number
  targetStock: number
  reorderQuantity: number
  initialLocation: string
  locations: LocationStock[]
  recentMovements: ProductMovementItem[]
  createdAt: string
  updatedAt: string
}

export interface ProductFormData {
  name: string
  sku: string
  category: string
  unit: string
  initialStock: number
  initialLocation: string
}

export interface ProductFiltersState {
  search: string
  category: string
  status: string
  warehouse: string
  groupBy: 'none' | 'category' | 'status' | 'warehouse'
}
