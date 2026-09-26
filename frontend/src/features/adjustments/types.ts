export type AdjustmentStatus = 'draft' | 'done' | 'cancelled'

export type AdjustmentReason =
  | 'Annual Physical Count'
  | 'Damage / Breakage'
  | 'Theft / Missing'
  | 'Found Inventory'
  | 'Data Entry Correction'
  | 'Expired / Spoilage'
  | 'Scrap'
  | 'Routine Shelf Audit'

export interface AdjustmentTimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  user: string
  statusFrom?: AdjustmentStatus
  statusTo?: AdjustmentStatus
}

export interface Adjustment {
  id: string
  adjustmentNumber: string
  productId: string
  productSku: string
  productName: string
  warehouseId: string
  warehouseName: string
  location: string
  systemQuantity: number
  countedQuantity: number
  difference: number // countedQuantity - systemQuantity
  unit: string
  reason: AdjustmentReason
  notes?: string
  status: AdjustmentStatus
  createdDate: string
  validatedDate?: string
  adjustedBy: string
  timeline: AdjustmentTimelineEvent[]
}

export interface CreateAdjustmentInput {
  productId: string
  productSku: string
  productName: string
  warehouseId: string
  warehouseName: string
  location: string
  systemQuantity: number
  countedQuantity: number
  unit: string
  reason: AdjustmentReason
  notes?: string
  status: AdjustmentStatus
}

export interface AdjustmentFiltersState {
  search: string
  status: string
  warehouse: string
  reason: string
  varianceType: 'all' | 'deficit' | 'surplus' | 'exact'
}
