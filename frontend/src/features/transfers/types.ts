export type TransferStatus = 'draft' | 'ready' | 'done' | 'cancelled'

export interface TransferLineItem {
  id: string
  productId: string
  productSku: string
  productName: string
  sourceLocation: string
  destinationLocation: string
  quantity: number
  unit: string
}

export interface TransferTimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  user: string
  statusFrom?: TransferStatus
  statusTo?: TransferStatus
}

export interface Transfer {
  id: string
  transferNumber: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  sourceLocation: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  destinationLocation: string
  itemCount: number
  totalQuantity: number
  scheduledDate: string
  createdDate: string
  status: TransferStatus
  notes?: string
  lines: TransferLineItem[]
  timeline: TransferTimelineEvent[]
}

export interface CreateTransferInput {
  sourceWarehouseId: string
  sourceLocation: string
  destinationWarehouseId: string
  destinationLocation: string
  scheduledDate: string
  notes?: string
  status: TransferStatus
  lines: {
    productId: string
    productSku: string
    productName: string
    sourceLocation?: string
    destinationLocation?: string
    quantity: number
    unit: string
  }[]
}

export interface TransferFiltersState {
  search: string
  status: string
  sourceWarehouse: string
  destinationWarehouse: string
  dateFilter: string
}
