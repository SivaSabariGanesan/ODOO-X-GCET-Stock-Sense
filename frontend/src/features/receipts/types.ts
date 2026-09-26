export type ReceiptStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled'

export interface ReceiptLineItem {
  id: string
  productId: string
  productSku: string
  productName: string
  destinationLocation: string
  quantity: number
  receivedQuantity?: number
  unit: string
}

export interface ReceiptTimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  user: string
  statusFrom?: ReceiptStatus
  statusTo?: ReceiptStatus
}

export interface Receipt {
  id: string
  receiptNumber: string
  supplier: string
  supplierReference?: string
  warehouseId: string
  warehouseName: string
  destinationLocation: string
  itemCount: number
  totalQuantity: number
  scheduledDate: string
  createdDate: string
  status: ReceiptStatus
  notes?: string
  lines: ReceiptLineItem[]
  timeline: ReceiptTimelineEvent[]
}

export interface CreateReceiptInput {
  supplier: string
  supplierReference?: string
  warehouseId: string
  destinationLocation: string
  scheduledDate: string
  notes?: string
  status: ReceiptStatus
  lines: {
    productId: string
    productSku: string
    productName: string
    destinationLocation: string
    quantity: number
    unit: string
  }[]
}

export interface ReceiptFiltersState {
  search: string
  status: string
  warehouse: string
  dateFilter: string
}
