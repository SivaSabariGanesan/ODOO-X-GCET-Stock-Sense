import {
  ApiStockMovement,
  ApiMovementType,
  ApiReferenceType,
  ApiPagination,
  ApiListStockMovementsResponse,
  ListStockMovementsParams,
} from './api'

export * from './api'

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
  rawMovement?: ApiStockMovement
}

export interface MoveFiltersState {
  search: string
  movementType: string
  warehouse: string
  location: string
  dateRange: string
}

export function mapMovementTypeToFrontend(type: ApiMovementType): MovementType {
  switch (type) {
    case 'RECEIPT':
      return 'receipt'
    case 'DELIVERY':
      return 'delivery'
    case 'TRANSFER':
      return 'transfer'
    case 'ADJUSTMENT':
      return 'adjustment'
    default:
      return 'receipt'
  }
}

export function mapFrontendTypeToApi(type: string): ApiMovementType | undefined {
  switch (type.toLowerCase()) {
    case 'receipt':
      return 'RECEIPT'
    case 'delivery':
      return 'DELIVERY'
    case 'transfer':
      return 'TRANSFER'
    case 'adjustment':
      return 'ADJUSTMENT'
    default:
      return undefined
  }
}

export function formatStockMove(m: ApiStockMovement): StockMove {
  const d = new Date(m.createdAt)
  const isInvalidDate = isNaN(d.getTime())
  const dateStr = isInvalidDate ? '' : d.toISOString().split('T')[0] ?? ''
  const hours = isInvalidDate ? '00' : String(d.getHours()).padStart(2, '0')
  const mins = isInvalidDate ? '00' : String(d.getMinutes()).padStart(2, '0')
  const timeStr = `${hours}:${mins}`

  const frontendType = mapMovementTypeToFrontend(m.movementType)
  const parsedQty = parseFloat(m.quantity) || 0

  let signedQty = parsedQty
  if (m.movementType === 'DELIVERY') {
    signedQty = -Math.abs(parsedQty)
  } else if (m.movementType === 'RECEIPT') {
    signedQty = Math.abs(parsedQty)
  }

  let refPrefix = 'WH/MOV'
  let refUrl: string | undefined = undefined
  if (m.referenceType === 'RECEIPT') {
    refPrefix = 'WH/IN'
    refUrl = `/operations/receipts/${m.referenceId}`
  } else if (m.referenceType === 'DELIVERY') {
    refPrefix = 'WH/OUT'
    refUrl = `/operations/deliveries/${m.referenceId}`
  } else if (m.referenceType === 'INTERNAL_TRANSFER') {
    refPrefix = 'WH/INT'
    refUrl = `/operations/transfers`
  } else if (m.referenceType === 'INVENTORY_ADJUSTMENT') {
    refPrefix = 'WH/ADJ'
    refUrl = `/operations/adjustments/${m.referenceId}`
  }

  const shortRef = m.referenceId ? m.referenceId.slice(0, 8).toUpperCase() : '00000000'
  const reference = `${refPrefix}/${shortRef}`

  const sourceLocName =
    m.sourceLocation?.fullPath ||
    m.sourceLocation?.name ||
    (m.movementType === 'RECEIPT' ? 'Vendor / Supplier' : '—')

  const destLocName =
    m.destinationLocation?.fullPath ||
    m.destinationLocation?.name ||
    (m.movementType === 'DELIVERY' ? 'Customer Dispatch' : '—')

  const whId = m.destinationLocation?.warehouseId || m.sourceLocation?.warehouseId || ''
  const whName =
    m.destinationLocation?.name || m.sourceLocation?.name
      ? `Warehouse ${whId ? whId.slice(0, 6) : 'Facility'}`
      : 'Main Central Warehouse'

  return {
    id: m.id,
    transactionId: `TX-${m.id.slice(0, 8).toUpperCase()}`,
    timestamp: isInvalidDate ? '' : d.toLocaleString(),
    date: dateStr,
    time: timeStr,
    productId: m.productId,
    productSku: m.product?.sku || 'N/A',
    productName: m.product?.name || 'Unknown Product',
    productCategory: m.product?.categoryId ? 'Stock Item' : 'General',
    movementType: frontendType,
    sourceLocation: sourceLocName,
    destinationLocation: destLocName,
    warehouseId: whId,
    warehouseName: whName,
    quantity: signedQty,
    unit: 'units',
    reference,
    referenceUrl: refUrl,
    user: m.creator?.name || m.creator?.email || 'System',
    notes: `Movement recorded for ${m.referenceType ? m.referenceType.replace('_', ' ').toLowerCase() : 'inventory operation'}.`,
    rawMovement: m,
  }
}
