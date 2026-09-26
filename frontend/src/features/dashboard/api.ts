/**
 * StockSense Dashboard API Client
 *
 * Integrates with authoritative backend dashboard endpoints:
 *  - GET /api/dashboard/summary
 *  - GET /api/dashboard/low-stock
 *  - GET /api/dashboard/movements
 *  - GET /api/dashboard/warehouses
 *  - GET /api/dashboard/stock
 *
 * Also coordinates operational queues from existing backend modules:
 *  - GET /api/receipts
 *  - GET /api/deliveries
 *  - GET /api/transfers
 *  - GET /api/adjustments
 */
import { apiClient } from '../../lib/apiClient'
import {
  ApiDashboardSummary,
  ApiLowStockItem,
  ApiDashboardWarehouseSummary,
  DashboardLowStockQuery,
  DashboardMovementsQuery,
  DashboardStockQuery,
  PendingOperation,
  LowStockProduct,
  RecentActivityItem,
  MovementSummaryData,
} from './types'

// ---------------------------------------------------------------------------
// Response Wrappers
// ---------------------------------------------------------------------------

export interface ApiWrappedResponse<T> {
  data: T
}

export interface ApiPaginatedResponse<T> {
  data: T[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Operational Interfaces
// ---------------------------------------------------------------------------

interface RawReceipt {
  id: string
  receiptNumber: string
  supplierName: string | null
  supplierReference: string | null
  warehouseId: string
  status: string
  createdAt: string
  warehouse?: { id: string; name: string; shortCode: string }
  defaultLocation?: { id: string; name: string; fullPath: string }
  items?: Array<{
    id: string
    quantity: string
    product?: { id: string; name: string; sku: string }
  }>
}

interface RawDelivery {
  id: string
  deliveryNumber: string
  customerName: string | null
  customerReference: string | null
  warehouseId: string
  status: string
  createdAt: string
  warehouse?: { id: string; name: string; shortCode: string }
  defaultSourceLocation?: { id: string; name: string; fullPath: string }
  items?: Array<{
    id: string
    quantity: string
    product?: { id: string; name: string; sku: string }
  }>
}

interface RawTransfer {
  id: string
  transferNumber: string
  notes?: string | null
  sourceLocationId: string
  destinationLocationId: string
  status: string
  createdAt: string
  sourceLocation?: { id: string; name: string; fullPath: string; warehouseId: string }
  destinationLocation?: { id: string; name: string; fullPath: string; warehouseId: string }
  items?: Array<{
    id: string
    quantity: string
    product?: { id: string; name: string; sku: string }
  }>
}

interface RawAdjustment {
  id: string
  adjustmentNumber: string
  reason: string | null
  locationId: string
  status: string
  createdAt: string
  location?: { id: string; name: string; fullPath: string; warehouseId: string }
  items?: Array<{
    id: string
    systemQuantity: string
    countedQuantity: string
    difference: string
    product?: { id: string; name: string; sku: string }
  }>
}

interface RawMovement {
  id: string
  productId: string
  sourceLocationId: string | null
  destinationLocationId: string | null
  quantity: string
  movementType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT'
  referenceType: string
  referenceId: string
  createdBy: string | null
  createdAt: string
  product?: { id: string; name: string; sku: string }
  sourceLocation?: { id: string; name: string; fullPath: string; warehouseId?: string }
  destinationLocation?: { id: string; name: string; fullPath: string; warehouseId?: string }
  creator?: { id: string; name: string; email: string; role?: string }
}

interface RawWarehouse {
  id: string
  name: string
  shortCode: string
  isActive?: boolean
}

interface RawCategory {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Dashboard API Client
// ---------------------------------------------------------------------------

export const dashboardApi = {
  /**
   * GET /api/dashboard/summary
   * Authoritative Domain and Stock summary metrics
   */
  async getSummary(): Promise<ApiDashboardSummary> {
    const res = await apiClient.get<ApiWrappedResponse<ApiDashboardSummary>>('/api/dashboard/summary')
    return res.data
  },

  /**
   * GET /api/dashboard/low-stock
   * Products below reordering rules with active shortages
   */
  async getLowStock(params: DashboardLowStockQuery = {}): Promise<ApiPaginatedResponse<ApiLowStockItem>> {
    return apiClient.get<ApiPaginatedResponse<ApiLowStockItem>>('/api/dashboard/low-stock', {
      page: params.page,
      limit: params.limit,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      productId: params.productId,
      search: params.search,
    })
  },

  /**
   * GET /api/dashboard/movements
   * Recent stock ledger movement history
   */
  async getMovements(params: DashboardMovementsQuery = {}): Promise<ApiPaginatedResponse<RawMovement>> {
    return apiClient.get<ApiPaginatedResponse<RawMovement>>('/api/dashboard/movements', {
      page: params.page,
      limit: params.limit,
      productId: params.productId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      movementType: params.movementType,
      referenceType: params.referenceType,
      fromDate: params.fromDate,
      toDate: params.toDate,
      search: params.search,
    })
  },

  /**
   * GET /api/dashboard/warehouses
   * Warehouse level stock, location count, and low-stock breakdown
   */
  async getWarehousesSummary(): Promise<ApiDashboardWarehouseSummary[]> {
    const res = await apiClient.get<ApiWrappedResponse<ApiDashboardWarehouseSummary[]>>('/api/dashboard/warehouses')
    return res.data
  },

  /**
   * GET /api/dashboard/stock
   * Current stock balance breakdown
   */
  async getStock(params: DashboardStockQuery = {}): Promise<ApiPaginatedResponse<unknown>> {
    return apiClient.get<ApiPaginatedResponse<unknown>>('/api/dashboard/stock', {
      page: params.page,
      limit: params.limit,
      productId: params.productId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      categoryId: params.categoryId,
      search: params.search,
      lowStock: params.lowStock,
    })
  },

  /**
   * GET /api/warehouses
   * Master warehouse records for filter selection
   */
  async getWarehousesMaster(): Promise<RawWarehouse[]> {
    try {
      const res = await apiClient.get<ApiPaginatedResponse<RawWarehouse>>('/api/warehouses', { limit: 100 })
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * GET /api/categories
   * Master product categories for filter selection
   */
  async getCategoriesMaster(): Promise<RawCategory[]> {
    try {
      const res = await apiClient.get<ApiPaginatedResponse<RawCategory>>('/api/categories', { limit: 100 })
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * Fetches real pending receipts from /api/receipts
   */
  async getReceipts(params: { warehouseId?: string; search?: string; limit?: number } = {}): Promise<RawReceipt[]> {
    try {
      const res = await apiClient.get<ApiPaginatedResponse<RawReceipt>>('/api/receipts', {
        warehouseId: params.warehouseId,
        search: params.search,
        limit: params.limit ?? 50,
      })
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * Fetches real pending deliveries from /api/deliveries
   */
  async getDeliveries(params: { warehouseId?: string; search?: string; limit?: number } = {}): Promise<RawDelivery[]> {
    try {
      const res = await apiClient.get<ApiPaginatedResponse<RawDelivery>>('/api/deliveries', {
        warehouseId: params.warehouseId,
        search: params.search,
        limit: params.limit ?? 50,
      })
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * Fetches real pending internal transfers from /api/transfers
   */
  async getTransfers(params: { search?: string; limit?: number } = {}): Promise<RawTransfer[]> {
    try {
      const res = await apiClient.get<ApiPaginatedResponse<RawTransfer>>('/api/transfers', {
        search: params.search,
        limit: params.limit ?? 50,
      })
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * Fetches real inventory adjustments from /api/adjustments
   */
  async getAdjustments(params: { search?: string; limit?: number } = {}): Promise<RawAdjustment[]> {
    try {
      const res = await apiClient.get<ApiPaginatedResponse<RawAdjustment>>('/api/adjustments', {
        search: params.search,
        limit: params.limit ?? 50,
      })
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * Quick validate document mutation
   */
  async validateOperation(type: 'receipt' | 'delivery' | 'transfer' | 'adjustment', id: string): Promise<unknown> {
    switch (type) {
      case 'receipt':
        return apiClient.post(`/api/receipts/${id}/validate`)
      case 'delivery':
        return apiClient.post(`/api/deliveries/${id}/validate`)
      case 'transfer':
        return apiClient.post(`/api/transfers/${id}/validate`)
      case 'adjustment':
        return apiClient.post(`/api/adjustments/${id}/validate`)
    }
  },
}

// ---------------------------------------------------------------------------
// Transformation & Presentation Utilities
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): { timestamp: string; relativeTime: string } {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return { timestamp: 'Recent', relativeTime: 'Just now' }
  }
  const timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)

  let relativeTime = 'Just now'
  if (diffMinutes >= 1 && diffMinutes < 60) {
    relativeTime = `${diffMinutes} mins ago`
  } else if (diffMinutes >= 60 && diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60)
    relativeTime = `${hours} hr${hours > 1 ? 's' : ''} ago`
  } else if (diffMinutes >= 1440) {
    const days = Math.floor(diffMinutes / 1440)
    relativeTime = `${days} day${days > 1 ? 's' : ''} ago`
  }

  return { timestamp, relativeTime }
}

function mapStatus(status: string): 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled' {
  const s = status.toLowerCase()
  if (s === 'canceled' || s === 'cancelled') return 'cancelled'
  if (s === 'ready') return 'ready'
  if (s === 'waiting') return 'waiting'
  if (s === 'done') return 'done'
  return 'draft'
}

/**
 * Transforms real API responses from Receipts, Deliveries, Transfers, and Adjustments
 * into the unified PendingOperation presentation format.
 */
export function transformToPendingOperations(
  receipts: RawReceipt[],
  deliveries: RawDelivery[],
  transfers: RawTransfer[],
  adjustments: RawAdjustment[]
): PendingOperation[] {
  const ops: PendingOperation[] = []

  // Receipts
  for (const r of receipts) {
    const itemCount = r.items?.length || 0
    const totalUnits = r.items?.reduce((acc, it) => acc + Math.round(parseFloat(it.quantity || '0')), 0) || 0
    const dateFormatted = new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    ops.push({
      id: r.id,
      reference: r.receiptNumber,
      type: 'receipt',
      source: r.supplierName ? `Vendor: ${r.supplierName}` : (r.supplierReference || 'Vendor Intake'),
      destination: r.defaultLocation?.fullPath || r.warehouse?.name || 'Inbound Staging',
      warehouseId: r.warehouseId,
      warehouseName: r.warehouse ? `${r.warehouse.shortCode} — ${r.warehouse.name}` : r.warehouseId,
      partner: r.supplierName || r.supplierReference || undefined,
      scheduledDate: dateFormatted,
      itemCount,
      totalUnits,
      status: mapStatus(r.status),
      priority: r.status === 'READY' ? 'urgent' : 'normal',
      category: r.items?.[0]?.product?.name || 'Raw Materials',
    })
  }

  // Deliveries
  for (const d of deliveries) {
    const itemCount = d.items?.length || 0
    const totalUnits = d.items?.reduce((acc, it) => acc + Math.round(parseFloat(it.quantity || '0')), 0) || 0
    const dateFormatted = new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    ops.push({
      id: d.id,
      reference: d.deliveryNumber,
      type: 'delivery',
      source: d.defaultSourceLocation?.fullPath || d.warehouse?.name || 'Outbound Bay',
      destination: d.customerName ? `Customer: ${d.customerName}` : (d.customerReference || 'Customer Dispatch'),
      warehouseId: d.warehouseId,
      warehouseName: d.warehouse ? `${d.warehouse.shortCode} — ${d.warehouse.name}` : d.warehouseId,
      partner: d.customerName || d.customerReference || undefined,
      scheduledDate: dateFormatted,
      itemCount,
      totalUnits,
      status: mapStatus(d.status),
      priority: d.status === 'READY' ? 'urgent' : 'normal',
      category: d.items?.[0]?.product?.name || 'Finished Goods',
    })
  }

  // Transfers
  for (const t of transfers) {
    const itemCount = t.items?.length || 0
    const totalUnits = t.items?.reduce((acc, it) => acc + Math.round(parseFloat(it.quantity || '0')), 0) || 0
    const dateFormatted = new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const whId = t.sourceLocation?.warehouseId || t.destinationLocation?.warehouseId || 'WH'

    ops.push({
      id: t.id,
      reference: t.transferNumber,
      type: 'transfer',
      source: t.sourceLocation?.fullPath || 'Source Zone',
      destination: t.destinationLocation?.fullPath || 'Destination Zone',
      warehouseId: whId,
      warehouseName: t.sourceLocation?.name || 'Internal Warehouse',
      partner: undefined,
      scheduledDate: dateFormatted,
      itemCount,
      totalUnits,
      status: mapStatus(t.status),
      priority: 'normal',
      category: t.items?.[0]?.product?.name || 'Internal Transfer',
    })
  }

  // Adjustments
  for (const a of adjustments) {
    const itemCount = a.items?.length || 0
    const totalUnits = a.items?.reduce(
      (acc, it) => acc + Math.round(Math.abs(parseFloat(it.difference || it.countedQuantity || '0'))),
      0
    ) || 0
    const dateFormatted = new Date(a.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const whId = a.location?.warehouseId || 'WH'

    ops.push({
      id: a.id,
      reference: a.adjustmentNumber,
      type: 'adjustment',
      source: a.location?.fullPath || 'Physical Location',
      destination: 'Virtual/Variance & Discrepancy',
      warehouseId: whId,
      warehouseName: a.location?.name || 'Warehouse Zone',
      partner: a.reason || undefined,
      scheduledDate: dateFormatted,
      itemCount,
      totalUnits,
      status: mapStatus(a.status),
      priority: 'normal',
      category: a.reason || 'Inventory Adjustment',
    })
  }

  // Sort by created / scheduled date descending
  return ops.sort((a, b) => (a.status === 'ready' ? -1 : 1))
}

/**
 * Transforms backend ApiLowStockItem models into LowStockProduct models for UI rendering
 */
export function transformToLowStockProducts(items: ApiLowStockItem[]): LowStockProduct[] {
  return items.map((item) => {
    const onHand = parseFloat(item.currentQuantity)
    const minLevel = parseFloat(item.minQuantity)
    const reorderQuantity = parseFloat(item.reorderQty)
    const isOutOfStock = onHand <= 0

    return {
      id: item.ruleId,
      sku: item.productSku,
      name: item.productName,
      category: item.location.fullPath || 'Internal Storage',
      warehouseId: item.warehouse.shortCode || item.warehouse.id,
      warehouseName: `${item.warehouse.shortCode} — ${item.warehouse.name}`,
      onHand: Math.round(onHand),
      minLevel: Math.round(minLevel),
      reorderQuantity: Math.round(reorderQuantity),
      unit: item.uom.abbreviation || 'units',
      status: isOutOfStock ? 'out_of_stock' : 'low_stock',
      lastRestocked: 'Calculated from ledger',
    }
  })
}

/**
 * Transforms backend RawMovement models into RecentActivityItem models
 */
export function transformToRecentActivities(movements: RawMovement[]): RecentActivityItem[] {
  return movements.map((m) => {
    let type: 'receipt' | 'delivery' | 'transfer' | 'adjustment' = 'transfer'
    if (m.movementType === 'RECEIPT') type = 'receipt'
    else if (m.movementType === 'DELIVERY') type = 'delivery'
    else if (m.movementType === 'ADJUSTMENT') type = 'adjustment'
    else type = 'transfer'

    const { timestamp, relativeTime } = formatRelativeTime(m.createdAt)
    const whId = m.destinationLocation?.warehouseId || m.sourceLocation?.warehouseId || 'WH'
    const whName = m.destinationLocation?.fullPath || m.sourceLocation?.fullPath || 'Warehouse Node'

    return {
      id: m.id,
      reference: m.referenceId ? m.referenceId.slice(0, 8).toUpperCase() : 'MOV',
      type,
      description: `${m.product?.name || 'Stock item'} (${parseFloat(m.quantity)} units)`,
      warehouseId: whId,
      warehouseName: whName,
      category: m.product?.sku || 'General',
      units: Math.round(parseFloat(m.quantity)),
      unitLabel: 'units',
      status: 'done',
      user: m.creator?.name || 'System Operator',
      timestamp,
      relativeTime,
    }
  })
}

/**
 * Computes MovementSummaryData from live stock movements and warehouse aggregates
 */
export function computeMovementSummary(
  movements: RawMovement[],
  warehouses: ApiDashboardWarehouseSummary[]
): MovementSummaryData {
  let inboundUnits = 0
  let inboundCount = 0
  let outboundUnits = 0
  let outboundCount = 0
  let internalUnits = 0
  let internalCount = 0
  let adjustmentsUnits = 0
  let adjustmentsCount = 0

  for (const m of movements) {
    const qty = Math.round(parseFloat(m.quantity || '0'))
    if (m.movementType === 'RECEIPT') {
      inboundUnits += qty
      inboundCount += 1
    } else if (m.movementType === 'DELIVERY') {
      outboundUnits += qty
      outboundCount += 1
    } else if (m.movementType === 'TRANSFER') {
      internalUnits += qty
      internalCount += 1
    } else if (m.movementType === 'ADJUSTMENT') {
      adjustmentsUnits += qty
      adjustmentsCount += 1
    }
  }

  const byWarehouse = warehouses.map((wh) => {
    // Calculate inbound/outbound for this warehouse
    let whInbound = 0
    let whOutbound = 0
    let whInternal = 0

    for (const m of movements) {
      const qty = Math.round(parseFloat(m.quantity || '0'))
      const inWh = m.destinationLocation?.warehouseId === wh.id || m.sourceLocation?.warehouseId === wh.id
      if (!inWh) continue

      if (m.movementType === 'RECEIPT') whInbound += qty
      else if (m.movementType === 'DELIVERY') whOutbound += qty
      else if (m.movementType === 'TRANSFER') whInternal += qty
    }

    return {
      warehouseId: wh.shortCode,
      name: `${wh.shortCode} — ${wh.name}`,
      inbound: whInbound,
      outbound: whOutbound,
      internal: whInternal,
      utilization: `${wh.totalStockItems} items (${wh.locationCount} locs)`,
    }
  })

  return {
    inboundUnits,
    inboundCount,
    outboundUnits,
    outboundCount,
    internalUnits,
    internalCount,
    adjustmentsUnits,
    adjustmentsCount,
    netChange: inboundUnits - outboundUnits,
    byWarehouse: byWarehouse.length > 0 ? byWarehouse : [
      {
        warehouseId: 'WH01',
        name: 'Main Storage Facility',
        inbound: inboundUnits,
        outbound: outboundUnits,
        internal: internalUnits,
        utilization: 'Active',
      },
    ],
  }
}
