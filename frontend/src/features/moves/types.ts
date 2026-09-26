export type MovementType = 'receipt' | 'delivery' | 'transfer' | 'adjustment'

export interface StockMove {
  id: string
  transactionId: string
  timestamp: string
  date: string
  time: string
  productId: string
  productSku: string
  productName: string
  productCategory: string
  movementType: MovementType
  sourceLocation: string
  destinationLocation: string
  warehouseId: string
  warehouseName: string
  quantity: number // Signed: positive for receipt/found adjustment, negative for delivery/loss, signed/neutral for transfer
  unit: string
  reference: string
  referenceUrl?: string
  user: string
  notes?: string
}

export interface MoveFiltersState {
  search: string
  movementType: string
  warehouse: string
  location: string
  dateRange: string
}
