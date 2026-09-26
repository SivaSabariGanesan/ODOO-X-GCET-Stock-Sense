export type DeliveryStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled'

export interface DeliveryLineItem {
  id: string
  productId: string
  productSku: string
  productName: string
  sourceLocation: string
  demandQuantity: number
  doneQuantity: number
  unit: string
  isAvailable?: boolean
}

export interface DeliveryTimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  user: string
  statusFrom?: DeliveryStatus
  statusTo?: DeliveryStatus
}

export interface Delivery {
  id: string
  deliveryNumber: string
  customer: string
  customerReference?: string
  warehouseId: string
  warehouseName: string
  sourceLocation: string
  itemCount: number
  totalQuantity: number
  scheduledDate: string
  createdDate: string
  status: DeliveryStatus
  notes?: string
  isPicked?: boolean
  isPacked?: boolean
  lines: DeliveryLineItem[]
  timeline: DeliveryTimelineEvent[]
}

export interface CreateDeliveryInput {
  customer: string
  customerReference?: string
  warehouseId: string
  sourceLocation: string
  scheduledDate: string
  notes?: string
  status: DeliveryStatus
  lines: {
    productId: string
    productSku: string
    productName: string
    sourceLocation: string
    quantity: number
    unit: string
  }[]
}

export interface DeliveryFiltersState {
  search: string
  status: string
  warehouse: string
  dateFilter: string
}
