export type DocumentType = 'all' | 'receipts' | 'deliveries' | 'transfers' | 'adjustments'

export type OperationStatus = 'all' | 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled'

export type StockAlertLevel = 'critical' | 'low' | 'normal'

export interface DashboardFiltersState {
  documentType: DocumentType
  status: OperationStatus
  warehouse: string
  category: string
  searchQuery: string
}

export interface SummaryMetric {
  id: string
  label: string
  value: number | string
  subtext: string
  change?: string
  trend?: 'up' | 'down' | 'neutral' | 'alert'
  colorVariant?: 'default' | 'amber' | 'rose' | 'purple' | 'emerald'
}

export interface PendingOperation {
  id: string
  reference: string
  type: 'receipt' | 'delivery' | 'transfer' | 'adjustment'
  source: string
  destination: string
  warehouseId: string
  warehouseName: string
  partner?: string
  scheduledDate: string
  itemCount: number
  totalUnits: number
  status: 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled'
  priority?: 'normal' | 'urgent'
  category: string
}

export interface LowStockProduct {
  id: string
  sku: string
  name: string
  category: string
  warehouseId: string
  warehouseName: string
  onHand: number
  minLevel: number
  reorderQuantity: number
  unit: string
  status: 'out_of_stock' | 'low_stock'
  lastRestocked: string
}

export interface RecentActivityItem {
  id: string
  reference: string
  type: 'receipt' | 'delivery' | 'transfer' | 'adjustment'
  description: string
  warehouseId: string
  warehouseName: string
  category: string
  units: number
  unitLabel: string
  status: 'done' | 'ready' | 'confirmed' | 'draft' | 'cancelled'
  user: string
  timestamp: string
  relativeTime: string
}

export interface MovementSummaryData {
  inboundUnits: number
  inboundCount: number
  outboundUnits: number
  outboundCount: number
  internalUnits: number
  internalCount: number
  adjustmentsUnits: number
  adjustmentsCount: number
  netChange: number
  byWarehouse: {
    warehouseId: string
    name: string
    inbound: number
    outbound: number
    internal: number
    utilization: string
  }[]
}
